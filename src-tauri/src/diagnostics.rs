//! Automatic diagnostic log reporting for SpeakEasy.
//!
//! On each app startup, reads the local log file, filters for WARN/ERROR entries,
//! and uploads them to Supabase so developers can diagnose beta tester issues
//! without asking users to manually send log files.

use anyhow::{Context, Result};
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;

/// Supabase configuration (same as license.rs / feedback.rs)
const SUPABASE_URL: &str = "https://bzhxcinrsgcnmktouqdw.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6aHhjaW5yc2djbm1rdG91cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODk4NzAsImV4cCI6MjA4MTc2NTg3MH0.SMdO6nd7wgUjS9__LzaPwFibKcAacjkHY6wFNWKGCxM";

/// Maximum payload size for log entries (50KB)
const MAX_PAYLOAD_BYTES: usize = 50 * 1024;

/// Get the path to the log file written by tauri-plugin-log.
/// On Windows: %LOCALAPPDATA%\com.speakeasy.app\logs\SpeakEasy.log
fn get_log_file_path() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| {
        d.join("com.speakeasy.app")
            .join("logs")
            .join("SpeakEasy.log")
    })
}

/// Get the path to the cursor file that tracks the last-reported byte offset.
/// On Windows: %APPDATA%\SpeakEasy\diagnostics_cursor.txt
fn get_cursor_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("SpeakEasy").join("diagnostics_cursor.txt"))
}

/// Read the stored cursor (byte offset). Returns 0 if file missing or corrupted.
fn read_cursor(cursor_path: &PathBuf) -> u64 {
    std::fs::read_to_string(cursor_path)
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
        .unwrap_or(0)
}

/// Write the cursor (byte offset) to the cursor file.
fn write_cursor(cursor_path: &PathBuf, offset: u64) {
    if let Some(parent) = cursor_path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    let _ = std::fs::write(cursor_path, offset.to_string());
}

/// Get OS info for diagnostic context (copied from feedback.rs — it's private there).
fn get_os_info() -> String {
    let os_name = if cfg!(target_os = "windows") {
        "Windows"
    } else if cfg!(target_os = "macos") {
        "macOS"
    } else if cfg!(target_os = "linux") {
        "Linux"
    } else {
        "Unknown"
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        use std::process::Command;

        const CREATE_NO_WINDOW: u32 = 0x08000000;
        if let Ok(output) = Command::new("cmd")
            .args(["/c", "ver"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
        {
            if output.status.success() {
                let version = String::from_utf8_lossy(&output.stdout);
                let version = version.trim();
                if !version.is_empty() {
                    return format!("{} ({})", os_name, version);
                }
            }
        }
    }

    os_name.to_string()
}

/// Upload new WARN/ERROR log entries to Supabase.
///
/// This function is designed to be called via `tokio::spawn` on startup (fire-and-forget).
/// It reads the log file from the last-reported position, filters for WARN/ERROR lines,
/// and POSTs them to the `diagnostic_logs` table.
pub async fn upload_diagnostics() -> Result<()> {
    // 1. Locate log file
    let log_path = get_log_file_path().context("Could not determine log file path")?;
    if !log_path.exists() {
        log::info!("[diagnostics] Log file does not exist yet, skipping");
        return Ok(());
    }

    // 2. Get cursor path
    let cursor_path = get_cursor_path().context("Could not determine cursor path")?;

    // 3. Get file size
    let metadata = std::fs::metadata(&log_path).context("Could not read log file metadata")?;
    let file_size = metadata.len();

    // 4. Read cursor
    let mut cursor = read_cursor(&cursor_path);

    // 5. Handle log rotation (file smaller than cursor = file was overwritten)
    if cursor > file_size {
        log::info!(
            "[diagnostics] Log file rotated (cursor {} > size {}), resetting",
            cursor,
            file_size
        );
        cursor = 0;
    }

    // 6. Nothing new to read
    if cursor >= file_size {
        return Ok(());
    }

    // 7. Read new content from cursor to EOF
    let mut file =
        std::fs::File::open(&log_path).context("Could not open log file for reading")?;
    file.seek(SeekFrom::Start(cursor))
        .context("Could not seek in log file")?;

    let mut content = String::new();
    file.read_to_string(&mut content)
        .context("Could not read log file content")?;

    let new_file_size = cursor + content.len() as u64;

    // 8. Filter for WARN and ERROR lines
    let error_lines: Vec<&str> = content
        .lines()
        .filter(|line| line.contains("][WARN]") || line.contains("][ERROR]"))
        .collect();

    // 9. Nothing to report — advance cursor and return
    if error_lines.is_empty() {
        write_cursor(&cursor_path, new_file_size);
        return Ok(());
    }

    let line_count = error_lines.len();

    // 10. Join and truncate (keep TAIL / most recent errors if over 50KB)
    let mut log_entries = error_lines.join("\n");
    if log_entries.len() > MAX_PAYLOAD_BYTES {
        // Find a newline boundary near the truncation point
        let start = log_entries.len() - MAX_PAYLOAD_BYTES;
        if let Some(newline_pos) = log_entries[start..].find('\n') {
            log_entries = log_entries[start + newline_pos + 1..].to_string();
        } else {
            log_entries = log_entries[start..].to_string();
        }
    }

    // 11. Gather metadata
    let machine_id = crate::license::get_machine_id();
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let os_info = get_os_info();

    log::info!(
        "[diagnostics] Uploading {} error/warn lines ({} bytes) to Supabase",
        line_count,
        log_entries.len()
    );

    // 12. POST to Supabase
    let client = reqwest::Client::new();
    let insert_url = format!("{}/rest/v1/diagnostic_logs", SUPABASE_URL);

    let payload = serde_json::json!({
        "machine_id": machine_id,
        "app_version": app_version,
        "os_info": os_info,
        "log_entries": log_entries,
        "line_count": line_count
    });

    let response = client
        .post(&insert_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .header("Content-Type", "application/json")
        .json(&payload)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
        .context("Failed to connect to diagnostics server")?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        anyhow::bail!(
            "Supabase returned {} for diagnostic upload: {}",
            status,
            error_text
        );
    }

    // 13. Success — advance cursor
    write_cursor(&cursor_path, new_file_size);
    log::info!("[diagnostics] Upload complete, cursor advanced to {}", new_file_size);

    Ok(())
}

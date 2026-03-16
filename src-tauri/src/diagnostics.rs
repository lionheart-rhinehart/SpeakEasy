//! Automatic diagnostic log reporting for SpeakEasy.
//!
//! On each app startup, reads the local log file, filters for WARN/ERROR entries,
//! and uploads them to Supabase so developers can diagnose beta tester issues
//! without asking users to manually send log files.
//!
//! Also reads crash.log (written by the panic hook) so that panics — which kill
//! the process before the normal logger can flush — are captured on the next launch.

use anyhow::{Context, Result};
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;

/// Supabase configuration (same as license.rs / feedback.rs)
const SUPABASE_URL: &str = "https://bzhxcinrsgcnmktouqdw.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6aHhjaW5yc2djbm1rdG91cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODk4NzAsImV4cCI6MjA4MTc2NTg3MH0.SMdO6nd7wgUjS9__LzaPwFibKcAacjkHY6wFNWKGCxM";

/// Maximum payload size for log entries (50KB)
const MAX_PAYLOAD_BYTES: usize = 50 * 1024;

/// Minimum seconds between uploads (rate limiting to prevent flood from rapid restarts)
const MIN_UPLOAD_INTERVAL_SECS: u64 = 60;

/// Get the path to the log file written by tauri-plugin-log.
/// On Windows: %LOCALAPPDATA%\com.speakeasy.app\logs\SpeakEasy.log
fn get_log_file_path() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| {
        d.join("com.speakeasy.app")
            .join("logs")
            .join("SpeakEasy.log")
    })
}

/// Get the path to the crash log written by the panic hook.
/// On Windows: %LOCALAPPDATA%\com.speakeasy.app\logs\crash.log
fn get_crash_log_path() -> Option<PathBuf> {
    dirs::data_local_dir().map(|d| {
        d.join("com.speakeasy.app")
            .join("logs")
            .join("crash.log")
    })
}

/// Get the path to the cursor file that tracks the last-reported byte offset.
/// On Windows: %APPDATA%\SpeakEasy\diagnostics_cursor.txt
fn get_cursor_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("SpeakEasy").join("diagnostics_cursor.txt"))
}

/// Get the path to the last-upload timestamp file (rate limiting).
fn get_last_upload_path() -> Option<PathBuf> {
    dirs::config_dir().map(|d| d.join("SpeakEasy").join("diagnostics_last_upload.txt"))
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

/// Check if enough time has passed since the last upload (rate limiting).
/// Returns true if upload is allowed, false if too soon.
fn check_rate_limit() -> bool {
    let path = match get_last_upload_path() {
        Some(p) => p,
        None => return true, // Can't check, allow
    };
    let last = std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| s.trim().parse::<u64>().ok())
        .unwrap_or(0);
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    now - last >= MIN_UPLOAD_INTERVAL_SECS
}

/// Record the current time as last upload time.
fn record_upload_time() {
    if let Some(path) = get_last_upload_path() {
        if let Some(parent) = path.parent() {
            let _ = std::fs::create_dir_all(parent);
        }
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let _ = std::fs::write(path, now.to_string());
    }
}

/// Read crash.log contents (if any). Returns the content and whether crashes were found.
fn read_crash_log() -> (String, bool) {
    let path = match get_crash_log_path() {
        Some(p) => p,
        None => return (String::new(), false),
    };
    if !path.exists() {
        return (String::new(), false);
    }
    match std::fs::read_to_string(&path) {
        Ok(content) if !content.trim().is_empty() => {
            // Truncate to last 50KB if very large
            let trimmed = if content.len() > MAX_PAYLOAD_BYTES {
                content[content.len() - MAX_PAYLOAD_BYTES..].to_string()
            } else {
                content
            };
            (format!("[CRASH LOG]\n{}", trimmed), true)
        }
        _ => (String::new(), false),
    }
}

/// Clear crash.log after successful upload.
fn clear_crash_log() {
    if let Some(path) = get_crash_log_path() {
        if path.exists() {
            let _ = std::fs::write(&path, "");
        }
    }
}

/// Get OS info for diagnostic context.
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

/// Upload new WARN/ERROR log entries and crash reports to Supabase.
///
/// Called via `tauri::async_runtime::spawn` on startup (fire-and-forget).
/// Reads the log file from the last-reported position, filters for WARN/ERROR lines,
/// includes any crash.log content, and POSTs to the `diagnostic_logs` table.
/// Then calls the notification Edge Function to email the admin.
pub async fn upload_diagnostics() -> Result<()> {
    // 1. Read crash.log first (always urgent — bypasses rate limit)
    let (crash_content, has_crash) = read_crash_log();

    // 2. Rate limit check (skip if we have crash data — crashes are always urgent)
    if !has_crash && !check_rate_limit() {
        log::info!("[diagnostics] Rate limited, skipping upload (< {}s since last)", MIN_UPLOAD_INTERVAL_SECS);
        return Ok(());
    }

    // 3. Locate log file
    let log_path = get_log_file_path().context("Could not determine log file path")?;
    if !log_path.exists() && !has_crash {
        log::info!("[diagnostics] Log file does not exist yet, skipping");
        return Ok(());
    }

    // 4. Get cursor path
    let cursor_path = get_cursor_path().context("Could not determine cursor path")?;

    // 5. Read new log content (if log file exists)
    let mut error_lines_from_log: Vec<String> = Vec::new();
    let mut new_file_size: u64 = 0;

    if log_path.exists() {
        let metadata = std::fs::metadata(&log_path).context("Could not read log file metadata")?;
        let file_size = metadata.len();
        let mut cursor = read_cursor(&cursor_path);

        // Handle log rotation
        if cursor > file_size {
            log::info!("[diagnostics] Log file rotated (cursor {} > size {}), resetting", cursor, file_size);
            cursor = 0;
        }

        if cursor < file_size {
            let mut file = std::fs::File::open(&log_path).context("Could not open log file")?;
            file.seek(SeekFrom::Start(cursor)).context("Could not seek in log file")?;

            let mut content = String::new();
            file.read_to_string(&mut content).context("Could not read log file")?;

            new_file_size = cursor + content.len() as u64;

            // Filter for WARN and ERROR lines
            error_lines_from_log = content
                .lines()
                .filter(|line| line.contains("][WARN]") || line.contains("][ERROR]"))
                .map(String::from)
                .collect();
        } else {
            new_file_size = file_size;
        }
    }

    // 6. Combine crash log + error lines
    let total_lines = error_lines_from_log.len() + if has_crash { 1 } else { 0 };

    if error_lines_from_log.is_empty() && !has_crash {
        // Nothing to report — advance cursor and return
        write_cursor(&cursor_path, new_file_size);
        return Ok(());
    }

    // 7. Build combined log entries
    let mut log_entries = if has_crash {
        let mut combined = crash_content;
        if !error_lines_from_log.is_empty() {
            combined.push_str("\n\n[APP LOG ERRORS]\n");
            combined.push_str(&error_lines_from_log.join("\n"));
        }
        combined
    } else {
        error_lines_from_log.join("\n")
    };

    // 8. Truncate if over 50KB (keep tail / most recent)
    if log_entries.len() > MAX_PAYLOAD_BYTES {
        let start = log_entries.len() - MAX_PAYLOAD_BYTES;
        if let Some(newline_pos) = log_entries[start..].find('\n') {
            log_entries = log_entries[start + newline_pos + 1..].to_string();
        } else {
            log_entries = log_entries[start..].to_string();
        }
    }

    // 9. Gather metadata
    let machine_id = crate::license::get_machine_id();
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let os_info = get_os_info();

    log::info!(
        "[diagnostics] Uploading {} entries ({} bytes, crash: {}) to Supabase",
        total_lines,
        log_entries.len(),
        has_crash
    );

    // 10. POST to Supabase REST API
    let client = reqwest::Client::new();
    let insert_url = format!("{}/rest/v1/diagnostic_logs", SUPABASE_URL);

    let payload = serde_json::json!({
        "machine_id": machine_id,
        "app_version": app_version,
        "os_info": os_info,
        "log_entries": log_entries,
        "line_count": total_lines
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

    // 11. Success — advance cursor, clear crash log, record upload time
    write_cursor(&cursor_path, new_file_size);
    if has_crash {
        clear_crash_log();
        log::info!("[diagnostics] Crash log cleared after successful upload");
    }
    record_upload_time();
    log::info!("[diagnostics] Upload complete, cursor advanced to {}", new_file_size);

    // 12. Call notification Edge Function (non-fatal — data is already saved)
    let notify_url = format!("{}/functions/v1/receive-diagnostics", SUPABASE_URL);
    match client
        .post(&notify_url)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .header("Content-Type", "application/json")
        .json(&payload)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await
    {
        Ok(resp) if resp.status().is_success() => {
            log::info!("[diagnostics] Admin notification sent successfully");
        }
        Ok(resp) => {
            log::warn!("[diagnostics] Notification failed ({}), data still saved", resp.status());
        }
        Err(e) => {
            log::warn!("[diagnostics] Notification request failed: {}, data still saved", e);
        }
    }

    Ok(())
}

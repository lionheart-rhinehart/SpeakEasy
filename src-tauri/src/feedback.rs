//! Feedback submission module for SpeakEasy beta testing.
//!
//! This module handles submitting user feedback to Supabase and sending
//! email notifications to the admin.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// Supabase configuration (same as license.rs)
const SUPABASE_URL: &str = "https://bzhxcinrsgcnmktouqdw.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6aHhjaW5yc2djbm1rdG91cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODk4NzAsImV4cCI6MjA4MTc2NTg3MH0.SMdO6nd7wgUjS9__LzaPwFibKcAacjkHY6wFNWKGCxM";

/// Feedback submission request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackSubmission {
    pub category: String,
    pub message: String,
    pub video_url: Option<String>,
}

/// Feedback submission response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedbackResponse {
    pub success: bool,
    pub feedback_id: Option<String>,
    pub error: Option<String>,
}

/// Get OS info for feedback context
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

    // Try to get more specific version info on Windows
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

/// Get the user's license key from keychain (for linking feedback to user)
fn get_stored_license_key() -> Option<String> {
    use keyring::Entry;

    let entry = Entry::new("SpeakEasy", "license_key").ok()?;
    entry.get_password().ok()
}

/// Get user info from activation record (if available)
async fn get_user_info_from_license(license_key: &str) -> (Option<String>, Option<String>) {
    let client = reqwest::Client::new();

    // First get the license ID
    let license_url = format!(
        "{}/rest/v1/licenses?license_key=eq.{}&select=id",
        SUPABASE_URL, license_key
    );

    let response = match client
        .get(&license_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return (None, None),
    };

    let licenses: Vec<serde_json::Value> = match response.json().await {
        Ok(l) => l,
        Err(_) => return (None, None),
    };

    let license_id = match licenses.first().and_then(|l| l["id"].as_str()) {
        Some(id) => id,
        None => return (None, None),
    };

    // Get the machine ID for this device
    let machine_id = crate::license::get_machine_id();

    // Get activation record for this license and machine
    let activation_url = format!(
        "{}/rest/v1/activations?license_id=eq.{}&machine_id=eq.{}&select=user_name,user_email",
        SUPABASE_URL, license_id, machine_id
    );

    let response = match client
        .get(&activation_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(r) => r,
        Err(_) => return (None, None),
    };

    let activations: Vec<serde_json::Value> = match response.json().await {
        Ok(a) => a,
        Err(_) => return (None, None),
    };

    if let Some(activation) = activations.first() {
        let name = activation["user_name"].as_str().map(|s| s.to_string());
        let email = activation["user_email"].as_str().map(|s| s.to_string());
        return (name, email);
    }

    (None, None)
}

/// Submit feedback to Supabase
pub async fn submit_feedback(submission: FeedbackSubmission) -> Result<FeedbackResponse> {
    let app_version = env!("CARGO_PKG_VERSION").to_string();
    let os_info = get_os_info();

    // Get license key if available
    let license_key = get_stored_license_key();

    // Get user info from license activation
    let (user_name, user_email) = match &license_key {
        Some(key) => get_user_info_from_license(key).await,
        None => (None, None),
    };

    log::info!(
        "Submitting feedback: category={}, message_len={}, video_url={:?}, user={}",
        submission.category,
        submission.message.len(),
        submission.video_url.is_some(),
        user_email.as_deref().unwrap_or("anonymous")
    );

    let client = reqwest::Client::new();

    // Build the feedback record
    let feedback_data = serde_json::json!({
        "license_key": license_key,
        "user_email": user_email,
        "user_name": user_name,
        "category": submission.category.to_lowercase(),
        "message": submission.message,
        "video_url": submission.video_url,
        "app_version": app_version,
        "os_info": os_info,
        "status": "new"
    });

    // Submit to Supabase
    let insert_url = format!("{}/rest/v1/feedback", SUPABASE_URL);

    let response = client
        .post(&insert_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .header("Content-Type", "application/json")
        .header("Prefer", "return=representation")
        .json(&feedback_data)
        .timeout(std::time::Duration::from_secs(30))
        .send()
        .await
        .context("Failed to connect to feedback server")?;

    let status = response.status();

    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        log::error!("Feedback submission failed: {} - {}", status, error_text);
        return Ok(FeedbackResponse {
            success: false,
            feedback_id: None,
            error: Some(format!("Server error: {}", status)),
        });
    }

    // Parse the response to get the feedback ID
    let response_json: Vec<serde_json::Value> = response
        .json()
        .await
        .unwrap_or_default();

    let feedback_id = response_json
        .first()
        .and_then(|r| r["id"].as_str())
        .map(|s| s.to_string());

    log::info!("Feedback submitted successfully: {:?}", feedback_id);

    Ok(FeedbackResponse {
        success: true,
        feedback_id,
        error: None,
    })
}

/// Upload an attachment to Supabase Storage
/// Returns the public URL of the uploaded file
pub async fn upload_attachment(
    file_name: String,
    file_data: Vec<u8>,
    content_type: String,
) -> Result<String> {
    let client = reqwest::Client::new();

    // Generate a unique filename
    let timestamp = chrono::Utc::now().timestamp_millis();
    let unique_name = format!("{}_{}", timestamp, file_name);

    // Upload to Supabase Storage
    let upload_url = format!(
        "{}/storage/v1/object/feedback-attachments/{}",
        SUPABASE_URL, unique_name
    );

    let response = client
        .post(&upload_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .header("Content-Type", &content_type)
        .body(file_data)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await
        .context("Failed to upload attachment")?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        log::error!("Attachment upload failed: {}", error_text);
        return Err(anyhow::anyhow!("Failed to upload attachment: {}", error_text));
    }

    // Return the public URL
    let public_url = format!(
        "{}/storage/v1/object/public/feedback-attachments/{}",
        SUPABASE_URL, unique_name
    );

    log::info!("Attachment uploaded: {}", public_url);
    Ok(public_url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_os_info() {
        let os_info = get_os_info();
        assert!(!os_info.is_empty());
        // Should contain one of our known OS names
        assert!(os_info.contains("Windows") || os_info.contains("macOS") || os_info.contains("Linux") || os_info.contains("Unknown"));
    }
}

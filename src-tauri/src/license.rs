//! License validation module for SpeakEasy beta testing.
//!
//! This module handles license key validation against Supabase backend,
//! with offline grace period support for reliability.

use anyhow::{Context, Result};
use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Service name for storing license key in OS credential store
const LICENSE_SERVICE_NAME: &str = "SpeakEasy";
const LICENSE_CREDENTIAL_KEY: &str = "license_key";

/// Grace period in hours (7 days)
const GRACE_PERIOD_HOURS: i64 = 168;

/// Validation interval in hours (check server every 24 hours)
const VALIDATION_INTERVAL_HOURS: i64 = 24;

/// Supabase configuration
const SUPABASE_URL: &str = "https://bzhxcinrsgcnmktouqdw.supabase.co";
const SUPABASE_ANON_KEY: &str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6aHhjaW5yc2djbm1rdG91cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxODk4NzAsImV4cCI6MjA4MTc2NTg3MH0.SMdO6nd7wgUjS9__LzaPwFibKcAacjkHY6wFNWKGCxM";

/// License status returned to the frontend
/// Uses externally tagged format so "Valid" becomes {"valid": {}} not just "valid"
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case", tag = "type", content = "data")]
pub enum LicenseStatus {
    /// License is valid and active
    Valid,
    /// License needs online validation (but within grace period)
    NeedsValidation,
    /// License is in offline grace period
    GracePeriod { hours_remaining: i64 },
    /// License is invalid or revoked
    Invalid { reason: String },
    /// No license has been activated
    NotActivated,
}

/// Local license state stored on disk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseState {
    /// The license key (stored separately in keychain, this is just for reference)
    pub license_key_preview: String,
    /// Machine ID for this device
    pub machine_id: String,
    /// Timestamp of first activation
    pub activated_at: String,
    /// Timestamp of last successful validation
    pub last_validated_at: String,
    /// Grace period end time (ISO 8601)
    pub grace_period_until: String,
    /// App version at activation
    pub app_version: String,
}

/// Response from Supabase activation
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct ActivationResponse {
    success: bool,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    error_code: Option<String>,
}

/// Response from Supabase validation
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct ValidationResponse {
    valid: bool,
    #[serde(default)]
    error: Option<String>,
    #[serde(default)]
    next_check_hours: Option<i64>,
}

/// License info returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
    pub status: LicenseStatus,
    pub license_key_preview: Option<String>,
    pub machine_id: Option<String>,
    pub activated_at: Option<String>,
    pub last_validated_at: Option<String>,
    pub grace_period_until: Option<String>,
}

/// Get the path to the license state file
fn get_license_state_path() -> Result<PathBuf> {
    let config_dir =
        dirs::config_dir().ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?;
    let app_dir = config_dir.join("SpeakEasy");
    fs::create_dir_all(&app_dir)?;
    Ok(app_dir.join("license.json"))
}

/// Load license state from disk
fn load_license_state() -> Option<LicenseState> {
    let path = get_license_state_path().ok()?;
    if path.exists() {
        let contents = fs::read_to_string(&path).ok()?;
        serde_json::from_str(&contents).ok()
    } else {
        None
    }
}

/// Save license state to disk
fn save_license_state(state: &LicenseState) -> Result<()> {
    let path = get_license_state_path()?;
    let contents = serde_json::to_string_pretty(state)?;
    fs::write(path, contents)?;
    Ok(())
}

/// Delete license state from disk
fn delete_license_state() -> Result<()> {
    let path = get_license_state_path()?;
    if path.exists() {
        fs::remove_file(path)?;
    }
    Ok(())
}

/// Get keyring entry for license key
fn get_license_entry() -> Result<Entry> {
    Entry::new(LICENSE_SERVICE_NAME, LICENSE_CREDENTIAL_KEY)
        .context("Failed to create keyring entry for license")
}

/// Store the license key securely in OS keychain
pub fn store_license_key(license_key: &str) -> Result<()> {
    let entry = get_license_entry()?;
    entry
        .set_password(license_key)
        .context("Failed to store license key in keychain")?;
    log::info!("License key stored in keychain");
    Ok(())
}

/// Retrieve the license key from OS keychain
pub fn get_license_key() -> Result<Option<String>> {
    let entry = get_license_entry()?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(anyhow::anyhow!("Failed to retrieve license key: {}", e)),
    }
}

/// Delete the license key from OS keychain
pub fn delete_license_key() -> Result<()> {
    let entry = get_license_entry()?;
    match entry.delete_credential() {
        Ok(()) => {
            log::info!("License key deleted from keychain");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(anyhow::anyhow!("Failed to delete license key: {}", e)),
    }
}

/// Generate a stable machine ID based on hardware identifiers
/// This ID should remain the same across app reinstalls
pub fn get_machine_id() -> String {
    // Use the machine_uid crate for cross-platform machine identification
    // Falls back to a hash of system info if the crate fails

    #[cfg(target_os = "windows")]
    {
        // On Windows, use the machine GUID from registry
        use std::process::Command;

        let output = Command::new("powershell")
            .args([
                "-Command",
                "(Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name MachineGuid).MachineGuid"
            ])
            .output();

        if let Ok(output) = output {
            if output.status.success() {
                let guid = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !guid.is_empty() {
                    // Hash the GUID for privacy
                    return format!("win-{}", hash_string(&guid));
                }
            }
        }

        // Fallback: use computer name + username hash
        let computer_name = std::env::var("COMPUTERNAME").unwrap_or_default();
        let username = std::env::var("USERNAME").unwrap_or_default();
        format!("win-fallback-{}", hash_string(&format!("{}{}", computer_name, username)))
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, use the hardware UUID
        use std::process::Command;

        let output = Command::new("ioreg")
            .args(["-rd1", "-c", "IOPlatformExpertDevice"])
            .output();

        if let Ok(output) = output {
            let stdout = String::from_utf8_lossy(&output.stdout);
            // Parse the IOPlatformUUID from the output
            for line in stdout.lines() {
                if line.contains("IOPlatformUUID") {
                    if let Some(uuid) = line.split('"').nth(3) {
                        return format!("mac-{}", hash_string(uuid));
                    }
                }
            }
        }

        // Fallback
        let hostname = std::env::var("HOSTNAME").unwrap_or_default();
        let user = std::env::var("USER").unwrap_or_default();
        format!("mac-fallback-{}", hash_string(&format!("{}{}", hostname, user)))
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, try to read machine-id
        if let Ok(machine_id) = std::fs::read_to_string("/etc/machine-id") {
            return format!("linux-{}", hash_string(machine_id.trim()));
        }

        // Fallback
        let hostname = std::env::var("HOSTNAME").unwrap_or_default();
        let user = std::env::var("USER").unwrap_or_default();
        format!("linux-fallback-{}", hash_string(&format!("{}{}", hostname, user)))
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        format!("unknown-{}", hash_string(&format!("{:?}", std::time::SystemTime::now())))
    }
}

/// Simple hash function for machine ID
fn hash_string(s: &str) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};

    let mut hasher = DefaultHasher::new();
    s.hash(&mut hasher);
    format!("{:016x}", hasher.finish())
}

/// Mask a license key for display (e.g., "abc12345-xxxx-xxxx-xxxx-xxxxxxxxxxxx" -> "abc1••••-••••")
fn mask_license_key(key: &str) -> String {
    if key.len() <= 8 {
        return "••••••••".to_string();
    }
    let prefix = &key[..4];
    format!("{}••••-••••", prefix)
}

/// Activate a license key with the server
pub async fn activate_license(license_key: &str, user_name: &str, user_email: &str) -> Result<LicenseInfo> {
    let machine_id = get_machine_id();
    let app_version = env!("CARGO_PKG_VERSION").to_string();

    log::info!("Attempting to activate license for machine: {} (user: {})", machine_id, user_email);

    // Build the activation request
    let client = reqwest::Client::new();

    // Query Supabase to check if license exists and is active
    let check_url = format!(
        "{}/rest/v1/licenses?license_key=eq.{}&select=id,is_active,max_activations,expires_at",
        SUPABASE_URL, license_key
    );

    let response = client
        .get(&check_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .send()
        .await
        .context("Failed to connect to license server")?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!("License server error: {}", response.status()));
    }

    let licenses: Vec<serde_json::Value> = response.json().await?;

    if licenses.is_empty() {
        return Ok(LicenseInfo {
            status: LicenseStatus::Invalid {
                reason: "Invalid license key".to_string(),
            },
            license_key_preview: Some(mask_license_key(license_key)),
            machine_id: Some(machine_id),
            activated_at: None,
            last_validated_at: None,
            grace_period_until: None,
        });
    }

    let license = &licenses[0];
    let license_id = license["id"].as_str().unwrap_or("");
    let is_active = license["is_active"].as_bool().unwrap_or(false);
    let max_activations = license["max_activations"].as_i64().unwrap_or(2);

    if !is_active {
        return Ok(LicenseInfo {
            status: LicenseStatus::Invalid {
                reason: "License has been revoked".to_string(),
            },
            license_key_preview: Some(mask_license_key(license_key)),
            machine_id: Some(machine_id),
            activated_at: None,
            last_validated_at: None,
            grace_period_until: None,
        });
    }

    // Check expiration
    if let Some(expires_at) = license["expires_at"].as_str() {
        if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expires_at) {
            if expiry < chrono::Utc::now() {
                return Ok(LicenseInfo {
                    status: LicenseStatus::Invalid {
                        reason: "License has expired".to_string(),
                    },
                    license_key_preview: Some(mask_license_key(license_key)),
                    machine_id: Some(machine_id),
                    activated_at: None,
                    last_validated_at: None,
                    grace_period_until: None,
                });
            }
        }
    }

    // Check existing activations for this license
    let activations_url = format!(
        "{}/rest/v1/activations?license_id=eq.{}&is_active=eq.true&select=machine_id",
        SUPABASE_URL, license_id
    );

    let activations_response = client
        .get(&activations_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .send()
        .await?;

    let activations: Vec<serde_json::Value> = activations_response.json().await?;

    // Check if this machine is already activated
    let already_activated = activations.iter().any(|a| {
        a["machine_id"].as_str() == Some(&machine_id)
    });

    if !already_activated && activations.len() as i64 >= max_activations {
        return Ok(LicenseInfo {
            status: LicenseStatus::Invalid {
                reason: format!(
                    "Maximum activations ({}) reached. Deactivate another device first.",
                    max_activations
                ),
            },
            license_key_preview: Some(mask_license_key(license_key)),
            machine_id: Some(machine_id),
            activated_at: None,
            last_validated_at: None,
            grace_period_until: None,
        });
    }

    let now = chrono::Utc::now();
    let now_str = now.to_rfc3339();
    let grace_until = now + chrono::Duration::hours(GRACE_PERIOD_HOURS);
    let grace_until_str = grace_until.to_rfc3339();

    // Create or update activation record
    if already_activated {
        // Update existing activation
        let update_url = format!(
            "{}/rest/v1/activations?license_id=eq.{}&machine_id=eq.{}",
            SUPABASE_URL, license_id, machine_id
        );

        let _update_response = client
            .patch(&update_url)
            .header("apikey", SUPABASE_ANON_KEY)
            .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "last_validated_at": now_str,
                "app_version": app_version,
                "is_active": true,
                "user_name": user_name,
                "user_email": user_email
            }))
            .send()
            .await?;
    } else {
        // Create new activation
        let insert_url = format!("{}/rest/v1/activations", SUPABASE_URL);

        let os_type = if cfg!(target_os = "windows") {
            "windows"
        } else if cfg!(target_os = "macos") {
            "macos"
        } else {
            "linux"
        };

        let _insert_response = client
            .post(&insert_url)
            .header("apikey", SUPABASE_ANON_KEY)
            .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
            .header("Content-Type", "application/json")
            .json(&serde_json::json!({
                "license_id": license_id,
                "machine_id": machine_id,
                "app_version": app_version,
                "os_type": os_type,
                "is_active": true,
                "last_validated_at": now_str,
                "user_name": user_name,
                "user_email": user_email
            }))
            .send()
            .await?;
    }

    // Store license key in keychain
    store_license_key(license_key)?;

    // Save license state to disk
    let state = LicenseState {
        license_key_preview: mask_license_key(license_key),
        machine_id: machine_id.clone(),
        activated_at: now_str.clone(),
        last_validated_at: now_str.clone(),
        grace_period_until: grace_until_str.clone(),
        app_version,
    };
    save_license_state(&state)?;

    log::info!("License activated successfully");

    Ok(LicenseInfo {
        status: LicenseStatus::Valid,
        license_key_preview: Some(state.license_key_preview),
        machine_id: Some(machine_id),
        activated_at: Some(now_str.clone()),
        last_validated_at: Some(now_str),
        grace_period_until: Some(grace_until_str),
    })
}

/// Validate the current license (called on startup and periodically)
pub async fn validate_license() -> Result<LicenseInfo> {
    // Check if we have a stored license
    let license_key = match get_license_key()? {
        Some(key) => key,
        None => {
            return Ok(LicenseInfo {
                status: LicenseStatus::NotActivated,
                license_key_preview: None,
                machine_id: None,
                activated_at: None,
                last_validated_at: None,
                grace_period_until: None,
            });
        }
    };

    let state = match load_license_state() {
        Some(s) => s,
        None => {
            // Have key but no state - try to activate (internal re-validation, no name/email)
            return activate_license(&license_key, "", "").await;
        }
    };

    let machine_id = get_machine_id();
    let now = chrono::Utc::now();

    // Check if machine ID matches
    if state.machine_id != machine_id {
        log::warn!("Machine ID mismatch - re-activating");
        return activate_license(&license_key, "", "").await;
    }

    // Check if we need to validate with server
    let last_validated = chrono::DateTime::parse_from_rfc3339(&state.last_validated_at)
        .unwrap_or_else(|_| chrono::DateTime::default());
    let hours_since_validation = (now - last_validated.with_timezone(&chrono::Utc))
        .num_hours();

    if hours_since_validation < VALIDATION_INTERVAL_HOURS {
        // Recently validated, no need to check server
        return Ok(LicenseInfo {
            status: LicenseStatus::Valid,
            license_key_preview: Some(state.license_key_preview),
            machine_id: Some(machine_id),
            activated_at: Some(state.activated_at),
            last_validated_at: Some(state.last_validated_at),
            grace_period_until: Some(state.grace_period_until),
        });
    }

    // Try to validate with server
    log::info!("Validating license with server...");

    let client = reqwest::Client::new();

    // Check if license is still valid
    let check_url = format!(
        "{}/rest/v1/licenses?license_key=eq.{}&select=id,is_active,expires_at",
        SUPABASE_URL, license_key
    );

    match client
        .get(&check_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
    {
        Ok(response) => {
            if response.status().is_success() {
                let licenses: Vec<serde_json::Value> = response.json().await?;

                if licenses.is_empty() {
                    // License deleted
                    delete_license_key()?;
                    delete_license_state()?;
                    return Ok(LicenseInfo {
                        status: LicenseStatus::Invalid {
                            reason: "License not found".to_string(),
                        },
                        license_key_preview: Some(state.license_key_preview),
                        machine_id: Some(machine_id),
                        activated_at: None,
                        last_validated_at: None,
                        grace_period_until: None,
                    });
                }

                let license = &licenses[0];
                let license_id = license["id"].as_str().unwrap_or("");
                let is_active = license["is_active"].as_bool().unwrap_or(false);

                if !is_active {
                    // License revoked
                    delete_license_key()?;
                    delete_license_state()?;
                    return Ok(LicenseInfo {
                        status: LicenseStatus::Invalid {
                            reason: "License has been revoked".to_string(),
                        },
                        license_key_preview: Some(state.license_key_preview),
                        machine_id: Some(machine_id),
                        activated_at: None,
                        last_validated_at: None,
                        grace_period_until: None,
                    });
                }

                // Check expiration
                if let Some(expires_at) = license["expires_at"].as_str() {
                    if let Ok(expiry) = chrono::DateTime::parse_from_rfc3339(expires_at) {
                        if expiry < now {
                            delete_license_key()?;
                            delete_license_state()?;
                            return Ok(LicenseInfo {
                                status: LicenseStatus::Invalid {
                                    reason: "License has expired".to_string(),
                                },
                                license_key_preview: Some(state.license_key_preview),
                                machine_id: Some(machine_id),
                                activated_at: None,
                                last_validated_at: None,
                                grace_period_until: None,
                            });
                        }
                    }
                }

                // Update activation timestamp
                let update_url = format!(
                    "{}/rest/v1/activations?license_id=eq.{}&machine_id=eq.{}",
                    SUPABASE_URL, license_id, machine_id
                );

                let now_str = now.to_rfc3339();
                let grace_until = now + chrono::Duration::hours(GRACE_PERIOD_HOURS);
                let grace_until_str = grace_until.to_rfc3339();

                let _ = client
                    .patch(&update_url)
                    .header("apikey", SUPABASE_ANON_KEY)
                    .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
                    .header("Content-Type", "application/json")
                    .json(&serde_json::json!({
                        "last_validated_at": now_str
                    }))
                    .send()
                    .await;

                // Update local state
                let new_state = LicenseState {
                    last_validated_at: now_str.clone(),
                    grace_period_until: grace_until_str.clone(),
                    ..state.clone()
                };
                save_license_state(&new_state)?;

                log::info!("License validated successfully");

                return Ok(LicenseInfo {
                    status: LicenseStatus::Valid,
                    license_key_preview: Some(new_state.license_key_preview),
                    machine_id: Some(machine_id),
                    activated_at: Some(new_state.activated_at),
                    last_validated_at: Some(now_str),
                    grace_period_until: Some(grace_until_str),
                });
            }
        }
        Err(e) => {
            // Network error - check grace period
            log::warn!("Failed to validate license online: {}", e);
        }
    }

    // Offline or server error - check grace period
    let grace_until = chrono::DateTime::parse_from_rfc3339(&state.grace_period_until)
        .unwrap_or_else(|_| chrono::DateTime::default());

    if now < grace_until.with_timezone(&chrono::Utc) {
        let hours_remaining = (grace_until.with_timezone(&chrono::Utc) - now).num_hours();
        log::info!("License in grace period ({} hours remaining)", hours_remaining);

        return Ok(LicenseInfo {
            status: LicenseStatus::GracePeriod {
                hours_remaining: hours_remaining.max(0),
            },
            license_key_preview: Some(state.license_key_preview),
            machine_id: Some(machine_id),
            activated_at: Some(state.activated_at),
            last_validated_at: Some(state.last_validated_at),
            grace_period_until: Some(state.grace_period_until),
        });
    }

    // Grace period expired
    log::warn!("License grace period expired - blocking app");
    Ok(LicenseInfo {
        status: LicenseStatus::Invalid {
            reason: "License validation required. Please connect to the internet.".to_string(),
        },
        license_key_preview: Some(state.license_key_preview),
        machine_id: Some(machine_id),
        activated_at: Some(state.activated_at),
        last_validated_at: Some(state.last_validated_at),
        grace_period_until: Some(state.grace_period_until),
    })
}

/// Deactivate the current license (user wants to switch devices)
pub async fn deactivate_license() -> Result<()> {
    let license_key = match get_license_key()? {
        Some(key) => key,
        None => return Ok(()), // Already deactivated
    };

    let machine_id = get_machine_id();

    // Try to deactivate on server
    let client = reqwest::Client::new();

    // First get the license ID
    let check_url = format!(
        "{}/rest/v1/licenses?license_key=eq.{}&select=id",
        SUPABASE_URL, license_key
    );

    if let Ok(response) = client
        .get(&check_url)
        .header("apikey", SUPABASE_ANON_KEY)
        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
        .send()
        .await
    {
        if let Ok(licenses) = response.json::<Vec<serde_json::Value>>().await {
            if let Some(license) = licenses.first() {
                if let Some(license_id) = license["id"].as_str() {
                    // Deactivate this machine's activation
                    let deactivate_url = format!(
                        "{}/rest/v1/activations?license_id=eq.{}&machine_id=eq.{}",
                        SUPABASE_URL, license_id, machine_id
                    );

                    let _ = client
                        .patch(&deactivate_url)
                        .header("apikey", SUPABASE_ANON_KEY)
                        .header("Authorization", format!("Bearer {}", SUPABASE_ANON_KEY))
                        .header("Content-Type", "application/json")
                        .json(&serde_json::json!({
                            "is_active": false
                        }))
                        .send()
                        .await;
                }
            }
        }
    }

    // Clear local data regardless of server response
    delete_license_key()?;
    delete_license_state()?;

    log::info!("License deactivated");
    Ok(())
}

/// Get current license info without validating with server
pub fn get_license_info() -> LicenseInfo {
    let has_key = get_license_key().ok().flatten().is_some();

    if !has_key {
        return LicenseInfo {
            status: LicenseStatus::NotActivated,
            license_key_preview: None,
            machine_id: None,
            activated_at: None,
            last_validated_at: None,
            grace_period_until: None,
        };
    }

    let state = match load_license_state() {
        Some(s) => s,
        None => {
            return LicenseInfo {
                status: LicenseStatus::NeedsValidation,
                license_key_preview: None,
                machine_id: Some(get_machine_id()),
                activated_at: None,
                last_validated_at: None,
                grace_period_until: None,
            };
        }
    };

    LicenseInfo {
        status: LicenseStatus::Valid, // Will be validated properly on startup
        license_key_preview: Some(state.license_key_preview),
        machine_id: Some(state.machine_id),
        activated_at: Some(state.activated_at),
        last_validated_at: Some(state.last_validated_at),
        grace_period_until: Some(state.grace_period_until),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_license_key() {
        assert_eq!(mask_license_key("abc"), "••••••••");
        assert_eq!(mask_license_key("abcd1234-5678-90ab-cdef-ghijklmnopqr"), "abcd••••-••••");
    }

    #[test]
    fn test_hash_string() {
        let hash1 = hash_string("test");
        let hash2 = hash_string("test");
        assert_eq!(hash1, hash2);

        let hash3 = hash_string("different");
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_get_machine_id() {
        let id1 = get_machine_id();
        let id2 = get_machine_id();
        assert_eq!(id1, id2); // Should be stable
        assert!(!id1.is_empty());
    }
}

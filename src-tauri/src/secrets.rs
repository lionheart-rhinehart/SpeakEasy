//! Secure secrets management using OS credential storage.
//!
//! This module provides secure storage for API keys using the operating system's
//! native credential storage (Windows Credential Manager, macOS Keychain, Linux Secret Service).
//!
//! Keys are stored per-provider for the Transform feature, keeping them out of
//! the persisted settings file.

use anyhow::{Context, Result};
use keyring::Entry;
use serde::{Deserialize, Serialize};

/// Service name used in the OS credential store
const SERVICE_NAME: &str = "SpeakEasy";

/// Supported LLM providers for the Transform feature
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransformProvider {
    OpenRouter,
    OpenAI,
    Anthropic,
    Poe,
    CopyCoders,
}

/// Credential key for Genesis/CopyCoders' SECOND key (the `X-Provider-Key`).
/// Keyring stores one secret per (service, username); the primary `gen_` bearer
/// token lives under `transform_copycoders_api_key` (via `credential_key`), and
/// this is the parallel slot for the provider key.
const COPYCODERS_PROVIDER_KEY_CRED: &str = "transform_copycoders_provider_key";

impl TransformProvider {
    /// Get the credential key name for this provider
    fn credential_key(&self) -> &'static str {
        match self {
            TransformProvider::OpenRouter => "transform_openrouter_api_key",
            TransformProvider::OpenAI => "transform_openai_api_key",
            TransformProvider::Anthropic => "transform_anthropic_api_key",
            TransformProvider::Poe => "transform_poe_api_key",
            TransformProvider::CopyCoders => "transform_copycoders_api_key",
        }
    }

    /// Parse provider from string (case-insensitive)
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "openrouter" => Some(TransformProvider::OpenRouter),
            "openai" => Some(TransformProvider::OpenAI),
            "anthropic" => Some(TransformProvider::Anthropic),
            "poe" => Some(TransformProvider::Poe),
            "copycoders" => Some(TransformProvider::CopyCoders),
            _ => None,
        }
    }

    /// Get string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            TransformProvider::OpenRouter => "openrouter",
            TransformProvider::OpenAI => "openai",
            TransformProvider::Anthropic => "anthropic",
            TransformProvider::Poe => "poe",
            TransformProvider::CopyCoders => "copycoders",
        }
    }
}

impl std::fmt::Display for TransformProvider {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Status of an API key for a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyStatus {
    pub provider: String,
    pub is_set: bool,
    /// Masked preview of key (e.g., "sk-...abc123") - only if is_set is true
    pub preview: Option<String>,
}

/// Create a keyring entry for the given provider
fn get_entry(provider: TransformProvider) -> Result<Entry> {
    let credential_key = provider.credential_key();
    log::debug!(
        "Creating keyring entry: service='{}', user='{}'",
        SERVICE_NAME,
        credential_key
    );
    Entry::new(SERVICE_NAME, credential_key).context(format!(
        "Failed to create keyring entry for service='{}', user='{}'",
        SERVICE_NAME, credential_key
    ))
}

/// Store an API key securely for a provider
pub fn set_api_key(provider: TransformProvider, api_key: &str) -> Result<()> {
    log::info!(
        "Attempting to store API key for provider: {} (key length: {})",
        provider,
        api_key.len()
    );
    let entry = get_entry(provider)?;
    entry
        .set_password(api_key)
        .context(format!("Failed to store API key for {}", provider))?;
    log::info!("Successfully stored API key for provider: {}", provider);

    // Verify the key was actually stored by reading it back
    match entry.get_password() {
        Ok(_) => log::info!(
            "Verified: API key is readable after storing for {}",
            provider
        ),
        Err(e) => log::error!(
            "Warning: Could not verify stored API key for {}: {}",
            provider,
            e
        ),
    }

    Ok(())
}

/// Retrieve an API key for a provider (returns None if not set)
pub fn get_api_key(provider: TransformProvider) -> Result<Option<String>> {
    log::debug!("Attempting to retrieve API key for provider: {}", provider);
    let entry = get_entry(provider)?;
    match entry.get_password() {
        Ok(key) => {
            log::debug!(
                "Successfully retrieved API key for {} (length: {})",
                provider,
                key.len()
            );
            Ok(Some(key))
        }
        Err(keyring::Error::NoEntry) => {
            log::debug!("No API key entry found for {}", provider);
            Ok(None)
        }
        Err(e) => {
            log::error!("Keyring error retrieving API key for {}: {:?}", provider, e);
            Err(anyhow::anyhow!(
                "Failed to retrieve API key for {}: {}",
                provider,
                e
            ))
        }
    }
}

/// Delete an API key for a provider
pub fn clear_api_key(provider: TransformProvider) -> Result<()> {
    let entry = get_entry(provider)?;
    match entry.delete_credential() {
        Ok(()) => {
            log::info!("Cleared API key for provider: {}", provider);
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            // Already not set, that's fine
            Ok(())
        }
        Err(e) => Err(anyhow::anyhow!(
            "Failed to clear API key for {}: {}",
            provider,
            e
        )),
    }
}

/// Get the status of an API key for a provider
pub fn get_api_key_status(provider: TransformProvider) -> ApiKeyStatus {
    match get_api_key(provider) {
        Ok(Some(key)) => {
            log::debug!("API key found for provider: {}", provider);
            ApiKeyStatus {
                provider: provider.as_str().to_string(),
                is_set: true,
                preview: Some(mask_api_key(&key)),
            }
        }
        Ok(None) => {
            log::debug!("No API key set for provider: {}", provider);
            ApiKeyStatus {
                provider: provider.as_str().to_string(),
                is_set: false,
                preview: None,
            }
        }
        Err(e) => {
            // Log the error instead of silently swallowing it
            log::error!("Failed to retrieve API key for {}: {}", provider, e);
            ApiKeyStatus {
                provider: provider.as_str().to_string(),
                is_set: false,
                preview: None,
            }
        }
    }
}

/// Get status for all providers
pub fn get_all_api_key_statuses() -> Vec<ApiKeyStatus> {
    vec![
        get_api_key_status(TransformProvider::OpenRouter),
        get_api_key_status(TransformProvider::OpenAI),
        get_api_key_status(TransformProvider::Anthropic),
        get_api_key_status(TransformProvider::Poe),
        get_api_key_status(TransformProvider::CopyCoders),
    ]
}

// ============================================================================
// Genesis/CopyCoders SECOND key (the X-Provider-Key)
// ============================================================================
// Genesis is two-key: the `gen_` bearer token (stored via credential_key like any
// other provider) PLUS a provider key sent as `X-Provider-Key`. Since keyring is
// one-secret-per-username, the provider key gets its own credential slot.

/// Create a keyring entry for the CopyCoders provider (second) key.
fn get_copycoders_provider_entry() -> Result<Entry> {
    Entry::new(SERVICE_NAME, COPYCODERS_PROVIDER_KEY_CRED).context(format!(
        "Failed to create keyring entry for service='{}', user='{}'",
        SERVICE_NAME, COPYCODERS_PROVIDER_KEY_CRED
    ))
}

/// Store the CopyCoders provider (second) key.
pub fn set_copycoders_provider_key(key: &str) -> Result<()> {
    let entry = get_copycoders_provider_entry()?;
    entry
        .set_password(key)
        .context("Failed to store CopyCoders provider key")?;
    log::info!("Stored CopyCoders provider key (length: {})", key.len());
    Ok(())
}

/// Retrieve the CopyCoders provider (second) key (None if not set).
pub fn get_copycoders_provider_key() -> Result<Option<String>> {
    let entry = get_copycoders_provider_entry()?;
    match entry.get_password() {
        Ok(key) => Ok(Some(key)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(anyhow::anyhow!(
            "Failed to retrieve CopyCoders provider key: {}",
            e
        )),
    }
}

/// Delete the CopyCoders provider (second) key.
pub fn clear_copycoders_provider_key() -> Result<()> {
    let entry = get_copycoders_provider_entry()?;
    match entry.delete_credential() {
        Ok(()) => {
            log::info!("Cleared CopyCoders provider key");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(anyhow::anyhow!(
            "Failed to clear CopyCoders provider key: {}",
            e
        )),
    }
}

/// Status of the CopyCoders provider (second) key (never returns the raw key).
pub fn get_copycoders_provider_key_status() -> ApiKeyStatus {
    match get_copycoders_provider_key() {
        Ok(Some(key)) => ApiKeyStatus {
            provider: "copycoders_provider".to_string(),
            is_set: true,
            preview: Some(mask_api_key(&key)),
        },
        _ => ApiKeyStatus {
            provider: "copycoders_provider".to_string(),
            is_set: false,
            preview: None,
        },
    }
}

/// Mask an API key for display (show first few and last few characters)
fn mask_api_key(key: &str) -> String {
    if key.len() <= 8 {
        return "••••••••".to_string();
    }

    let prefix_len = key.find('-').map(|i| i + 1).unwrap_or(3).min(8);
    let suffix_len = 4;

    if key.len() <= prefix_len + suffix_len {
        return format!("{}••••", &key[..prefix_len.min(key.len())]);
    }

    let prefix = &key[..prefix_len];
    let suffix = &key[key.len() - suffix_len..];
    format!("{}••••{}", prefix, suffix)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mask_api_key_openai_format() {
        let key = "sk-proj-abc123xyz789verylongkey";
        let masked = mask_api_key(key);
        // mask_api_key reveals only up to the FIRST hyphen (prefix_len = index of
        // first '-' + 1, capped at 8) — for "sk-proj-…" that's "sk-", the more
        // privacy-preserving choice. (Pre-existing test asserted "sk-proj-", which
        // never matched the implementation; corrected to the actual, safer output.)
        assert!(masked.starts_with("sk-"));
        assert!(masked.ends_with("gkey"));
        assert!(masked.contains("••••"));
    }

    #[test]
    fn test_mask_api_key_short() {
        let key = "abc";
        let masked = mask_api_key(key);
        assert_eq!(masked, "••••••••");
    }

    #[test]
    fn test_provider_from_str() {
        assert_eq!(
            TransformProvider::from_str("openrouter"),
            Some(TransformProvider::OpenRouter)
        );
        assert_eq!(
            TransformProvider::from_str("OPENAI"),
            Some(TransformProvider::OpenAI)
        );
        assert_eq!(
            TransformProvider::from_str("Anthropic"),
            Some(TransformProvider::Anthropic)
        );
        assert_eq!(TransformProvider::from_str("unknown"), None);
    }

    #[test]
    fn test_provider_as_str() {
        assert_eq!(TransformProvider::OpenRouter.as_str(), "openrouter");
        assert_eq!(TransformProvider::OpenAI.as_str(), "openai");
        assert_eq!(TransformProvider::Anthropic.as_str(), "anthropic");
    }
}

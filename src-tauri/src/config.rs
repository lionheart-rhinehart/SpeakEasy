use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

// Current schema version for migrations
const USAGE_SCHEMA_VERSION: u32 = 2;
const SETTINGS_SCHEMA_VERSION: u32 = 2;

// ==================== User Settings (persisted to file) ====================

/// Webhook action configuration (matches frontend WebhookAction interface)
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct WebhookAction {
    pub id: String,
    pub name: String,
    pub hotkey: String,
    pub webhook_url: String,
    pub method: String, // "POST" | "GET" | "URL" | "SMART_URL"
    #[serde(default)]
    pub headers: Option<HashMap<String, String>>,
    pub enabled: bool,
    #[serde(default)]
    pub ask_chrome_profile: Option<bool>,
}

/// Prompt action configuration for LLM-based transforms with stored prompts
/// These bypass webhooks and voice - directly apply a stored prompt to selected text
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct PromptAction {
    pub id: String,
    pub name: String,
    pub hotkey: String,
    pub prompt: String, // The stored prompt, use {{text}} for selected text placeholder
    pub enabled: bool,
}

/// User settings that survive app reinstalls
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserSettings {
    #[serde(default = "default_settings_version")]
    pub settings_version: u32,

    // Hotkeys
    #[serde(default = "default_hotkey_record")]
    pub hotkey_record: String,
    #[serde(default = "default_hotkey_ai_transform")]
    pub hotkey_ai_transform: String,
    #[serde(default = "default_hotkey_history")]
    pub hotkey_history: String,

    // Transcription settings
    #[serde(default = "default_auto_paste_mode")]
    pub auto_paste_mode: String, // "always" | "smart" | "never"
    #[serde(default = "default_display_mode")]
    pub display_mode: String, // "direct" | "toast" | "edit"
    #[serde(default = "default_language")]
    pub language: String,
    #[serde(default)]
    pub translate_to_english: bool,
    #[serde(default = "default_true")]
    pub audio_enabled: bool,
    #[serde(default)]
    pub floating_indicator: bool,
    #[serde(default = "default_history_limit")]
    pub history_limit_mb: u32,
    #[serde(default)]
    pub start_on_boot: bool,
    #[serde(default = "default_true")]
    pub start_minimized: bool,
    #[serde(default)]
    pub selected_microphone: Option<String>,

    // Transform settings
    #[serde(default = "default_transform_provider")]
    pub transform_provider: String,
    #[serde(default = "default_transform_model")]
    pub transform_model: String,
    #[serde(default = "default_transform_temperature")]
    pub transform_temperature: f64,
    #[serde(default = "default_transform_max_tokens")]
    pub transform_max_tokens: u32,

    // Webhook actions
    #[serde(default)]
    pub webhook_actions: Vec<WebhookAction>,

    // Prompt actions (LLM-based transforms with stored prompts)
    #[serde(default)]
    pub prompt_actions: Vec<PromptAction>,
}

// Default value functions for UserSettings
fn default_settings_version() -> u32 {
    SETTINGS_SCHEMA_VERSION
}
fn default_hotkey_record() -> String {
    "Control+Space".to_string()
}
fn default_hotkey_ai_transform() -> String {
    "Control+Backquote".to_string()
}
fn default_hotkey_history() -> String {
    "Control+H".to_string()
}
fn default_auto_paste_mode() -> String {
    "smart".to_string()
}
fn default_display_mode() -> String {
    "direct".to_string()
}
fn default_language() -> String {
    "en".to_string()
}
fn default_true() -> bool {
    true
}
fn default_history_limit() -> u32 {
    10
}
fn default_transform_provider() -> String {
    "openrouter".to_string()
}
fn default_transform_model() -> String {
    "openai/gpt-4o-mini".to_string()
}
fn default_transform_temperature() -> f64 {
    0.7
}
fn default_transform_max_tokens() -> u32 {
    4096
}

impl Default for UserSettings {
    fn default() -> Self {
        Self {
            settings_version: SETTINGS_SCHEMA_VERSION,
            hotkey_record: default_hotkey_record(),
            hotkey_ai_transform: default_hotkey_ai_transform(),
            hotkey_history: default_hotkey_history(),
            auto_paste_mode: default_auto_paste_mode(),
            display_mode: default_display_mode(),
            language: default_language(),
            translate_to_english: false,
            audio_enabled: true,
            floating_indicator: false,
            history_limit_mb: default_history_limit(),
            start_on_boot: false,
            start_minimized: true,
            selected_microphone: None,
            transform_provider: default_transform_provider(),
            transform_model: default_transform_model(),
            transform_temperature: default_transform_temperature(),
            transform_max_tokens: default_transform_max_tokens(),
            webhook_actions: Vec::new(),
            prompt_actions: Vec::new(),
        }
    }
}

// ==================== Usage Stats ====================

// OpenAI pricing constants (as of Dec 2024)
pub const WHISPER_PRICE_PER_MINUTE: f64 = 0.006;
pub const GPT4O_MINI_INPUT_PRICE_PER_1K: f64 = 0.00015; // $0.150 per 1M input tokens
pub const GPT4O_MINI_OUTPUT_PRICE_PER_1K: f64 = 0.0006; // $0.600 per 1M output tokens

/// Transcription-specific usage stats
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct TranscriptionUsage {
    pub count: u32,
    pub duration_ms: u64,
    pub audio_bytes: u64,
    pub cost_usd: f64,
}

impl TranscriptionUsage {
    pub fn minutes(&self) -> f64 {
        self.duration_ms as f64 / 60_000.0
    }

    pub fn calculate_cost(&self) -> f64 {
        self.minutes() * WHISPER_PRICE_PER_MINUTE
    }
}

/// GPT transform-specific usage stats (tokens-based)
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct GptUsage {
    pub count: u32,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub cost_usd: f64,
}

/// Webhook usage stats
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct WebhookUsage {
    pub count: u32,
    pub success_count: u32,
    pub failure_count: u32,
}

/// Monthly usage breakdown
#[derive(Debug, Serialize, Deserialize, Default, Clone)]
pub struct MonthlyUsage {
    pub month: String, // Format: "2025-01"
    pub transcription: TranscriptionUsage,
    pub gpt: GptUsage,
    pub webhook: WebhookUsage,
}

impl MonthlyUsage {
    pub fn total_cost_usd(&self) -> f64 {
        self.transcription.cost_usd + self.gpt.cost_usd
    }
}

/// Complete usage statistics with per-feature breakdown
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UsageStats {
    #[serde(default = "default_schema_version")]
    pub schema_version: u32,

    // Lifetime totals (default for backward compatibility with legacy configs)
    #[serde(default)]
    pub transcription: TranscriptionUsage,
    #[serde(default)]
    pub gpt: GptUsage,
    #[serde(default)]
    pub webhook: WebhookUsage,

    // Current month stats (default for backward compatibility)
    #[serde(default = "default_monthly_usage")]
    pub current_month: MonthlyUsage,

    // Sync metadata
    #[serde(default)]
    pub last_synced_at: Option<String>, // ISO 8601 timestamp

    // Legacy fields for backward compatibility during migration
    #[serde(default)]
    pub total_transcriptions: u32,
    #[serde(default)]
    pub total_duration_ms: u64,
    #[serde(default)]
    pub total_audio_bytes: u64,
    #[serde(default)]
    pub month_transcriptions: u32,
    #[serde(default)]
    pub month_duration_ms: u64,
}

fn default_schema_version() -> u32 {
    1 // Old configs without version are v1
}

fn default_monthly_usage() -> MonthlyUsage {
    MonthlyUsage {
        month: chrono::Utc::now().format("%Y-%m").to_string(),
        ..Default::default()
    }
}

impl Default for UsageStats {
    fn default() -> Self {
        Self {
            schema_version: USAGE_SCHEMA_VERSION,
            transcription: TranscriptionUsage::default(),
            gpt: GptUsage::default(),
            webhook: WebhookUsage::default(),
            current_month: MonthlyUsage {
                month: chrono::Utc::now().format("%Y-%m").to_string(),
                ..Default::default()
            },
            last_synced_at: None,
            // Legacy fields
            total_transcriptions: 0,
            total_duration_ms: 0,
            total_audio_bytes: 0,
            month_transcriptions: 0,
            month_duration_ms: 0,
        }
    }
}

impl UsageStats {
    /// Migrate from old schema to new schema if needed
    pub fn migrate(&mut self) {
        if self.schema_version < 2 {
            // Migrate v1 -> v2: copy legacy fields to new structure
            self.transcription.count = self.total_transcriptions;
            self.transcription.duration_ms = self.total_duration_ms;
            self.transcription.audio_bytes = self.total_audio_bytes;
            self.transcription.cost_usd = self.transcription.calculate_cost();

            self.current_month.transcription.count = self.month_transcriptions;
            self.current_month.transcription.duration_ms = self.month_duration_ms;
            self.current_month.transcription.cost_usd =
                self.current_month.transcription.calculate_cost();

            // Set current month if not set
            if self.current_month.month.is_empty() {
                self.current_month.month = chrono::Utc::now().format("%Y-%m").to_string();
            }

            self.schema_version = 2;
            log::info!("Migrated usage stats from v1 to v2");
        }
    }

    /// Total estimated cost across all features (lifetime)
    pub fn total_cost_usd(&self) -> f64 {
        self.transcription.cost_usd + self.gpt.cost_usd
    }

    /// Total estimated cost for current month
    pub fn month_cost_usd(&self) -> f64 {
        self.current_month.total_cost_usd()
    }
}

/// Usage event types for recording
#[derive(Debug, Clone)]
pub enum UsageEvent {
    Transcription {
        duration_ms: u64,
        audio_bytes: u64,
    },
    GptTransform {
        prompt_tokens: u64,
        completion_tokens: u64,
        total_tokens: u64,
        model: String,
    },
    Webhook {
        success: bool,
    },
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppConfig {
    pub api_key: Option<String>,
    pub selected_device: Option<String>,
    #[serde(default)]
    pub usage: UsageStats,
    #[serde(default)]
    pub user_settings: Option<UserSettings>,
}

fn get_config_path() -> Result<PathBuf> {
    let config_dir =
        dirs::config_dir().ok_or_else(|| anyhow::anyhow!("Could not find config directory"))?;
    let app_dir = config_dir.join("SpeakEasy");
    fs::create_dir_all(&app_dir)?;
    Ok(app_dir.join("config.json"))
}

pub fn load_config() -> AppConfig {
    match get_config_path() {
        Ok(path) => {
            if path.exists() {
                match fs::read_to_string(&path) {
                    Ok(contents) => serde_json::from_str(&contents).unwrap_or_default(),
                    Err(_) => AppConfig::default(),
                }
            } else {
                AppConfig::default()
            }
        }
        Err(_) => AppConfig::default(),
    }
}

pub fn save_config(config: &AppConfig) -> Result<()> {
    let path = get_config_path()?;
    let contents = serde_json::to_string_pretty(config)?;
    fs::write(path, contents)?;
    Ok(())
}

pub fn save_api_key(api_key: &str) -> Result<()> {
    let mut config = load_config();
    config.api_key = Some(api_key.to_string());
    save_config(&config)
}

pub fn get_api_key() -> Option<String> {
    load_config().api_key
}

/// Load user settings from file-based config
pub fn load_user_settings() -> UserSettings {
    let config = load_config();
    config.user_settings.unwrap_or_default()
}

/// Save user settings to file-based config
pub fn save_user_settings(settings: &UserSettings) -> Result<()> {
    let mut config = load_config();
    config.user_settings = Some(settings.clone());
    save_config(&config)?;
    log::info!("User settings saved to config file");
    Ok(())
}

/// Legacy function for backward compatibility - records transcription usage
pub fn record_usage(duration_ms: u64, audio_bytes: u64) -> Result<()> {
    record_usage_event(UsageEvent::Transcription {
        duration_ms,
        audio_bytes,
    })
}

/// Record a usage event with full details
pub fn record_usage_event(event: UsageEvent) -> Result<()> {
    let mut config = load_config();

    // Run migration if needed
    config.usage.migrate();

    // Get current month and check for month rollover
    let now = chrono::Utc::now();
    let current_month = now.format("%Y-%m").to_string();

    if config.usage.current_month.month != current_month {
        // Reset monthly stats for new month
        config.usage.current_month = MonthlyUsage {
            month: current_month,
            ..Default::default()
        };
        log::info!("Month rollover: reset monthly usage stats");
    }

    match event {
        UsageEvent::Transcription {
            duration_ms,
            audio_bytes,
            ..
        } => {
            // Calculate cost for this transcription
            let minutes = duration_ms as f64 / 60_000.0;
            let cost = minutes * WHISPER_PRICE_PER_MINUTE;

            // Update lifetime totals
            config.usage.transcription.count += 1;
            config.usage.transcription.duration_ms += duration_ms;
            config.usage.transcription.audio_bytes += audio_bytes;
            config.usage.transcription.cost_usd += cost;

            // Update monthly totals
            config.usage.current_month.transcription.count += 1;
            config.usage.current_month.transcription.duration_ms += duration_ms;
            config.usage.current_month.transcription.audio_bytes += audio_bytes;
            config.usage.current_month.transcription.cost_usd += cost;

            // Update legacy fields for compatibility
            config.usage.total_transcriptions += 1;
            config.usage.total_duration_ms += duration_ms;
            config.usage.total_audio_bytes += audio_bytes;
            config.usage.month_transcriptions += 1;
            config.usage.month_duration_ms += duration_ms;

            log::info!(
                "Recorded transcription: {:.2} min, {} bytes, ${:.4}",
                minutes,
                audio_bytes,
                cost
            );
        }
        UsageEvent::GptTransform {
            prompt_tokens,
            completion_tokens,
            total_tokens,
            model,
        } => {
            // Calculate cost based on model pricing
            let input_cost = (prompt_tokens as f64 / 1000.0) * GPT4O_MINI_INPUT_PRICE_PER_1K;
            let output_cost = (completion_tokens as f64 / 1000.0) * GPT4O_MINI_OUTPUT_PRICE_PER_1K;
            let cost = input_cost + output_cost;

            // Update lifetime totals
            config.usage.gpt.count += 1;
            config.usage.gpt.prompt_tokens += prompt_tokens;
            config.usage.gpt.completion_tokens += completion_tokens;
            config.usage.gpt.total_tokens += total_tokens;
            config.usage.gpt.cost_usd += cost;

            // Update monthly totals
            config.usage.current_month.gpt.count += 1;
            config.usage.current_month.gpt.prompt_tokens += prompt_tokens;
            config.usage.current_month.gpt.completion_tokens += completion_tokens;
            config.usage.current_month.gpt.total_tokens += total_tokens;
            config.usage.current_month.gpt.cost_usd += cost;

            log::info!(
                "Recorded GPT transform ({}): {} prompt + {} completion = {} total tokens, ${:.6}",
                model,
                prompt_tokens,
                completion_tokens,
                total_tokens,
                cost
            );
        }
        UsageEvent::Webhook { success } => {
            // Update lifetime totals
            config.usage.webhook.count += 1;
            if success {
                config.usage.webhook.success_count += 1;
            } else {
                config.usage.webhook.failure_count += 1;
            }

            // Update monthly totals
            config.usage.current_month.webhook.count += 1;
            if success {
                config.usage.current_month.webhook.success_count += 1;
            } else {
                config.usage.current_month.webhook.failure_count += 1;
            }

            log::info!("Recorded webhook call: success={}", success);
        }
    }

    save_config(&config)
}

pub fn get_usage_stats() -> UsageStats {
    let mut config = load_config();
    config.usage.migrate();
    config.usage
}

/// Mark usage stats as synced/verified at current timestamp
pub fn mark_usage_synced() -> Result<String> {
    let mut config = load_config();
    config.usage.migrate();

    let now = chrono::Utc::now();
    let timestamp = now.to_rfc3339();
    config.usage.last_synced_at = Some(timestamp.clone());

    save_config(&config)?;
    log::info!("Usage stats marked as synced at {}", timestamp);
    Ok(timestamp)
}

/// Reset all usage statistics (lifetime and monthly)
pub fn reset_usage_stats() -> Result<()> {
    let mut config = load_config();

    // Preserve schema version but reset everything else
    config.usage = UsageStats {
        schema_version: USAGE_SCHEMA_VERSION,
        current_month: MonthlyUsage {
            month: chrono::Utc::now().format("%Y-%m").to_string(),
            ..Default::default()
        },
        ..Default::default()
    };

    save_config(&config)?;
    log::info!("All usage stats reset");
    Ok(())
}

/// Reset only monthly usage statistics
pub fn reset_monthly_usage() -> Result<()> {
    let mut config = load_config();
    config.usage.migrate();

    config.usage.current_month = MonthlyUsage {
        month: chrono::Utc::now().format("%Y-%m").to_string(),
        ..Default::default()
    };

    // Also reset legacy monthly fields
    config.usage.month_transcriptions = 0;
    config.usage.month_duration_ms = 0;

    save_config(&config)?;
    log::info!("Monthly usage stats reset");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    // ===== Pricing Calculation Tests =====

    #[test]
    fn test_whisper_cost_calculation() {
        let mut usage = TranscriptionUsage::default();
        usage.duration_ms = 60_000; // 1 minute

        let cost = usage.calculate_cost();
        assert!((cost - 0.006).abs() < 0.0001, "1 minute should cost $0.006");
    }

    #[test]
    fn test_whisper_cost_5_minutes() {
        let mut usage = TranscriptionUsage::default();
        usage.duration_ms = 300_000; // 5 minutes

        let cost = usage.calculate_cost();
        assert!(
            (cost - 0.030).abs() < 0.0001,
            "5 minutes should cost $0.030"
        );
    }

    #[test]
    fn test_whisper_cost_fractional_minutes() {
        let mut usage = TranscriptionUsage::default();
        usage.duration_ms = 90_000; // 1.5 minutes

        let cost = usage.calculate_cost();
        assert!(
            (cost - 0.009).abs() < 0.0001,
            "1.5 minutes should cost $0.009"
        );
    }

    #[test]
    fn test_total_cost_combines_features() {
        let mut stats = UsageStats::default();
        stats.transcription.cost_usd = 0.10;
        stats.gpt.cost_usd = 0.05;

        assert!(
            (stats.total_cost_usd() - 0.15).abs() < 0.0001,
            "Total cost should combine all features"
        );
    }

    // ===== Minutes Calculation Tests =====

    #[test]
    fn test_minutes_from_ms() {
        let mut usage = TranscriptionUsage::default();
        usage.duration_ms = 120_000; // 2 minutes

        assert!(
            (usage.minutes() - 2.0).abs() < 0.001,
            "Minutes calculation incorrect"
        );
    }

    #[test]
    fn test_minutes_partial() {
        let mut usage = TranscriptionUsage::default();
        usage.duration_ms = 45_000; // 0.75 minutes

        assert!(
            (usage.minutes() - 0.75).abs() < 0.001,
            "Partial minutes calculation incorrect"
        );
    }

    // ===== Schema Migration Tests =====

    #[test]
    fn test_migration_v1_to_v2() {
        // Simulate a v1 config (legacy fields populated, new fields empty)
        let mut stats = UsageStats {
            schema_version: 1,
            transcription: TranscriptionUsage::default(),
            gpt: GptUsage::default(),
            webhook: WebhookUsage::default(),
            current_month: MonthlyUsage::default(),
            last_synced_at: None,
            // Legacy v1 fields
            total_transcriptions: 10,
            total_duration_ms: 600_000, // 10 minutes
            total_audio_bytes: 1_000_000,
            month_transcriptions: 3,
            month_duration_ms: 180_000, // 3 minutes
        };

        stats.migrate();

        // Verify migration copied legacy data to new structure
        assert_eq!(
            stats.schema_version, 2,
            "Schema version should be 2 after migration"
        );
        assert_eq!(
            stats.transcription.count, 10,
            "Transcription count should be migrated"
        );
        assert_eq!(
            stats.transcription.duration_ms, 600_000,
            "Duration should be migrated"
        );
        assert_eq!(
            stats.transcription.audio_bytes, 1_000_000,
            "Audio bytes should be migrated"
        );

        // Verify cost was calculated during migration
        let expected_cost = (600_000.0 / 60_000.0) * WHISPER_PRICE_PER_MINUTE;
        assert!(
            (stats.transcription.cost_usd - expected_cost).abs() < 0.0001,
            "Cost should be calculated during migration"
        );

        // Monthly data
        assert_eq!(
            stats.current_month.transcription.count, 3,
            "Monthly count should be migrated"
        );
        assert_eq!(
            stats.current_month.transcription.duration_ms, 180_000,
            "Monthly duration should be migrated"
        );
    }

    #[test]
    fn test_migration_already_v2_no_change() {
        let mut stats = UsageStats::default();
        stats.schema_version = 2;
        stats.transcription.count = 5;
        stats.transcription.cost_usd = 0.123;

        let original_count = stats.transcription.count;
        let original_cost = stats.transcription.cost_usd;

        stats.migrate();

        // Verify no changes were made
        assert_eq!(stats.schema_version, 2);
        assert_eq!(stats.transcription.count, original_count);
        assert!((stats.transcription.cost_usd - original_cost).abs() < 0.0001);
    }

    // ===== Default Values Tests =====

    #[test]
    fn test_default_usage_stats() {
        let stats = UsageStats::default();

        assert_eq!(stats.schema_version, USAGE_SCHEMA_VERSION);
        assert_eq!(stats.transcription.count, 0);
        assert_eq!(stats.gpt.count, 0);
        assert_eq!(stats.webhook.count, 0);
        assert!(stats.last_synced_at.is_none());
    }

    #[test]
    fn test_default_has_current_month_set() {
        let stats = UsageStats::default();
        let now = chrono::Utc::now();
        let expected_month = now.format("%Y-%m").to_string();

        assert_eq!(
            stats.current_month.month, expected_month,
            "Default should have current month set"
        );
    }

    // ===== Monthly Usage Tests =====

    #[test]
    fn test_monthly_total_cost() {
        let mut monthly = MonthlyUsage::default();
        monthly.transcription.cost_usd = 0.05;
        monthly.gpt.cost_usd = 0.03;

        assert!((monthly.total_cost_usd() - 0.08).abs() < 0.0001);
    }

    // ===== Serialization Tests =====

    #[test]
    fn test_usage_stats_serialization() {
        let stats = UsageStats::default();
        let json = serde_json::to_string(&stats).expect("Should serialize");
        let deserialized: UsageStats = serde_json::from_str(&json).expect("Should deserialize");

        assert_eq!(deserialized.schema_version, stats.schema_version);
    }

    #[test]
    fn test_legacy_json_deserialization() {
        // Simulate a v1 JSON config embedded in AppConfig (as it would be stored)
        // Note: In v1, current_month was a string, but we now have it as MonthlyUsage struct
        // The migration path is: old config files have legacy fields, migration copies them to new struct
        let legacy_json = r#"{
            "total_transcriptions": 5,
            "total_duration_ms": 300000,
            "total_audio_bytes": 500000,
            "month_transcriptions": 2,
            "month_duration_ms": 120000
        }"#;

        let stats: UsageStats =
            serde_json::from_str(legacy_json).expect("Should deserialize legacy JSON");

        // Verify legacy fields were read
        assert_eq!(stats.total_transcriptions, 5);
        assert_eq!(stats.total_duration_ms, 300000);

        // Verify defaults were applied for new fields
        assert_eq!(stats.schema_version, 1); // default_schema_version returns 1
        assert_eq!(stats.transcription.count, 0); // New field defaults to 0
    }

    #[test]
    fn test_full_app_config_with_legacy_usage() {
        // Test deserializing a full AppConfig with legacy usage data
        let config_json = r#"{
            "api_key": "sk-test",
            "selected_device": null,
            "usage": {
                "total_transcriptions": 10,
                "total_duration_ms": 600000,
                "total_audio_bytes": 1000000,
                "month_transcriptions": 3,
                "month_duration_ms": 180000
            }
        }"#;

        let config: AppConfig =
            serde_json::from_str(config_json).expect("Should deserialize legacy config");

        // Verify it loaded correctly
        assert_eq!(config.api_key, Some("sk-test".to_string()));
        assert_eq!(config.usage.total_transcriptions, 10);
        assert_eq!(config.usage.schema_version, 1); // Default for legacy
    }
}

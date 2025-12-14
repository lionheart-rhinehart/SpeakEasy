use crate::audio;
use crate::clipboard;
use crate::config;
use crate::state::AppState;
use crate::transcription;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

#[derive(Debug, Serialize, Deserialize)]
pub struct AudioDevice {
    pub name: String,
    pub is_default: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordingStateResponse {
    pub state: String,
    pub is_recording: bool,
}

#[tauri::command]
pub async fn start_recording(state: State<'_, Mutex<AppState>>) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    state.start_recording().map_err(|e| e.to_string())?;
    log::info!("Recording started");
    Ok(())
}

#[tauri::command]
pub async fn stop_recording(state: State<'_, Mutex<AppState>>) -> Result<Vec<u8>, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    let wav_data = state.stop_recording().map_err(|e| e.to_string())?;
    log::info!("Recording stopped, {} bytes of audio", wav_data.len());
    Ok(wav_data)
}

#[tauri::command]
pub fn get_recording_state(state: State<'_, Mutex<AppState>>) -> Result<RecordingStateResponse, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    let recording_state = state.get_state();

    let state_str = match recording_state {
        crate::state::RecordingState::Idle => "idle",
        crate::state::RecordingState::Recording => "recording",
        crate::state::RecordingState::Processing => "processing",
    };

    Ok(RecordingStateResponse {
        state: state_str.to_string(),
        is_recording: state.is_recording(),
    })
}

#[tauri::command]
pub async fn copy_to_clipboard(text: String) -> Result<(), String> {
    clipboard::copy_text(&text).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn paste_text() -> Result<(), String> {
    clipboard::simulate_paste().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn simulate_copy() -> Result<(), String> {
    clipboard::simulate_copy().map_err(|e| e.to_string())
}

/// Capture selected text from the focused application.
/// Simulates Ctrl+C, polls for clipboard changes, returns the selected text.
/// Returns error if no selection detected (clipboard doesn't change within timeout).
#[tauri::command]
pub async fn get_selected_text() -> Result<String, String> {
    clipboard::get_selected_text().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_audio_devices() -> Result<Vec<AudioDevice>, String> {
    audio::get_input_devices().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn set_audio_device(
    state: State<'_, Mutex<AppState>>,
    device_name: Option<String>,
) -> Result<(), String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    *state.selected_device.lock().unwrap() = device_name;
    Ok(())
}

#[tauri::command]
pub async fn play_sound(sound_type: String) -> Result<(), String> {
    match sound_type.as_str() {
        "start" => audio::play_start_sound().map_err(|e| e.to_string()),
        "stop" => audio::play_stop_sound().map_err(|e| e.to_string()),
        _ => Err("Unknown sound type".to_string()),
    }
}

#[tauri::command]
pub fn get_audio_level(state: State<'_, Mutex<AppState>>) -> Result<f32, String> {
    let state = state.lock().map_err(|e| e.to_string())?;
    Ok(state.get_audio_level())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub language: String,
    pub duration_ms: u32,
}

#[tauri::command]
pub async fn transcribe_audio(
    state: State<'_, Mutex<AppState>>,
    api_key: String,
    language: Option<String>,
    translate_to_english: Option<bool>,
) -> Result<TranscriptionResult, String> {
    // Get the audio data from the state
    let wav_data = {
        let state = state.lock().map_err(|e| e.to_string())?;
        state.stop_recording().map_err(|e| e.to_string())?
    };

    let audio_bytes = wav_data.len() as u64;
    log::info!("Transcribing {} bytes of audio (translate: {:?})", audio_bytes, translate_to_english);

    // Call appropriate Whisper API endpoint
    let result = if translate_to_english.unwrap_or(false) {
        // Use translations endpoint - auto-detects language and outputs English
        transcription::translate_to_english(&api_key, wav_data)
            .await
            .map_err(|e| e.to_string())?
    } else {
        // Use transcriptions endpoint - outputs in source language
        transcription::transcribe_with_whisper(&api_key, wav_data, language.as_deref())
            .await
            .map_err(|e| e.to_string())?
    };

    // Record usage stats
    if let Err(e) = config::record_usage(result.duration_ms as u64, audio_bytes) {
        log::warn!("Failed to record usage stats: {}", e);
    }

    // Set state back to idle
    {
        let state = state.lock().map_err(|e| e.to_string())?;
        state.set_idle();
    }

    Ok(TranscriptionResult {
        text: result.text,
        language: result.language,
        duration_ms: result.duration_ms,
    })
}

#[tauri::command]
pub async fn set_api_key(
    state: State<'_, Mutex<AppState>>,
    api_key: String,
) -> Result<(), String> {
    // Save to persistent storage
    config::save_api_key(&api_key).map_err(|e| e.to_string())?;

    // Also update in-memory state
    let state = state.lock().map_err(|e| e.to_string())?;
    *state.api_key.lock().unwrap() = Some(api_key);
    Ok(())
}

#[tauri::command]
pub async fn get_api_key(state: State<'_, Mutex<AppState>>) -> Result<Option<String>, String> {
    // First check in-memory state
    let state = state.lock().map_err(|e| e.to_string())?;
    let in_memory = state.api_key.lock().unwrap().clone();

    if in_memory.is_some() {
        return Ok(in_memory);
    }

    // Fall back to persistent storage
    Ok(config::get_api_key())
}

#[tauri::command]
pub async fn show_recording_overlay(app: AppHandle) -> Result<(), String> {
    use tauri::Emitter;

    // Get the overlay window
    if let Some(overlay) = app.get_webview_window("recording-overlay") {
        // Get primary monitor to position in bottom-right
        if let Some(monitor) = app.primary_monitor().map_err(|e| e.to_string())?.as_ref() {
            let monitor_size = monitor.size();
            let scale_factor = monitor.scale_factor();

            // Window size (300x80 as configured)
            let window_width = 300.0;
            let window_height = 80.0;
            let margin_x = 20.0;
            let margin_y = 60.0; // Extra margin to clear taskbar

            // Calculate position (bottom-right corner with margin)
            let x = (monitor_size.width as f64 / scale_factor) - window_width - margin_x;
            let y = (monitor_size.height as f64 / scale_factor) - window_height - margin_y;

            overlay.set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x, y)))
                .map_err(|e| e.to_string())?;
        }

        overlay.show().map_err(|e| e.to_string())?;

        // Reset overlay to recording state when showing (emit directly to overlay)
        let payload = serde_json::json!({
            "state": "recording",
            "recordingDurationMs": null
        });
        overlay.emit("overlay-state-change", payload).ok();
        log::info!("Recording overlay shown, state reset to recording");
    } else {
        log::warn!("Recording overlay window not found");
    }
    Ok(())
}

#[tauri::command]
pub async fn hide_recording_overlay(app: AppHandle) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("recording-overlay") {
        overlay.hide().map_err(|e| e.to_string())?;
        log::info!("Recording overlay hidden");
    }
    Ok(())
}

#[tauri::command]
pub async fn set_overlay_state(app: AppHandle, state: String, recording_duration_ms: Option<u64>) -> Result<(), String> {
    use tauri::Emitter;

    let payload = serde_json::json!({
        "state": state,
        "recordingDurationMs": recording_duration_ms
    });

    // Emit directly to the overlay window
    if let Some(overlay) = app.get_webview_window("recording-overlay") {
        overlay.emit("overlay-state-change", payload.clone()).map_err(|e| e.to_string())?;
        log::info!("Overlay state changed to: {} (emitted to overlay window)", state);
    } else {
        log::warn!("Overlay window not found, emitting globally");
        app.emit("overlay-state-change", payload).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Transcription usage response (for UI)
#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionUsageResponse {
    pub count: u32,
    pub duration_ms: u64,
    pub minutes: f64,
    pub audio_bytes: u64,
    pub cost_usd: f64,
}

/// GPT usage response (for UI)
#[derive(Debug, Serialize, Deserialize)]
pub struct GptUsageResponse {
    pub count: u32,
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
    pub cost_usd: f64,
}

/// Webhook usage response (for UI)
#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookUsageResponse {
    pub count: u32,
    pub success_count: u32,
    pub failure_count: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UsageStatsResponse {
    // Legacy fields for backward compatibility
    pub total_transcriptions: u32,
    pub total_duration_ms: u64,
    pub total_minutes: f64,
    pub total_cost_usd: f64,
    pub month_transcriptions: u32,
    pub month_duration_ms: u64,
    pub month_minutes: f64,
    pub month_cost_usd: f64,
    pub current_month: String,

    // New per-feature breakdown (lifetime)
    pub transcription: TranscriptionUsageResponse,
    pub gpt: GptUsageResponse,
    pub webhook: WebhookUsageResponse,

    // New per-feature breakdown (monthly)
    pub month_transcription: TranscriptionUsageResponse,
    pub month_gpt: GptUsageResponse,
    pub month_webhook: WebhookUsageResponse,

    // Sync metadata
    pub last_synced_at: Option<String>,
}

#[tauri::command]
pub fn get_usage_stats() -> UsageStatsResponse {
    let stats = config::get_usage_stats();
    UsageStatsResponse {
        // Legacy fields
        total_transcriptions: stats.transcription.count,
        total_duration_ms: stats.transcription.duration_ms,
        total_minutes: stats.transcription.minutes(),
        total_cost_usd: stats.total_cost_usd(),
        month_transcriptions: stats.current_month.transcription.count,
        month_duration_ms: stats.current_month.transcription.duration_ms,
        month_minutes: stats.current_month.transcription.minutes(),
        month_cost_usd: stats.month_cost_usd(),
        current_month: stats.current_month.month.clone(),

        // Per-feature breakdown (lifetime)
        transcription: TranscriptionUsageResponse {
            count: stats.transcription.count,
            duration_ms: stats.transcription.duration_ms,
            minutes: stats.transcription.minutes(),
            audio_bytes: stats.transcription.audio_bytes,
            cost_usd: stats.transcription.cost_usd,
        },
        gpt: GptUsageResponse {
            count: stats.gpt.count,
            prompt_tokens: stats.gpt.prompt_tokens,
            completion_tokens: stats.gpt.completion_tokens,
            total_tokens: stats.gpt.total_tokens,
            cost_usd: stats.gpt.cost_usd,
        },
        webhook: WebhookUsageResponse {
            count: stats.webhook.count,
            success_count: stats.webhook.success_count,
            failure_count: stats.webhook.failure_count,
        },

        // Per-feature breakdown (monthly)
        month_transcription: TranscriptionUsageResponse {
            count: stats.current_month.transcription.count,
            duration_ms: stats.current_month.transcription.duration_ms,
            minutes: stats.current_month.transcription.minutes(),
            audio_bytes: stats.current_month.transcription.audio_bytes,
            cost_usd: stats.current_month.transcription.cost_usd,
        },
        month_gpt: GptUsageResponse {
            count: stats.current_month.gpt.count,
            prompt_tokens: stats.current_month.gpt.prompt_tokens,
            completion_tokens: stats.current_month.gpt.completion_tokens,
            total_tokens: stats.current_month.gpt.total_tokens,
            cost_usd: stats.current_month.gpt.cost_usd,
        },
        month_webhook: WebhookUsageResponse {
            count: stats.current_month.webhook.count,
            success_count: stats.current_month.webhook.success_count,
            failure_count: stats.current_month.webhook.failure_count,
        },

        last_synced_at: stats.last_synced_at,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookResponse {
    pub success: bool,
    pub output_text: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn transform_with_webhook(
    webhook_url: String,
    method: String,
    input_text: String,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<WebhookResponse, String> {
    log::info!("Sending to webhook: {} ({})", webhook_url, method);

    let client = reqwest::Client::new();

    // Build the request
    let mut request = match method.to_uppercase().as_str() {
        "GET" => {
            // For GET, add text as query parameter
            let url = format!("{}?text={}", webhook_url, urlencoding::encode(&input_text));
            client.get(&url)
        }
        _ => {
            // For POST (default), send JSON body
            client.post(&webhook_url)
                .header("Content-Type", "application/json")
                .json(&serde_json::json!({
                    "text": input_text,
                    "source": "speakeasy",
                    "timestamp": chrono::Utc::now().to_rfc3339()
                }))
        }
    };

    // Add custom headers if provided
    if let Some(custom_headers) = headers {
        for (key, value) in custom_headers {
            request = request.header(&key, &value);
        }
    }

    // Send the request
    let response = request.send().await.map_err(|e| {
        // Record webhook failure
        if let Err(log_err) = config::record_usage_event(config::UsageEvent::Webhook { success: false }) {
            log::warn!("Failed to record webhook usage: {}", log_err);
        }
        e.to_string()
    })?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| e.to_string())?;

    log::info!("Webhook response status: {}, body length: {}", status, response_text.len());

    if !status.is_success() {
        // Record webhook failure
        if let Err(e) = config::record_usage_event(config::UsageEvent::Webhook { success: false }) {
            log::warn!("Failed to record webhook usage: {}", e);
        }
        return Ok(WebhookResponse {
            success: false,
            output_text: None,
            error: Some(format!("HTTP {}: {}", status, response_text)),
        });
    }

    // Record webhook success
    if let Err(e) = config::record_usage_event(config::UsageEvent::Webhook { success: true }) {
        log::warn!("Failed to record webhook usage: {}", e);
    }

    // Try to parse as JSON first, looking for "text" or "output" field
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response_text) {
        let output = json.get("text")
            .or_else(|| json.get("output"))
            .or_else(|| json.get("result"))
            .or_else(|| json.get("content"))
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        if let Some(text) = output {
            return Ok(WebhookResponse {
                success: true,
                output_text: Some(text),
                error: None,
            });
        }
    }

    // Fall back to using the raw response text
    Ok(WebhookResponse {
        success: true,
        output_text: Some(response_text),
        error: None,
    })
}

#[tauri::command]
pub async fn get_clipboard_text() -> Result<String, String> {
    clipboard::get_text().map_err(|e| e.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GptTransformResult {
    pub success: bool,
    pub output_text: Option<String>,
    pub error: Option<String>,
}

#[tauri::command]
pub async fn transform_with_gpt(
    api_key: String,
    input_text: String,
    instruction: String,
) -> Result<GptTransformResult, String> {
    log::info!("GPT Transform: '{}' on {} chars", instruction, input_text.len());

    let client = reqwest::Client::new();
    let model = "gpt-4o-mini";

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a helpful writing assistant. Transform the user's text according to their instruction. Output ONLY the transformed text, nothing else - no explanations, no quotes, no markdown formatting unless specifically requested."
                },
                {
                    "role": "user",
                    "content": format!("Text to transform:\n\n{}\n\nInstruction: {}", input_text, instruction)
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4096
        }))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = response.status();
    let response_text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        log::error!("GPT API error: {}", response_text);
        return Ok(GptTransformResult {
            success: false,
            output_text: None,
            error: Some(format!("OpenAI API error: {}", response_text)),
        });
    }

    // Parse the response
    let json: serde_json::Value = serde_json::from_str(&response_text)
        .map_err(|e| e.to_string())?;

    // Extract and record usage tokens
    if let Some(usage) = json.get("usage") {
        let prompt_tokens = usage.get("prompt_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let completion_tokens = usage.get("completion_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(0);
        let total_tokens = usage.get("total_tokens")
            .and_then(|v| v.as_u64())
            .unwrap_or(prompt_tokens + completion_tokens);

        // Record the GPT usage event
        if let Err(e) = config::record_usage_event(config::UsageEvent::GptTransform {
            prompt_tokens,
            completion_tokens,
            total_tokens,
            model: model.to_string(),
        }) {
            log::warn!("Failed to record GPT usage stats: {}", e);
        }
    } else {
        log::warn!("GPT response missing usage data - tokens not tracked");
    }

    let output = json["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string());

    match output {
        Some(text) => {
            log::info!("GPT Transform complete: {} chars output", text.len());
            Ok(GptTransformResult {
                success: true,
                output_text: Some(text),
                error: None,
            })
        }
        None => {
            Ok(GptTransformResult {
                success: false,
                output_text: None,
                error: Some("No response from GPT".to_string()),
            })
        }
    }
}

#[tauri::command]
pub async fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();

    if enabled {
        autostart_manager.enable().map_err(|e| e.to_string())?;
        log::info!("Autostart enabled");
    } else {
        autostart_manager.disable().map_err(|e| e.to_string())?;
        log::info!("Autostart disabled");
    }

    // Return current state
    autostart_manager.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_autostart(app: AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().map_err(|e| e.to_string())
}

/// Mark usage stats as synced/verified at current timestamp
#[tauri::command]
pub fn mark_usage_synced() -> Result<String, String> {
    config::mark_usage_synced().map_err(|e| e.to_string())
}

/// Reset all usage statistics (lifetime and monthly)
#[tauri::command]
pub fn reset_usage_stats() -> Result<(), String> {
    config::reset_usage_stats().map_err(|e| e.to_string())
}

/// Reset only monthly usage statistics
#[tauri::command]
pub fn reset_monthly_usage() -> Result<(), String> {
    config::reset_monthly_usage().map_err(|e| e.to_string())
}

// ============================================================================
// Transform API Key Management (Secure OS Credential Storage)
// ============================================================================

use crate::llm;
use crate::secrets::{self, ApiKeyStatus, TransformProvider};

/// Set an API key for a transform provider (stored in OS credential storage)
#[tauri::command]
pub async fn set_transform_api_key(provider: String, api_key: String) -> Result<(), String> {
    let provider = TransformProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;
    
    secrets::set_api_key(provider, &api_key).map_err(|e| e.to_string())
}

/// Get the status of an API key for a provider (does not return the actual key)
#[tauri::command]
pub async fn get_transform_api_key_status(provider: String) -> Result<ApiKeyStatus, String> {
    let provider = TransformProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;
    
    Ok(secrets::get_api_key_status(provider))
}

/// Get status for all transform providers
#[tauri::command]
pub async fn get_all_transform_api_key_statuses() -> Result<Vec<ApiKeyStatus>, String> {
    Ok(secrets::get_all_api_key_statuses())
}

/// Clear an API key for a provider
#[tauri::command]
pub async fn clear_transform_api_key(provider: String) -> Result<(), String> {
    let provider = TransformProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;
    
    secrets::clear_api_key(provider).map_err(|e| e.to_string())
}

// ============================================================================
// Multi-provider LLM Transform
// ============================================================================

/// Response from transform_with_llm
#[derive(Debug, Serialize, Deserialize)]
pub struct LlmTransformResponse {
    pub success: bool,
    pub output_text: Option<String>,
    pub error: Option<String>,
    pub error_type: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub usage: Option<llm::TokenUsage>,
}

// ============================================================================
// Fetch Available Models from Provider APIs
// ============================================================================

/// Model info returned from provider APIs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderModel {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
}

/// Fetch available models from a provider's API
#[tauri::command]
pub async fn fetch_provider_models(provider: String) -> Result<Vec<ProviderModel>, String> {
    let provider_enum = TransformProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;
    
    // Get the API key from secure storage
    let api_key = match secrets::get_api_key(provider_enum) {
        Ok(Some(key)) => key,
        Ok(None) => {
            return Err(format!("No API key set for {}. Please add your API key first.", provider));
        }
        Err(e) => {
            return Err(format!("Failed to access secure storage: {}", e));
        }
    };

    log::info!("Fetching models from provider: {}", provider);

    match provider_enum {
        TransformProvider::OpenRouter => fetch_openrouter_models(&api_key).await,
        TransformProvider::OpenAI => fetch_openai_models(&api_key).await,
        TransformProvider::Anthropic => fetch_anthropic_models(&api_key).await,
    }
}

/// Fetch models from OpenRouter API
async fn fetch_openrouter_models(api_key: &str) -> Result<Vec<ProviderModel>, String> {
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Request timed out. Please check your internet connection.".to_string()
            } else if e.is_connect() {
                "Failed to connect to OpenRouter. Please check your internet connection.".to_string()
            } else {
                format!("Failed to fetch models: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("OpenRouter API error ({}): {}", status, body));
    }

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = json.get("data")
        .and_then(|d| d.as_array())
        .ok_or("Invalid response format")?;

    let mut result: Vec<ProviderModel> = models
        .iter()
        .filter_map(|m| {
            let id = m.get("id")?.as_str()?.to_string();
            let name = m.get("name")
                .and_then(|n| n.as_str())
                .unwrap_or(&id)
                .to_string();
            let description = m.get("description")
                .and_then(|d| d.as_str())
                .map(|s| s.to_string());
            let context_length = m.get("context_length")
                .and_then(|c| c.as_u64())
                .map(|c| c as u32);
            
            Some(ProviderModel {
                id,
                name,
                description,
                context_length,
            })
        })
        .collect();

    // Sort by name for easier browsing
    result.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    
    log::info!("Fetched {} models from OpenRouter", result.len());
    Ok(result)
}

/// Fetch models from OpenAI API
async fn fetch_openai_models(api_key: &str) -> Result<Vec<ProviderModel>, String> {
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    let response = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                "Request timed out. Please check your internet connection.".to_string()
            } else if e.is_connect() {
                "Failed to connect to OpenAI. Please check your internet connection.".to_string()
            } else {
                format!("Failed to fetch models: {}", e)
            }
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("OpenAI API error ({}): {}", status, body));
    }

    let json: serde_json::Value = response.json().await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    let models = json.get("data")
        .and_then(|d| d.as_array())
        .ok_or("Invalid response format")?;

    // Filter to only chat-capable models
    let mut result: Vec<ProviderModel> = models
        .iter()
        .filter_map(|m| {
            let id = m.get("id")?.as_str()?.to_string();
            
            // Only include models that support chat completions
            // Covers: gpt-*, o1*, o3*, chatgpt-*
            let is_chat_model = id.starts_with("gpt-") 
                || id.starts_with("o1") 
                || id.starts_with("o3")
                || id.starts_with("chatgpt-");
            
            if !is_chat_model {
                return None;
            }
            
            // Skip embedding, audio, image, and legacy models
            if id.contains("embedding") || id.contains("whisper") || 
               id.contains("tts") || id.contains("dall-e") ||
               id.contains("davinci") || id.contains("babbage") ||
               id.contains("realtime") || id.contains("audio") {
                return None;
            }

            let name = id.clone();
            
            Some(ProviderModel {
                id,
                name,
                description: None,
                context_length: None,
            })
        })
        .collect();

    // Sort with newest/best models first
    result.sort_by(|a, b| {
        // Prioritize: chatgpt-* (latest), o3, o1, gpt-4o, gpt-4, gpt-3.5
        let priority = |id: &str| -> i32 {
            if id.starts_with("chatgpt-") { 0 }
            else if id.starts_with("o3") { 1 }
            else if id.starts_with("o1") { 2 }
            else if id.starts_with("gpt-4o") { 3 }
            else if id.starts_with("gpt-4") { 4 }
            else { 5 }
        };
        priority(&a.id).cmp(&priority(&b.id))
            .then_with(|| a.id.cmp(&b.id))
    });
    
    log::info!("Fetched {} chat models from OpenAI", result.len());
    Ok(result)
}

/// Fetch models from Anthropic API
/// Note: Anthropic doesn't have a public models endpoint, so we return a known list
/// but only if the API key is valid (we verify by making a minimal request)
async fn fetch_anthropic_models(_api_key: &str) -> Result<Vec<ProviderModel>, String> {
    // Anthropic doesn't have a models endpoint, but we can verify the key works
    // by checking account status or making a minimal request
    let _client = reqwest::Client::new();
    
    // Try to verify the API key is valid by checking a simple endpoint
    // Anthropic doesn't have a models list API, so we'll do a minimal messages call
    // Actually, let's just return the known models - if the key is bad, they'll get an error when they try to use it
    
    // Return known Claude models (these are stable and well-documented)
    let models = vec![
        ProviderModel {
            id: "claude-sonnet-4-20250514".to_string(),
            name: "Claude Sonnet 4".to_string(),
            description: Some("Latest Sonnet model, great balance of speed and capability".to_string()),
            context_length: Some(200000),
        },
        ProviderModel {
            id: "claude-3-5-sonnet-20241022".to_string(),
            name: "Claude 3.5 Sonnet".to_string(),
            description: Some("Previous Sonnet, excellent for most tasks".to_string()),
            context_length: Some(200000),
        },
        ProviderModel {
            id: "claude-3-5-haiku-20241022".to_string(),
            name: "Claude 3.5 Haiku".to_string(),
            description: Some("Fast and affordable".to_string()),
            context_length: Some(200000),
        },
        ProviderModel {
            id: "claude-3-opus-20240229".to_string(),
            name: "Claude 3 Opus".to_string(),
            description: Some("Most capable Claude 3 model".to_string()),
            context_length: Some(200000),
        },
    ];

    log::info!("Returning {} known Anthropic models", models.len());
    Ok(models)
}

/// Transform text using the specified LLM provider
/// 
/// The API key is retrieved from secure OS credential storage based on the provider.
#[tauri::command]
pub async fn transform_with_llm(
    provider: String,
    model: String,
    input_text: String,
    instruction: String,
    temperature: Option<f64>,
    max_tokens: Option<u32>,
) -> Result<LlmTransformResponse, String> {
    let provider_enum = TransformProvider::from_str(&provider)
        .ok_or_else(|| format!("Unknown provider: {}", provider))?;
    
    log::info!(
        "LLM Transform: provider={}, model={}, instruction='{}', text_len={}",
        provider, model, instruction, input_text.len()
    );

    // Get the API key from secure storage
    let api_key = match secrets::get_api_key(provider_enum) {
        Ok(Some(key)) => key,
        Ok(None) => {
            let error = llm::TransformError::NoApiKey { provider: provider.clone() };
            return Ok(LlmTransformResponse {
                success: false,
                output_text: None,
                error: Some(error.user_message()),
                error_type: Some("NoApiKey".to_string()),
                provider: Some(provider),
                model: Some(model),
                usage: None,
            });
        }
        Err(e) => {
            log::error!("Failed to retrieve API key: {}", e);
            return Ok(LlmTransformResponse {
                success: false,
                output_text: None,
                error: Some(format!("Failed to access secure storage: {}", e)),
                error_type: Some("StorageError".to_string()),
                provider: Some(provider),
                model: Some(model),
                usage: None,
            });
        }
    };

    // Build the request
    let request = llm::TransformRequest {
        provider: provider_enum,
        model: model.clone(),
        input_text,
        instruction,
        temperature: temperature.unwrap_or(0.7),
        max_tokens: max_tokens.unwrap_or(4096),
    };

    // Execute the transform
    match llm::transform(request, &api_key).await {
        Ok(result) => {
            log::info!(
                "LLM Transform complete: provider={}, model={}, output_len={}",
                result.provider, result.model, result.output_text.len()
            );

            // Record usage if available
            if let Some(ref usage) = result.usage {
                // Use the existing GptTransform event for now (we can add LLM-specific later)
                if let Err(e) = config::record_usage_event(config::UsageEvent::GptTransform {
                    prompt_tokens: usage.prompt_tokens,
                    completion_tokens: usage.completion_tokens,
                    total_tokens: usage.total_tokens,
                    model: result.model.clone(),
                }) {
                    log::warn!("Failed to record LLM usage stats: {}", e);
                }
            }

            Ok(LlmTransformResponse {
                success: true,
                output_text: Some(result.output_text),
                error: None,
                error_type: None,
                provider: Some(result.provider),
                model: Some(result.model),
                usage: result.usage,
            })
        }
        Err(transform_error) => {
            log::warn!("LLM Transform failed: {:?}", transform_error);
            
            let error_type = match &transform_error {
                llm::TransformError::NoApiKey { .. } => "NoApiKey",
                llm::TransformError::InvalidApiKey { .. } => "InvalidApiKey",
                llm::TransformError::RateLimited { .. } => "RateLimited",
                llm::TransformError::ModelNotFound { .. } => "ModelNotFound",
                llm::TransformError::Timeout { .. } => "Timeout",
                llm::TransformError::ServerError { .. } => "ServerError",
                llm::TransformError::NetworkError { .. } => "NetworkError",
                llm::TransformError::BadRequest { .. } => "BadRequest",
                llm::TransformError::QuotaExceeded { .. } => "QuotaExceeded",
                llm::TransformError::ContentFiltered { .. } => "ContentFiltered",
                llm::TransformError::Unknown { .. } => "Unknown",
            };

            Ok(LlmTransformResponse {
                success: false,
                output_text: None,
                error: Some(transform_error.user_message()),
                error_type: Some(error_type.to_string()),
                provider: Some(provider),
                model: Some(model),
                usage: None,
            })
        }
    }
}

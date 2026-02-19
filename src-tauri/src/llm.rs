//! LLM provider adapters for the Transform feature.
//!
//! This module provides a unified interface to multiple LLM providers:
//! - OpenRouter (OpenAI-compatible, accesses many models)
//! - OpenAI (direct)
//! - Anthropic (direct, Claude models)
//!
//! All providers normalize errors to a consistent format and handle timeouts.

use crate::secrets::TransformProvider;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Default timeout for LLM API requests (30 seconds)
const DEFAULT_TIMEOUT_SECS: u64 = 60;

/// Default max tokens for responses
const DEFAULT_MAX_TOKENS: u32 = 4096;

/// Default temperature
const DEFAULT_TEMPERATURE: f64 = 0.7;

/// System prompt for text transformation
const TRANSFORM_SYSTEM_PROMPT: &str = "You are a helpful writing assistant. Transform the user's text according to their instruction. Output ONLY the transformed text, nothing else - no explanations, no quotes, no markdown formatting unless specifically requested.";

/// Request parameters for LLM transformation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformRequest {
    pub provider: TransformProvider,
    pub model: String,
    pub input_text: String,
    pub instruction: String,
    #[serde(default = "default_temperature")]
    pub temperature: f64,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

fn default_temperature() -> f64 {
    DEFAULT_TEMPERATURE
}

fn default_max_tokens() -> u32 {
    DEFAULT_MAX_TOKENS
}

/// Successful transform result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformResult {
    pub output_text: String,
    pub model: String,
    pub provider: String,
    /// Token usage if available
    pub usage: Option<TokenUsage>,
}

/// Token usage information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u64,
    pub completion_tokens: u64,
    pub total_tokens: u64,
}

/// Normalized error types across all providers
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "details")]
pub enum TransformError {
    /// API key is missing or not set
    NoApiKey { provider: String },
    /// API key is invalid (401/403)
    InvalidApiKey { provider: String, message: String },
    /// Rate limit exceeded (429)
    RateLimited {
        provider: String,
        retry_after: Option<u64>,
    },
    /// Model not found or not available
    ModelNotFound { provider: String, model: String },
    /// Request timed out
    Timeout { provider: String, timeout_secs: u64 },
    /// Server error (5xx)
    ServerError {
        provider: String,
        status: u16,
        message: String,
    },
    /// Network/connection error
    NetworkError { provider: String, message: String },
    /// Invalid request (400)
    BadRequest { provider: String, message: String },
    /// Quota exceeded / billing issue
    QuotaExceeded { provider: String, message: String },
    /// Content filtered / safety
    ContentFiltered { provider: String, message: String },
    /// Unknown error
    Unknown { provider: String, message: String },
}

impl TransformError {
    /// Get a user-friendly error message
    pub fn user_message(&self) -> String {
        match self {
            TransformError::NoApiKey { provider } => {
                format!(
                    "No API key set for {}. Please add your API key in Settings.",
                    provider
                )
            }
            TransformError::InvalidApiKey { provider, .. } => {
                format!(
                    "Invalid API key for {}. Please check your API key in Settings.",
                    provider
                )
            }
            TransformError::RateLimited {
                provider,
                retry_after,
            } => match retry_after {
                Some(secs) => format!(
                    "{} rate limit reached. Please wait {} seconds.",
                    provider, secs
                ),
                None => format!("{} rate limit reached. Please try again later.", provider),
            },
            TransformError::ModelNotFound { provider, model } => {
                format!(
                    "Model '{}' not found on {}. Please select a different model.",
                    model, provider
                )
            }
            TransformError::Timeout {
                provider,
                timeout_secs,
            } => {
                format!(
                    "{} request timed out after {} seconds. Please try again.",
                    provider, timeout_secs
                )
            }
            TransformError::ServerError {
                provider, status, ..
            } => {
                format!(
                    "{} server error ({}). Please try again later.",
                    provider, status
                )
            }
            TransformError::NetworkError { provider, .. } => {
                format!(
                    "Network error connecting to {}. Please check your connection.",
                    provider
                )
            }
            TransformError::BadRequest { provider, message } => {
                format!("{} rejected the request: {}", provider, message)
            }
            TransformError::QuotaExceeded { provider, .. } => {
                format!(
                    "{} quota exceeded. Please check your billing/usage limits.",
                    provider
                )
            }
            TransformError::ContentFiltered { provider, .. } => {
                format!(
                    "{} filtered the content. The text may violate usage policies.",
                    provider
                )
            }
            TransformError::Unknown { provider, message } => {
                format!("{} error: {}", provider, message)
            }
        }
    }
}

impl std::fmt::Display for TransformError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.user_message())
    }
}

impl std::error::Error for TransformError {}

/// Execute a transform request using the appropriate provider
pub async fn transform(
    request: TransformRequest,
    api_key: &str,
) -> Result<TransformResult, TransformError> {
    match request.provider {
        TransformProvider::OpenRouter => transform_openrouter(request, api_key).await,
        TransformProvider::OpenAI => transform_openai(request, api_key).await,
        TransformProvider::Anthropic => transform_anthropic(request, api_key).await,
    }
}

/// OpenRouter provider (OpenAI-compatible API)
async fn transform_openrouter(
    request: TransformRequest,
    api_key: &str,
) -> Result<TransformResult, TransformError> {
    let provider = "OpenRouter";
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .build()
        .map_err(|e| TransformError::NetworkError {
            provider: provider.to_string(),
            message: e.to_string(),
        })?;

    let user_content = if request.input_text.is_empty() {
        request.instruction.clone()
    } else {
        format!(
            "Text to transform:\n\n{}\n\nInstruction: {}",
            request.input_text, request.instruction
        )
    };

    let body = serde_json::json!({
        "model": request.model,
        "messages": [
            { "role": "system", "content": TRANSFORM_SYSTEM_PROMPT },
            { "role": "user", "content": user_content }
        ],
        "temperature": request.temperature,
        "max_tokens": request.max_tokens
    });

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .header("HTTP-Referer", "https://speakeasy.app")
        .header("X-Title", "SpeakEasy")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                TransformError::Timeout {
                    provider: provider.to_string(),
                    timeout_secs: DEFAULT_TIMEOUT_SECS,
                }
            } else if e.is_connect() {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: "Failed to connect".to_string(),
                }
            } else {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: e.to_string(),
                }
            }
        })?;

    parse_openai_response(response, provider, &request.model).await
}

/// OpenAI provider (direct API)
async fn transform_openai(
    request: TransformRequest,
    api_key: &str,
) -> Result<TransformResult, TransformError> {
    let provider = "OpenAI";
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .build()
        .map_err(|e| TransformError::NetworkError {
            provider: provider.to_string(),
            message: e.to_string(),
        })?;

    let user_content = if request.input_text.is_empty() {
        request.instruction.clone()
    } else {
        format!(
            "Text to transform:\n\n{}\n\nInstruction: {}",
            request.input_text, request.instruction
        )
    };

    // OpenAI reasoning models (o1, o3 series) use max_completion_tokens instead of max_tokens
    let is_reasoning_model = request.model.starts_with("o1") || request.model.starts_with("o3");

    let body = if is_reasoning_model {
        serde_json::json!({
            "model": request.model,
            "messages": [
                { "role": "system", "content": TRANSFORM_SYSTEM_PROMPT },
                { "role": "user", "content": user_content }
            ],
            "max_completion_tokens": request.max_tokens
        })
    } else {
        serde_json::json!({
            "model": request.model,
            "messages": [
                { "role": "system", "content": TRANSFORM_SYSTEM_PROMPT },
                { "role": "user", "content": user_content }
            ],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        })
    };

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                TransformError::Timeout {
                    provider: provider.to_string(),
                    timeout_secs: DEFAULT_TIMEOUT_SECS,
                }
            } else if e.is_connect() {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: "Failed to connect".to_string(),
                }
            } else {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: e.to_string(),
                }
            }
        })?;

    parse_openai_response(response, provider, &request.model).await
}

/// Parse OpenAI-compatible response (works for OpenAI and OpenRouter)
async fn parse_openai_response(
    response: reqwest::Response,
    provider: &str,
    model: &str,
) -> Result<TransformResult, TransformError> {
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| TransformError::NetworkError {
            provider: provider.to_string(),
            message: format!("Failed to read response: {}", e),
        })?;

    // Log response for debugging (without sensitive data)
    log::debug!(
        "{} response status: {}, body length: {}",
        provider,
        status,
        response_text.len()
    );

    if !status.is_success() {
        return Err(parse_openai_error(
            status.as_u16(),
            &response_text,
            provider,
            model,
        ));
    }

    let json: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|e| TransformError::Unknown {
            provider: provider.to_string(),
            message: format!("Invalid JSON response: {}", e),
        })?;

    // Extract output text
    let output_text = json["choices"][0]["message"]["content"]
        .as_str()
        .ok_or_else(|| TransformError::Unknown {
            provider: provider.to_string(),
            message: "No content in response".to_string(),
        })?
        .to_string();

    // Extract usage if present
    let usage = json.get("usage").and_then(|u| {
        Some(TokenUsage {
            prompt_tokens: u.get("prompt_tokens")?.as_u64()?,
            completion_tokens: u.get("completion_tokens")?.as_u64()?,
            total_tokens: u.get("total_tokens")?.as_u64()?,
        })
    });

    Ok(TransformResult {
        output_text,
        model: model.to_string(),
        provider: provider.to_string(),
        usage,
    })
}

/// Parse OpenAI-style error response
fn parse_openai_error(status: u16, body: &str, provider: &str, model: &str) -> TransformError {
    let error_message = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("error")?.get("message")?.as_str().map(String::from))
        .unwrap_or_else(|| body.to_string());

    match status {
        401 => TransformError::InvalidApiKey {
            provider: provider.to_string(),
            message: error_message,
        },
        403 => {
            if error_message.to_lowercase().contains("quota")
                || error_message.to_lowercase().contains("billing")
            {
                TransformError::QuotaExceeded {
                    provider: provider.to_string(),
                    message: error_message,
                }
            } else {
                TransformError::InvalidApiKey {
                    provider: provider.to_string(),
                    message: error_message,
                }
            }
        }
        404 => TransformError::ModelNotFound {
            provider: provider.to_string(),
            model: model.to_string(),
        },
        429 => TransformError::RateLimited {
            provider: provider.to_string(),
            retry_after: None,
        },
        400 => {
            if error_message.to_lowercase().contains("content")
                || error_message.to_lowercase().contains("safety")
                || error_message.to_lowercase().contains("filter")
            {
                TransformError::ContentFiltered {
                    provider: provider.to_string(),
                    message: error_message,
                }
            } else {
                TransformError::BadRequest {
                    provider: provider.to_string(),
                    message: error_message,
                }
            }
        }
        500..=599 => TransformError::ServerError {
            provider: provider.to_string(),
            status,
            message: error_message,
        },
        _ => TransformError::Unknown {
            provider: provider.to_string(),
            message: format!("HTTP {}: {}", status, error_message),
        },
    }
}

/// Anthropic provider (Messages API)
async fn transform_anthropic(
    request: TransformRequest,
    api_key: &str,
) -> Result<TransformResult, TransformError> {
    let provider = "Anthropic";
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .build()
        .map_err(|e| TransformError::NetworkError {
            provider: provider.to_string(),
            message: e.to_string(),
        })?;

    let user_content = if request.input_text.is_empty() {
        request.instruction.clone()
    } else {
        format!(
            "Text to transform:\n\n{}\n\nInstruction: {}",
            request.input_text, request.instruction
        )
    };

    let body = serde_json::json!({
        "model": request.model,
        "max_tokens": request.max_tokens,
        "system": TRANSFORM_SYSTEM_PROMPT,
        "messages": [
            { "role": "user", "content": user_content }
        ]
    });

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                TransformError::Timeout {
                    provider: provider.to_string(),
                    timeout_secs: DEFAULT_TIMEOUT_SECS,
                }
            } else if e.is_connect() {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: "Failed to connect".to_string(),
                }
            } else {
                TransformError::NetworkError {
                    provider: provider.to_string(),
                    message: e.to_string(),
                }
            }
        })?;

    parse_anthropic_response(response, provider, &request.model).await
}

/// Parse Anthropic Messages API response
async fn parse_anthropic_response(
    response: reqwest::Response,
    provider: &str,
    model: &str,
) -> Result<TransformResult, TransformError> {
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| TransformError::NetworkError {
            provider: provider.to_string(),
            message: format!("Failed to read response: {}", e),
        })?;

    log::debug!(
        "{} response status: {}, body length: {}",
        provider,
        status,
        response_text.len()
    );

    if !status.is_success() {
        return Err(parse_anthropic_error(
            status.as_u16(),
            &response_text,
            provider,
            model,
        ));
    }

    let json: serde_json::Value =
        serde_json::from_str(&response_text).map_err(|e| TransformError::Unknown {
            provider: provider.to_string(),
            message: format!("Invalid JSON response: {}", e),
        })?;

    // Anthropic response format: content[0].text
    let output_text = json["content"][0]["text"]
        .as_str()
        .ok_or_else(|| TransformError::Unknown {
            provider: provider.to_string(),
            message: "No content in response".to_string(),
        })?
        .to_string();

    // Extract usage if present
    let usage = json.get("usage").and_then(|u| {
        Some(TokenUsage {
            prompt_tokens: u.get("input_tokens")?.as_u64()?,
            completion_tokens: u.get("output_tokens")?.as_u64()?,
            total_tokens: u.get("input_tokens")?.as_u64()? + u.get("output_tokens")?.as_u64()?,
        })
    });

    Ok(TransformResult {
        output_text,
        model: model.to_string(),
        provider: provider.to_string(),
        usage,
    })
}

/// Parse Anthropic error response
fn parse_anthropic_error(status: u16, body: &str, provider: &str, model: &str) -> TransformError {
    let error_message = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("error")?.get("message")?.as_str().map(String::from))
        .unwrap_or_else(|| body.to_string());

    match status {
        401 => TransformError::InvalidApiKey {
            provider: provider.to_string(),
            message: error_message,
        },
        403 => TransformError::QuotaExceeded {
            provider: provider.to_string(),
            message: error_message,
        },
        404 => TransformError::ModelNotFound {
            provider: provider.to_string(),
            model: model.to_string(),
        },
        429 => TransformError::RateLimited {
            provider: provider.to_string(),
            retry_after: None,
        },
        400 => {
            if error_message.to_lowercase().contains("content")
                || error_message.to_lowercase().contains("safety")
            {
                TransformError::ContentFiltered {
                    provider: provider.to_string(),
                    message: error_message,
                }
            } else {
                TransformError::BadRequest {
                    provider: provider.to_string(),
                    message: error_message,
                }
            }
        }
        500..=599 => TransformError::ServerError {
            provider: provider.to_string(),
            status,
            message: error_message,
        },
        _ => TransformError::Unknown {
            provider: provider.to_string(),
            message: format!("HTTP {}: {}", status, error_message),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transform_error_messages() {
        let err = TransformError::NoApiKey {
            provider: "OpenAI".to_string(),
        };
        assert!(err.user_message().contains("No API key"));

        let err = TransformError::RateLimited {
            provider: "OpenRouter".to_string(),
            retry_after: Some(30),
        };
        assert!(err.user_message().contains("30 seconds"));

        let err = TransformError::ModelNotFound {
            provider: "Anthropic".to_string(),
            model: "claude-unknown".to_string(),
        };
        assert!(err.user_message().contains("claude-unknown"));
    }

    #[test]
    fn test_default_values() {
        assert_eq!(default_temperature(), 0.7);
        assert_eq!(default_max_tokens(), 4096);
    }
}

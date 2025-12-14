use anyhow::Result;
use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
pub struct TranscriptionResponse {
    pub text: String,
    pub language: String,
    pub duration_ms: u32,
}

/// OpenAI Whisper API response
#[derive(Debug, Deserialize)]
struct WhisperResponse {
    text: String,
}

// Whisper API max file size is 25MB
const MAX_WHISPER_FILE_SIZE: usize = 25 * 1024 * 1024;
// Chunk size for splitting long audio (10 minutes at 16kHz mono 16-bit = ~19MB)
const CHUNK_DURATION_SECONDS: u32 = 600; // 10 minutes per chunk
// Retry configuration
const MAX_RETRIES: u32 = 5;
const INITIAL_RETRY_DELAY_MS: u64 = 1000;
const MAX_RETRY_DELAY_MS: u64 = 30000;

/// Create a reqwest client with generous timeouts and keep-alive
fn create_client() -> reqwest::Client {
    reqwest::Client::builder()
        // Very generous timeout for large files - 15 minutes per request
        .timeout(Duration::from_secs(900))
        // Connection timeout
        .connect_timeout(Duration::from_secs(60))
        // Keep connections alive
        .pool_idle_timeout(Duration::from_secs(90))
        .pool_max_idle_per_host(2)
        // TCP keepalive
        .tcp_keepalive(Duration::from_secs(60))
        // Don't fail on connection reuse issues
        .http2_keep_alive_interval(Duration::from_secs(30))
        .http2_keep_alive_timeout(Duration::from_secs(20))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new())
}

/// Get the backup directory for audio files
fn get_backup_dir() -> PathBuf {
    let base = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("SpeakEasy")
        .join("audio_backup");
    std::fs::create_dir_all(&base).ok();
    base
}

/// Save audio to backup file, returns the path
fn save_audio_backup(audio_data: &[u8]) -> Option<PathBuf> {
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let filename = format!("recording_{}.wav", timestamp);
    let path = get_backup_dir().join(&filename);

    match std::fs::write(&path, audio_data) {
        Ok(_) => {
            log::info!("Audio backup saved: {:?} ({} bytes)", path, audio_data.len());
            Some(path)
        }
        Err(e) => {
            log::error!("Failed to save audio backup: {}", e);
            None
        }
    }
}

/// Delete audio backup after successful transcription
fn delete_audio_backup(path: &PathBuf) {
    if let Err(e) = std::fs::remove_file(path) {
        log::warn!("Failed to delete audio backup {:?}: {}", path, e);
    } else {
        log::info!("Audio backup deleted: {:?}", path);
    }
}

/// Clean up old backup files (older than 24 hours)
fn cleanup_old_backups() {
    let backup_dir = get_backup_dir();
    let Ok(entries) = std::fs::read_dir(&backup_dir) else { return };

    let cutoff = std::time::SystemTime::now() - Duration::from_secs(24 * 60 * 60);

    for entry in entries.flatten() {
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                if modified < cutoff {
                    if let Err(e) = std::fs::remove_file(entry.path()) {
                        log::warn!("Failed to delete old backup {:?}: {}", entry.path(), e);
                    } else {
                        log::info!("Cleaned up old backup: {:?}", entry.path());
                    }
                }
            }
        }
    }
}

/// Sleep with exponential backoff
async fn backoff_delay(attempt: u32) {
    let delay = std::cmp::min(
        INITIAL_RETRY_DELAY_MS * 2u64.pow(attempt),
        MAX_RETRY_DELAY_MS
    );
    log::info!("Retry attempt {}, waiting {}ms...", attempt + 1, delay);
    tokio::time::sleep(Duration::from_millis(delay)).await;
}

/// Calculate WAV file size for given duration at 16kHz mono 16-bit
fn wav_size_for_duration(seconds: u32) -> usize {
    // 16kHz * 2 bytes per sample * seconds + 44 byte header
    (16000 * 2 * seconds as usize) + 44
}

/// Split WAV audio data into chunks of specified duration
fn split_audio_into_chunks(audio_data: &[u8], chunk_duration_seconds: u32) -> Vec<Vec<u8>> {
    if audio_data.len() <= 44 {
        return vec![audio_data.to_vec()];
    }

    let chunk_size_bytes = wav_size_for_duration(chunk_duration_seconds) - 44; // Exclude header
    let audio_samples = &audio_data[44..]; // Skip WAV header

    if audio_samples.len() <= chunk_size_bytes {
        return vec![audio_data.to_vec()];
    }

    let mut chunks = Vec::new();
    let mut offset = 0;

    while offset < audio_samples.len() {
        let end = std::cmp::min(offset + chunk_size_bytes, audio_samples.len());
        let chunk_samples = &audio_samples[offset..end];

        // Create a new WAV with proper header for this chunk
        let mut chunk_wav = create_wav_header(chunk_samples.len() as u32);
        chunk_wav.extend_from_slice(chunk_samples);
        chunks.push(chunk_wav);

        offset = end;
    }

    log::info!("Split {} byte audio into {} chunks", audio_data.len(), chunks.len());
    chunks
}

/// Create a WAV header for given data size (16kHz mono 16-bit)
fn create_wav_header(data_size: u32) -> Vec<u8> {
    let mut header = Vec::with_capacity(44);
    let file_size = data_size + 36;

    // RIFF header
    header.extend_from_slice(b"RIFF");
    header.extend_from_slice(&file_size.to_le_bytes());
    header.extend_from_slice(b"WAVE");

    // fmt chunk
    header.extend_from_slice(b"fmt ");
    header.extend_from_slice(&16u32.to_le_bytes()); // chunk size
    header.extend_from_slice(&1u16.to_le_bytes());  // PCM format
    header.extend_from_slice(&1u16.to_le_bytes());  // mono
    header.extend_from_slice(&16000u32.to_le_bytes()); // sample rate
    header.extend_from_slice(&32000u32.to_le_bytes()); // byte rate (16000 * 2)
    header.extend_from_slice(&2u16.to_le_bytes());  // block align
    header.extend_from_slice(&16u16.to_le_bytes()); // bits per sample

    // data chunk
    header.extend_from_slice(b"data");
    header.extend_from_slice(&data_size.to_le_bytes());

    header
}

/// Check if an error is retryable
fn is_retryable_error(error: &anyhow::Error) -> bool {
    let error_str = error.to_string().to_lowercase();
    // Retry on network errors, timeouts, and server errors
    error_str.contains("timeout")
        || error_str.contains("connection")
        || error_str.contains("reset")
        || error_str.contains("broken pipe")
        || error_str.contains("sending request")
        || error_str.contains("eof")
        || error_str.contains("network")
        || error_str.contains("502")
        || error_str.contains("503")
        || error_str.contains("504")
        || error_str.contains("429") // Rate limit
}

/// Transcribe a single audio chunk with retry logic
async fn transcribe_chunk(
    client: &reqwest::Client,
    api_key: &str,
    audio_data: Vec<u8>,
    language: Option<&str>,
    chunk_index: usize,
    total_chunks: usize,
) -> Result<String> {
    log::info!("Transcribing chunk {}/{} ({} bytes)", chunk_index + 1, total_chunks, audio_data.len());

    let prompt = match language {
        Some("en") => "Clear English speech. Transcribe exactly what is said.",
        Some("es") => "Habla clara en español. Transcribe exactamente lo que se dice.",
        Some("fr") => "Parole claire en français. Transcrivez exactement ce qui est dit.",
        Some("de") => "Klare deutsche Sprache. Transkribieren Sie genau, was gesagt wird.",
        Some("it") => "Discorso chiaro in italiano. Trascrivi esattamente ciò che viene detto.",
        Some("pt") => "Fala clara em português. Transcreva exatamente o que é dito.",
        Some("ja") => "明瞭な日本語の音声。話されている内容を正確に書き起こしてください。",
        Some("ko") => "명확한 한국어 음성. 말한 내용을 정확하게 전사하세요.",
        Some("zh") => "清晰的中文语音。请准确转录所说的内容。",
        Some("ru") => "Четкая русская речь. Расшифруйте точно то, что сказано.",
        Some("nl") => "Duidelijke Nederlandse spraak. Transcribeer precies wat er wordt gezegd.",
        Some("pl") => "Wyraźna polska mowa. Przepisz dokładnie to, co zostało powiedziane.",
        Some("tl") => "Malinaw na pagsasalita sa Tagalog. I-transcribe nang eksakto ang sinabi.",
        _ => "Clear speech. Transcribe exactly what is said.",
    };

    let mut last_error: Option<anyhow::Error> = None;

    for attempt in 0..MAX_RETRIES {
        if attempt > 0 {
            backoff_delay(attempt - 1).await;
        }

        // Create fresh form for each attempt (Part is consumed)
        let audio_part = Part::bytes(audio_data.clone())
            .file_name("audio.wav")
            .mime_str("audio/wav")?;

        let mut form = Form::new()
            .part("file", audio_part)
            .text("model", "whisper-1")
            .text("prompt", prompt);

        if let Some(lang) = language {
            form = form.text("language", lang.to_string());
        }

        form = form.text("response_format", "json");

        let result = client
            .post("https://api.openai.com/v1/audio/transcriptions")
            .header("Authorization", format!("Bearer {}", api_key))
            .multipart(form)
            .send()
            .await;

        match result {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    match response.json::<WhisperResponse>().await {
                        Ok(whisper_response) => {
                            log::info!("Chunk {}/{} transcribed: {} chars (attempt {})",
                                chunk_index + 1, total_chunks, whisper_response.text.len(), attempt + 1);
                            return Ok(whisper_response.text);
                        }
                        Err(e) => {
                            let err = anyhow::anyhow!("Failed to parse response: {}", e);
                            if is_retryable_error(&err) && attempt < MAX_RETRIES - 1 {
                                log::warn!("Chunk {}/{} parse error (attempt {}): {}", chunk_index + 1, total_chunks, attempt + 1, e);
                                last_error = Some(err);
                                continue;
                            }
                            return Err(err);
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_default();
                    let err = anyhow::anyhow!("Whisper API error ({}): {}", status, error_text);

                    // Retry on 429 (rate limit), 5xx errors
                    if (status.as_u16() == 429 || status.is_server_error()) && attempt < MAX_RETRIES - 1 {
                        log::warn!("Chunk {}/{} API error (attempt {}): {} - {}", chunk_index + 1, total_chunks, attempt + 1, status, error_text);
                        last_error = Some(err);
                        continue;
                    }
                    return Err(err);
                }
            }
            Err(e) => {
                let err = anyhow::anyhow!("Request failed: {}", e);
                if is_retryable_error(&err) && attempt < MAX_RETRIES - 1 {
                    log::warn!("Chunk {}/{} request error (attempt {}): {}", chunk_index + 1, total_chunks, attempt + 1, e);
                    last_error = Some(err);
                    continue;
                }
                return Err(err);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Max retries exceeded")))
}

/// Transcribe audio directly using OpenAI Whisper API
/// Automatically splits long audio into chunks if needed
/// Saves backup to disk before transcription for recovery
pub async fn transcribe_with_whisper(
    api_key: &str,
    audio_data: Vec<u8>,
    language: Option<&str>,
) -> Result<TranscriptionResponse> {
    // Clean up old backups first
    cleanup_old_backups();

    let client = create_client();
    let total_duration_ms = calculate_duration_ms(&audio_data);

    log::info!("Starting transcription: {} bytes, {} ms duration ({:.1} minutes)",
        audio_data.len(), total_duration_ms, total_duration_ms as f64 / 60000.0);

    // Save backup for long recordings (over 1 minute)
    let backup_path = if total_duration_ms > 60000 {
        save_audio_backup(&audio_data)
    } else {
        None
    };

    let result = transcribe_with_whisper_internal(&client, api_key, audio_data, language, total_duration_ms).await;

    // Delete backup on success
    if result.is_ok() {
        if let Some(path) = backup_path {
            delete_audio_backup(&path);
        }
    } else if let Some(ref path) = backup_path {
        log::error!("Transcription failed! Audio backup saved at: {:?}", path);
        log::error!("You can manually retry this recording later.");
    }

    result
}

/// Internal transcription logic
async fn transcribe_with_whisper_internal(
    client: &reqwest::Client,
    api_key: &str,
    audio_data: Vec<u8>,
    language: Option<&str>,
    total_duration_ms: u32,
) -> Result<TranscriptionResponse> {
    // Check if we need to split the audio
    if audio_data.len() > MAX_WHISPER_FILE_SIZE {
        log::info!("Audio exceeds 25MB limit, splitting into chunks...");
        let chunks = split_audio_into_chunks(&audio_data, CHUNK_DURATION_SECONDS);
        let total_chunks = chunks.len();

        let mut all_text = Vec::new();
        for (i, chunk) in chunks.into_iter().enumerate() {
            let text = transcribe_chunk(client, api_key, chunk, language, i, total_chunks).await?;
            all_text.push(text);
        }

        let combined_text = all_text.join(" ");
        log::info!("All chunks transcribed, combined length: {} chars", combined_text.len());

        return Ok(TranscriptionResponse {
            text: combined_text,
            language: language.unwrap_or("en").to_string(),
            duration_ms: total_duration_ms,
        });
    }

    // Single chunk transcription (file is under 25MB)
    let text = transcribe_chunk(client, api_key, audio_data, language, 0, 1).await?;

    Ok(TranscriptionResponse {
        text,
        language: language.unwrap_or("en").to_string(),
        duration_ms: total_duration_ms,
    })
}

/// Calculate duration in ms from WAV audio data
fn calculate_duration_ms(audio_data: &[u8]) -> u32 {
    if audio_data.len() > 44 {
        let samples = (audio_data.len() - 44) / 2;
        (samples as u32 * 1000) / 16000
    } else {
        0
    }
}

/// Translate a single audio chunk to English with retry logic
async fn translate_chunk(
    client: &reqwest::Client,
    api_key: &str,
    audio_data: Vec<u8>,
    chunk_index: usize,
    total_chunks: usize,
) -> Result<String> {
    log::info!("Translating chunk {}/{} ({} bytes)", chunk_index + 1, total_chunks, audio_data.len());

    let mut last_error: Option<anyhow::Error> = None;

    for attempt in 0..MAX_RETRIES {
        if attempt > 0 {
            backoff_delay(attempt - 1).await;
        }

        let audio_part = Part::bytes(audio_data.clone())
            .file_name("audio.wav")
            .mime_str("audio/wav")?;

        let form = Form::new()
            .part("file", audio_part)
            .text("model", "whisper-1")
            .text("response_format", "json")
            .text("prompt", "Translate the speech to clear, natural English.");

        let result = client
            .post("https://api.openai.com/v1/audio/translations")
            .header("Authorization", format!("Bearer {}", api_key))
            .multipart(form)
            .send()
            .await;

        match result {
            Ok(response) => {
                let status = response.status();
                if status.is_success() {
                    match response.json::<WhisperResponse>().await {
                        Ok(whisper_response) => {
                            log::info!("Chunk {}/{} translated: {} chars (attempt {})",
                                chunk_index + 1, total_chunks, whisper_response.text.len(), attempt + 1);
                            return Ok(whisper_response.text);
                        }
                        Err(e) => {
                            let err = anyhow::anyhow!("Failed to parse response: {}", e);
                            if is_retryable_error(&err) && attempt < MAX_RETRIES - 1 {
                                log::warn!("Chunk {}/{} parse error (attempt {}): {}", chunk_index + 1, total_chunks, attempt + 1, e);
                                last_error = Some(err);
                                continue;
                            }
                            return Err(err);
                        }
                    }
                } else {
                    let error_text = response.text().await.unwrap_or_default();
                    let err = anyhow::anyhow!("Whisper API error ({}): {}", status, error_text);

                    if (status.as_u16() == 429 || status.is_server_error()) && attempt < MAX_RETRIES - 1 {
                        log::warn!("Chunk {}/{} API error (attempt {}): {} - {}", chunk_index + 1, total_chunks, attempt + 1, status, error_text);
                        last_error = Some(err);
                        continue;
                    }
                    return Err(err);
                }
            }
            Err(e) => {
                let err = anyhow::anyhow!("Request failed: {}", e);
                if is_retryable_error(&err) && attempt < MAX_RETRIES - 1 {
                    log::warn!("Chunk {}/{} request error (attempt {}): {}", chunk_index + 1, total_chunks, attempt + 1, e);
                    last_error = Some(err);
                    continue;
                }
                return Err(err);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Max retries exceeded")))
}

/// Translate audio to English using OpenAI Whisper API
/// This uses the /translations endpoint which transcribes AND translates to English
/// Automatically splits long audio into chunks if needed
pub async fn translate_to_english(
    api_key: &str,
    audio_data: Vec<u8>,
) -> Result<TranscriptionResponse> {
    // Clean up old backups first
    cleanup_old_backups();

    let client = create_client();
    let total_duration_ms = calculate_duration_ms(&audio_data);

    log::info!("Starting translation: {} bytes, {} ms duration ({:.1} minutes)",
        audio_data.len(), total_duration_ms, total_duration_ms as f64 / 60000.0);

    // Save backup for long recordings (over 1 minute)
    let backup_path = if total_duration_ms > 60000 {
        save_audio_backup(&audio_data)
    } else {
        None
    };

    let result = translate_to_english_internal(&client, api_key, audio_data, total_duration_ms).await;

    // Delete backup on success
    if result.is_ok() {
        if let Some(path) = backup_path {
            delete_audio_backup(&path);
        }
    } else if let Some(ref path) = backup_path {
        log::error!("Translation failed! Audio backup saved at: {:?}", path);
    }

    result
}

/// Internal translation logic
async fn translate_to_english_internal(
    client: &reqwest::Client,
    api_key: &str,
    audio_data: Vec<u8>,
    total_duration_ms: u32,
) -> Result<TranscriptionResponse> {
    // Check if we need to split the audio
    if audio_data.len() > MAX_WHISPER_FILE_SIZE {
        log::info!("Audio exceeds 25MB limit, splitting into chunks for translation...");
        let chunks = split_audio_into_chunks(&audio_data, CHUNK_DURATION_SECONDS);
        let total_chunks = chunks.len();

        let mut all_text = Vec::new();
        for (i, chunk) in chunks.into_iter().enumerate() {
            let text = translate_chunk(client, api_key, chunk, i, total_chunks).await?;
            all_text.push(text);
        }

        let combined_text = all_text.join(" ");
        log::info!("All chunks translated, combined length: {} chars", combined_text.len());

        return Ok(TranscriptionResponse {
            text: combined_text,
            language: "en".to_string(),
            duration_ms: total_duration_ms,
        });
    }

    // Single chunk translation
    let text = translate_chunk(&client, api_key, audio_data, 0, 1).await?;

    Ok(TranscriptionResponse {
        text,
        language: "en".to_string(),
        duration_ms: total_duration_ms,
    })
}

/// Send audio to a custom backend API for transcription
#[allow(dead_code)]
pub async fn transcribe_with_backend(
    api_url: &str,
    auth_token: &str,
    audio_data: Vec<u8>,
    language: Option<&str>,
    vocabulary: Vec<String>,
) -> Result<TranscriptionResponse> {
    let client = create_client();

    // Build multipart form
    let audio_part = Part::bytes(audio_data)
        .file_name("audio.wav")
        .mime_str("audio/wav")?;

    let mut form = Form::new().part("audio", audio_part);

    if let Some(lang) = language {
        form = form.text("language", lang.to_string());
    }

    if !vocabulary.is_empty() {
        form = form.text("vocabulary", serde_json::to_string(&vocabulary)?);
    }

    let response = client
        .post(&format!("{}/api/transcribe", api_url))
        .header("Authorization", format!("Bearer {}", auth_token))
        .multipart(form)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(anyhow::anyhow!("Backend API error ({}): {}", status, error_text));
    }

    #[derive(Deserialize)]
    struct ApiResponse {
        success: bool,
        data: Option<BackendTranscriptionData>,
        error: Option<ApiError>,
    }

    #[derive(Deserialize)]
    struct BackendTranscriptionData {
        text: String,
        language: String,
        duration_ms: u32,
    }

    #[derive(Deserialize)]
    struct ApiError {
        code: String,
        message: String,
    }

    let body: ApiResponse = response.json().await?;

    if !body.success {
        let error = body.error.unwrap_or(ApiError {
            code: "UNKNOWN".to_string(),
            message: "Unknown error occurred".to_string(),
        });
        return Err(anyhow::anyhow!("{}: {}", error.code, error.message));
    }

    let data = body.data.ok_or_else(|| anyhow::anyhow!("No data in response"))?;

    Ok(TranscriptionResponse {
        text: data.text,
        language: data.language,
        duration_ms: data.duration_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transcription_response() {
        let response = TranscriptionResponse {
            text: "Hello world".to_string(),
            language: "en".to_string(),
            duration_ms: 1000,
        };
        assert_eq!(response.text, "Hello world");
    }
}

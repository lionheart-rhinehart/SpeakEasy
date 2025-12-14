use crate::commands::AudioDevice;
use anyhow::{anyhow, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use hound::{WavSpec, WavWriter};
use std::io::Cursor;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

/// Thread-safe audio recorder handle
/// The actual Stream runs in a dedicated thread since cpal::Stream is not Send
pub struct AudioRecorderHandle {
    samples: Arc<Mutex<Vec<f32>>>,
    is_recording: Arc<AtomicBool>,
    stop_tx: Option<mpsc::Sender<()>>,
    current_level: Arc<Mutex<f32>>, // Real-time audio level for visualization
}

impl AudioRecorderHandle {
    pub fn new() -> Self {
        Self {
            samples: Arc::new(Mutex::new(Vec::new())),
            is_recording: Arc::new(AtomicBool::new(false)),
            stop_tx: None,
            current_level: Arc::new(Mutex::new(0.0)),
        }
    }

    /// Get the current audio level (0.0 to 1.0) for visualization
    pub fn get_audio_level(&self) -> f32 {
        *self.current_level.lock().unwrap()
    }

    /// Start recording from the specified device (or default if None)
    pub fn start(&mut self, device_name: Option<String>) -> Result<()> {
        if self.is_recording.load(Ordering::SeqCst) {
            return Err(anyhow!("Already recording"));
        }

        // CRITICAL: Clear previous samples before anything else
        {
            let mut samples = self.samples.lock().unwrap();
            samples.clear();
            samples.shrink_to_fit(); // Release memory from old buffer
        }

        let samples = Arc::clone(&self.samples);
        let is_recording = Arc::clone(&self.is_recording);
        let current_level = Arc::clone(&self.current_level);
        let (stop_tx, stop_rx) = mpsc::channel();
        self.stop_tx = Some(stop_tx);

        // Reset level
        *self.current_level.lock().unwrap() = 0.0;

        // Spawn a dedicated thread for audio capture
        // NOTE: is_recording is set to true INSIDE the thread, right before stream.play()
        thread::spawn(move || {
            if let Err(e) = run_audio_capture(device_name, samples, is_recording, current_level, stop_rx) {
                log::error!("Audio capture error: {}", e);
            }
        });

        // Wait a moment for the stream to actually start
        thread::sleep(std::time::Duration::from_millis(50));

        log::info!("Audio recording started");
        Ok(())
    }

    /// Stop recording and return the WAV data
    pub fn stop(&mut self) -> Result<Vec<u8>> {
        // First stop accepting new samples
        self.is_recording.store(false, Ordering::SeqCst);

        // Signal the audio thread to stop
        if let Some(tx) = self.stop_tx.take() {
            let _ = tx.send(());
        }

        // Wait for the thread to finish and stream to close
        thread::sleep(std::time::Duration::from_millis(150));

        // Get the samples - take ownership and clear the buffer
        let mut samples = {
            let mut guard = self.samples.lock().unwrap();
            let taken = std::mem::take(&mut *guard);
            guard.shrink_to_fit(); // Release memory
            taken
        };

        let duration_secs = samples.len() as f32 / 16000.0;
        log::info!("Recording stopped, {} samples captured ({:.2}s)", samples.len(), duration_secs);

        if samples.is_empty() {
            return Err(anyhow!("No audio recorded"));
        }

        // Sanity check: if recording is way too long, something went wrong
        if duration_secs > 300.0 {
            log::warn!("Recording suspiciously long ({:.0}s), possible buffer issue", duration_secs);
        }

        // Apply audio processing for better Whisper recognition
        process_audio_for_whisper(&mut samples);

        // Convert to WAV at 16kHz (Whisper's preferred format)
        samples_to_wav(&samples, 16000)
    }

    pub fn is_recording(&self) -> bool {
        self.is_recording.load(Ordering::SeqCst)
    }
}

impl Default for AudioRecorderHandle {
    fn default() -> Self {
        Self::new()
    }
}

// Unsafe impl to allow AudioRecorderHandle to be Send+Sync
// This is safe because we don't store the Stream directly - it lives in its own thread
unsafe impl Send for AudioRecorderHandle {}
unsafe impl Sync for AudioRecorderHandle {}

/// Run audio capture in a dedicated thread
fn run_audio_capture(
    device_name: Option<String>,
    samples: Arc<Mutex<Vec<f32>>>,
    is_recording: Arc<AtomicBool>,
    current_level: Arc<Mutex<f32>>,
    stop_rx: mpsc::Receiver<()>,
) -> Result<()> {
    let host = cpal::default_host();

    // Get the device
    let device = if let Some(ref name) = device_name {
        host.input_devices()?
            .find(|d| d.name().map(|n| n == *name).unwrap_or(false))
            .ok_or_else(|| anyhow!("Device '{}' not found", name))?
    } else {
        host.default_input_device()
            .ok_or_else(|| anyhow!("No default input device available"))?
    };

    log::info!("Using audio device: {:?}", device.name());

    // Get supported config
    let config = device.default_input_config()?;
    let source_sample_rate = config.sample_rate().0;
    let target_sample_rate = 16000u32;
    let channels = config.channels() as usize;

    log::info!("Audio config: {:?}, channels: {}", config, channels);

    let err_fn = |err| log::error!("Audio stream error: {}", err);

    // Helper to convert stereo to mono and resample
    // Uses linear interpolation for better quality than nearest-neighbor
    fn process_samples(
        data: &[f32],
        samples: &Arc<Mutex<Vec<f32>>>,
        is_recording: &Arc<AtomicBool>,
        current_level: &Arc<Mutex<f32>>,
        channels: usize,
        source_rate: u32,
        target_rate: u32,
        resample_state: &Arc<Mutex<f64>>,
    ) {
        if !is_recording.load(Ordering::SeqCst) {
            return;
        }

        let mut samples = samples.lock().unwrap();
        let mut state = resample_state.lock().unwrap();

        // First convert to mono if stereo
        let mono_data: Vec<f32> = if channels > 1 {
            data.chunks(channels)
                .map(|chunk| chunk.iter().sum::<f32>() / channels as f32)
                .collect()
        } else {
            data.to_vec()
        };

        // Calculate RMS level for visualization (smoothed)
        if !mono_data.is_empty() {
            let rms = (mono_data.iter().map(|s| s * s).sum::<f32>() / mono_data.len() as f32).sqrt();
            // Clamp to 0-1 range and apply some smoothing
            let level = (rms * 3.0).min(1.0); // Amplify for visibility
            let mut current = current_level.lock().unwrap();
            // Smooth: fast attack, slow decay
            if level > *current {
                *current = level;
            } else {
                *current = *current * 0.9 + level * 0.1;
            }
        }

        // Resample using linear interpolation
        if source_rate != target_rate {
            let ratio = source_rate as f64 / target_rate as f64;

            while *state < mono_data.len() as f64 - 1.0 {
                let idx = *state as usize;
                let frac = *state - idx as f64;

                // Linear interpolation between samples
                let sample = mono_data[idx] * (1.0 - frac as f32)
                           + mono_data[idx + 1] * frac as f32;
                samples.push(sample);
                *state += ratio;
            }

            // Keep the fractional part for next callback
            *state -= mono_data.len() as f64 - 1.0;
            if *state < 0.0 {
                *state = 0.0;
            }
        } else {
            samples.extend_from_slice(&mono_data);
        }
    }

    // Track resampling state across callbacks for smooth audio
    let resample_state = Arc::new(Mutex::new(0.0f64));

    let stream = match config.sample_format() {
        SampleFormat::F32 => {
            let samples = Arc::clone(&samples);
            let is_recording = Arc::clone(&is_recording);
            let current_level = Arc::clone(&current_level);
            let resample_state = Arc::clone(&resample_state);
            device.build_input_stream(
                &config.into(),
                move |data: &[f32], _: &cpal::InputCallbackInfo| {
                    process_samples(
                        data,
                        &samples,
                        &is_recording,
                        &current_level,
                        channels,
                        source_sample_rate,
                        target_sample_rate,
                        &resample_state,
                    );
                },
                err_fn,
                None,
            )?
        }
        SampleFormat::I16 => {
            let samples = Arc::clone(&samples);
            let is_recording = Arc::clone(&is_recording);
            let current_level = Arc::clone(&current_level);
            let resample_state = Arc::clone(&resample_state);
            device.build_input_stream(
                &config.into(),
                move |data: &[i16], _: &cpal::InputCallbackInfo| {
                    // Convert i16 to f32
                    let float_data: Vec<f32> = data.iter()
                        .map(|&s| s as f32 / i16::MAX as f32)
                        .collect();
                    process_samples(
                        &float_data,
                        &samples,
                        &is_recording,
                        &current_level,
                        channels,
                        source_sample_rate,
                        target_sample_rate,
                        &resample_state,
                    );
                },
                err_fn,
                None,
            )?
        }
        SampleFormat::U16 => {
            let samples = Arc::clone(&samples);
            let is_recording = Arc::clone(&is_recording);
            let current_level = Arc::clone(&current_level);
            let resample_state = Arc::clone(&resample_state);
            device.build_input_stream(
                &config.into(),
                move |data: &[u16], _: &cpal::InputCallbackInfo| {
                    // Convert u16 to f32
                    let float_data: Vec<f32> = data.iter()
                        .map(|&s| (s as f32 / u16::MAX as f32) * 2.0 - 1.0)
                        .collect();
                    process_samples(
                        &float_data,
                        &samples,
                        &is_recording,
                        &current_level,
                        channels,
                        source_sample_rate,
                        target_sample_rate,
                        &resample_state,
                    );
                },
                err_fn,
                None,
            )?
        }
        _ => return Err(anyhow!("Unsupported sample format")),
    };

    // Set recording flag RIGHT BEFORE starting the stream
    // This ensures no stale audio gets captured
    is_recording.store(true, Ordering::SeqCst);

    stream.play()?;

    // Wait for stop signal
    let _ = stop_rx.recv();

    // Ensure flag is cleared
    is_recording.store(false, Ordering::SeqCst);

    // Stream is dropped here, stopping the recording
    Ok(())
}

/// Get list of available audio input devices
pub fn get_input_devices() -> Result<Vec<AudioDevice>> {
    let host = cpal::default_host();
    let default_device = host.default_input_device();
    let default_name = default_device
        .as_ref()
        .and_then(|d| d.name().ok());

    let devices = host
        .input_devices()?
        .filter_map(|device| {
            let name = device.name().ok()?;
            Some(AudioDevice {
                is_default: default_name.as_ref() == Some(&name),
                name,
            })
        })
        .collect();

    Ok(devices)
}

/// Process audio samples for optimal Whisper API recognition
/// This applies:
/// 1. DC offset removal
/// 2. Normalization (to use full dynamic range)
/// 3. Noise gate (to reduce background noise/hum that causes hallucinations)
/// 4. Trim silence from start/end
fn process_audio_for_whisper(samples: &mut Vec<f32>) {
    if samples.is_empty() {
        return;
    }

    // 1. Remove DC offset (center the waveform around zero)
    let mean: f32 = samples.iter().sum::<f32>() / samples.len() as f32;
    for sample in samples.iter_mut() {
        *sample -= mean;
    }

    // 2. Calculate RMS for noise gate threshold
    let rms: f32 = (samples.iter().map(|s| s * s).sum::<f32>() / samples.len() as f32).sqrt();
    let noise_threshold = rms * 0.1; // 10% of RMS as noise floor

    // 3. Apply soft noise gate (reduce very quiet samples that are likely noise)
    for sample in samples.iter_mut() {
        let abs_sample = sample.abs();
        if abs_sample < noise_threshold {
            // Soft gate: reduce quiet samples rather than hard cut
            *sample *= abs_sample / noise_threshold;
        }
    }

    // 4. Find peak for normalization
    let peak = samples.iter().map(|s| s.abs()).fold(0.0f32, f32::max);

    // 5. Normalize to 90% of full scale (leave headroom)
    if peak > 0.001 {
        let target = 0.9;
        let gain = target / peak;
        for sample in samples.iter_mut() {
            *sample *= gain;
        }
    }

    // 6. Trim silence from start and end
    // Use a threshold of 1% of full scale
    let silence_threshold = 0.01f32;
    let window_size = 160; // 10ms at 16kHz

    // Find start (first non-silent window)
    let mut start_idx = 0;
    for (i, chunk) in samples.chunks(window_size).enumerate() {
        let chunk_rms: f32 = (chunk.iter().map(|s| s * s).sum::<f32>() / chunk.len() as f32).sqrt();
        if chunk_rms > silence_threshold {
            // Keep a small buffer before speech starts (50ms)
            start_idx = (i * window_size).saturating_sub(800);
            break;
        }
    }

    // Find end (last non-silent window)
    let mut end_idx = samples.len();
    for (i, chunk) in samples.chunks(window_size).enumerate().rev() {
        let chunk_rms: f32 = (chunk.iter().map(|s| s * s).sum::<f32>() / chunk.len() as f32).sqrt();
        if chunk_rms > silence_threshold {
            // Keep a small buffer after speech ends (50ms)
            end_idx = ((i + 1) * window_size + 800).min(samples.len());
            break;
        }
    }

    // Only trim if we found valid boundaries and have reasonable content
    if start_idx < end_idx && end_idx - start_idx > 1600 { // At least 100ms of content
        let trimmed: Vec<f32> = samples[start_idx..end_idx].to_vec();
        *samples = trimmed;
        log::info!("Trimmed audio: removed {}ms from start, {}ms from end",
                   start_idx * 1000 / 16000,
                   (samples.len() - end_idx) * 1000 / 16000);
    }
}

/// Convert raw audio samples to WAV format
pub fn samples_to_wav(samples: &[f32], sample_rate: u32) -> Result<Vec<u8>> {
    let spec = WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut cursor = Cursor::new(Vec::new());
    {
        let mut writer = WavWriter::new(&mut cursor, spec)?;

        for &sample in samples {
            // Convert f32 [-1.0, 1.0] to i16
            let sample_i16 = (sample * i16::MAX as f32) as i16;
            writer.write_sample(sample_i16)?;
        }

        writer.finalize()?;
    }

    Ok(cursor.into_inner())
}

/// Play the recording start sound
pub fn play_start_sound() -> Result<()> {
    log::info!("Playing start sound");
    play_beep(880.0, 0.1)?;
    Ok(())
}

/// Play the recording stop sound
pub fn play_stop_sound() -> Result<()> {
    log::info!("Playing stop sound");
    play_beep(660.0, 0.15)?;
    Ok(())
}

/// Play a simple beep sound
fn play_beep(frequency: f32, duration: f32) -> Result<()> {
    use rodio::{OutputStream, Source};

    let (_stream, stream_handle) = OutputStream::try_default()
        .map_err(|e| anyhow!("Failed to get audio output: {}", e))?;

    let source = rodio::source::SineWave::new(frequency)
        .take_duration(std::time::Duration::from_secs_f32(duration))
        .amplify(0.3);

    stream_handle
        .play_raw(source.convert_samples())
        .map_err(|e| anyhow!("Failed to play sound: {}", e))?;

    // Wait for the sound to finish
    std::thread::sleep(std::time::Duration::from_secs_f32(duration + 0.05));

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_samples_to_wav() {
        let samples: Vec<f32> = (0..1000)
            .map(|i| (i as f32 / 100.0).sin())
            .collect();

        let wav_data = samples_to_wav(&samples, 16000).unwrap();

        // WAV files start with "RIFF"
        assert_eq!(&wav_data[0..4], b"RIFF");
    }
}

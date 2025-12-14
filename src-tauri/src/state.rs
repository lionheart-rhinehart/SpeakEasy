use crate::audio::AudioRecorderHandle;
use std::sync::Mutex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RecordingState {
    Idle,
    Recording,
    Processing,
}

pub struct AppState {
    pub recording_state: Mutex<RecordingState>,
    pub audio_recorder: Mutex<AudioRecorderHandle>,
    pub selected_device: Mutex<Option<String>>,
    pub api_key: Mutex<Option<String>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            recording_state: Mutex::new(RecordingState::Idle),
            audio_recorder: Mutex::new(AudioRecorderHandle::new()),
            selected_device: Mutex::new(None),
            api_key: Mutex::new(None),
        }
    }

    pub fn start_recording(&self) -> anyhow::Result<()> {
        let device_name = self.selected_device.lock().unwrap().clone();
        let mut recorder = self.audio_recorder.lock().unwrap();
        recorder.start(device_name)?;
        *self.recording_state.lock().unwrap() = RecordingState::Recording;
        Ok(())
    }

    pub fn stop_recording(&self) -> anyhow::Result<Vec<u8>> {
        *self.recording_state.lock().unwrap() = RecordingState::Processing;
        let mut recorder = self.audio_recorder.lock().unwrap();
        recorder.stop()
    }

    pub fn set_idle(&self) {
        *self.recording_state.lock().unwrap() = RecordingState::Idle;
    }

    pub fn get_state(&self) -> RecordingState {
        *self.recording_state.lock().unwrap()
    }

    pub fn is_recording(&self) -> bool {
        self.audio_recorder.lock().unwrap().is_recording()
    }

    pub fn get_audio_level(&self) -> f32 {
        self.audio_recorder.lock().unwrap().get_audio_level()
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

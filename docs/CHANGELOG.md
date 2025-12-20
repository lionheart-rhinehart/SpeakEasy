# Changelog

All notable changes to SpeakEasy will be documented in this file.

## [1.0.0] - Beta Release

### Added
- Voice-to-text transcription using OpenAI Whisper
- AI Transform feature for voice-instructed text transformation
- Voice Commands for hands-free action execution
- Custom hotkey actions (URL, Webhook, Prompt types)
- Chrome profile selection for URL actions
- Transcription history with local storage
- Multi-provider LLM support (OpenAI, Anthropic, OpenRouter)
- Secure API key storage using OS credential manager
- Auto-start with Windows support
- License activation system for beta access
- Automatic update system
- Configurable hotkeys
- Recording overlay indicator
- System tray integration

### Technical
- Built with Tauri 2.5 (Rust + React)
- Cross-platform architecture (Windows first, macOS ready)
- Local SQLite database for history
- File-based settings that survive reinstalls

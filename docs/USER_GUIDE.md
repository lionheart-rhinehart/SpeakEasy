# SpeakEasy User Guide

Complete documentation for all SpeakEasy features.

## Table of Contents

1. [Voice-to-Text Transcription](#voice-to-text-transcription)
2. [AI Transform](#ai-transform)
3. [Voice Commands](#voice-commands)
4. [Custom Actions](#custom-actions)
5. [History](#history)
6. [Settings](#settings)

---

## Voice-to-Text Transcription

The core feature of SpeakEasy - convert speech to text instantly.

### Basic Usage

1. **Start Recording**: Press `Ctrl+Space`
   - A recording indicator appears at the bottom of your screen
   - The indicator shows recording duration

2. **Stop & Transcribe**: Press `Ctrl+Space` again
   - Recording stops and audio is sent to OpenAI Whisper
   - Transcribed text is copied to clipboard and pasted at your cursor

### Settings

- **Language**: Choose your spoken language or use auto-detect
- **Translate to English**: Optionally translate non-English speech to English
- **Auto-paste Mode**:
  - `Always`: Always paste after transcription
  - `Smart`: Only paste if a text field is focused
  - `Never`: Only copy to clipboard
- **Audio Feedback**: Enable/disable start/stop sounds
- **Floating Indicator**: Show/hide the recording overlay

---

## AI Transform

Transform any text with natural language instructions.

### How It Works

1. **Select text** in any application
2. **Press and hold** `Ctrl+` ` (backtick key)
3. **Speak your instruction** while holding (e.g., "summarize this", "fix the grammar", "translate to Spanish")
4. **Release the key**
5. Your transformed text replaces the selection

### Example Instructions

- "Make it more professional"
- "Summarize in one sentence"
- "Fix grammar and spelling"
- "Translate to French"
- "Add bullet points"
- "Make it shorter"
- "Expand on this"

### Settings

- **Transform Provider**: OpenAI, Anthropic, or OpenRouter
- **Model**: Select specific model (e.g., GPT-4, Claude)
- **Temperature**: Control creativity (0.0 = focused, 1.0 = creative)
- **Max Tokens**: Maximum response length

---

## Voice Commands

Execute actions by speaking their name.

### How It Works

1. **Press and hold** `Ctrl+Shift+Space`
2. **Say the action name** (e.g., "open gmail", "fix grammar")
3. **Release the key**
4. If confidence is high, the action executes immediately
5. If unsure, a review window shows top matches for you to select

### Confidence Threshold

In Settings, you can adjust the "Auto-execute threshold":
- **Higher** (e.g., 0.9): Only auto-execute on very confident matches
- **Lower** (e.g., 0.4): Auto-execute on reasonable matches

### Fuzzy Matching

Voice commands use fuzzy matching, so you don't need exact names:
- "open mail" can match "Open Gmail"
- "professional" can match "Make Professional"

---

## Custom Actions

Create custom actions triggered by hotkeys.

### Action Types

#### URL Actions
Open a specific URL in Chrome:
- Configure the URL and hotkey
- Optionally choose Chrome profile when executing

#### Smart URL Actions
Intelligently handle selected text:
- If text looks like a URL → opens it
- Otherwise → Google search

#### Webhook Actions (POST/GET)
Send selected text to a custom endpoint:
- Configure webhook URL and method
- Add custom headers if needed
- Response text is pasted back

#### Prompt Actions
Apply a stored AI prompt to selected text:
- Define your prompt template (use `{{text}}` for selected text)
- Assign a hotkey
- Press hotkey with text selected to transform

### Creating Actions

1. Open Settings → Webhook Actions or Prompt Actions
2. Click "Add Action"
3. Configure:
   - **Name**: Action name (used for voice commands)
   - **Hotkey**: Keyboard shortcut
   - **Type/Method**: URL, Webhook, or Prompt
   - **Content**: URL, webhook endpoint, or prompt template

---

## History

View and manage your transcription history.

### Accessing History

- Press `Ctrl+H` or click the History button in the main window

### Features

- View recent transcriptions with timestamps
- Click any entry to copy to clipboard
- Delete individual entries
- Clear all history

### Storage

History is stored locally and limited by the "History Storage Limit" setting (default 10MB). Oldest entries are automatically removed when the limit is reached.

---

## Settings

### General

- **Start on Boot**: Launch SpeakEasy when Windows starts
- **Start Minimized**: Start in system tray without showing window
- **History Storage Limit**: Maximum storage for history (5-50 MB)

### Hotkeys

All hotkeys can be customized:
- **Recording**: Default `Ctrl+Space`
- **AI Transform**: Default `Ctrl+` `
- **Voice Commands**: Default `Ctrl+Shift+Space`
- **History**: Default `Ctrl+H`

### Transcription

- **Language**: Select language or auto-detect
- **Translate to English**: Enable translation
- **Auto-paste Mode**: Always, Smart, or Never
- **Display Mode**: How transcription is shown
- **Audio Feedback**: Start/stop sounds
- **Floating Indicator**: Recording overlay

### Transform (AI)

- **Provider**: OpenAI, Anthropic, or OpenRouter
- **Model**: Specific AI model
- **Temperature**: Creativity level
- **Max Tokens**: Response length limit
- **API Keys**: Each provider needs its own key

### Voice Commands

- **Enable Voice Commands**: Toggle feature
- **Auto-execute Threshold**: Confidence level for automatic execution

---

## Keyboard Shortcuts Summary

| Action | Default Hotkey |
|--------|----------------|
| Start/Stop Recording | `Ctrl+Space` |
| AI Transform | `Ctrl+` ` (hold) |
| Voice Commands | `Ctrl+Shift+Space` (hold) |
| Open History | `Ctrl+H` |
| Custom Action 1-9 | Configurable |

---

## Tips & Best Practices

1. **Speak clearly** with a brief pause before starting
2. **Use quality microphone** for better accuracy
3. **Create prompt actions** for frequently used transformations
4. **Adjust thresholds** if voice commands execute incorrectly
5. **Check history** if you need to recover a transcription

---

## Troubleshooting

### Recording Issues
- Check microphone permissions in Windows Settings
- Select the correct microphone in SpeakEasy Settings
- Ensure microphone isn't muted

### Transcription Fails
- Verify OpenAI API key is correct
- Check you have API credits
- Ensure internet connection

### Transform Fails
- Verify API key for selected provider
- Check model availability
- Try reducing max tokens

### Hotkey Doesn't Work
- Check if another app is using the same hotkey
- Try a different hotkey combination
- Restart SpeakEasy

### License Issues
- Ensure internet connection for validation
- Check license hasn't expired
- Contact support if revoked

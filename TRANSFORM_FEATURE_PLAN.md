# SpeakEasy Transform Feature - Implementation Plan

## Overview
Add a "Transform" mode that takes text (from clipboard/selection) + voice command and transforms it using AI or sends it to custom webhooks/APIs.

## User Workflow

### Basic Transform (GPT)
1. User has text (typed, transcribed, or highlighted)
2. Press **Ctrl+Shift+Space** to enter Transform mode
3. Speak the instruction: "Make this a professional email with bullet points"
4. Release hotkey
5. GPT transforms the text based on instruction
6. Result is pasted (replaces selection or appends)

### Webhook/Action Transform
1. User has text selected or in clipboard
2. Press **Ctrl+Shift+Space**
3. Quick action menu appears with configured actions:
   - "Professional Email" (GPT preset)
   - "Send to Slack #general" (webhook)
   - "Create Jira Ticket" (webhook)
   - "Summarize & Save to Notion" (webhook)
   - "Custom voice command..." (GPT freeform)
4. User clicks action OR speaks "custom" for voice command
5. Action executes, result pasted or confirmation shown

## Architecture

### New Types (types/index.ts)
```typescript
interface TransformAction {
  id: string;
  name: string;
  type: "gpt_preset" | "gpt_custom" | "webhook";
  // For GPT presets
  systemPrompt?: string;
  // For webhooks
  webhookUrl?: string;
  webhookMethod?: "POST" | "GET";
  webhookHeaders?: Record<string, string>;
  // Display
  icon?: string;
  color?: string;
  hotkey?: string; // Optional direct hotkey like "Ctrl+1"
}

interface TransformRequest {
  inputText: string;
  instruction?: string; // Voice command for GPT
  actionId: string;
}

interface TransformResponse {
  success: boolean;
  outputText?: string;
  error?: string;
}
```

### Backend Commands (Rust)

1. **`transform_with_gpt`**
   - Takes: input_text, instruction, system_prompt (optional)
   - Uses OpenAI Chat API (gpt-4o-mini for speed/cost)
   - Returns transformed text

2. **`transform_with_webhook`**
   - Takes: input_text, webhook_url, method, headers, instruction
   - POSTs to webhook with JSON payload
   - Returns response (expects { text: string } or plain text)

3. **`get_clipboard_text`**
   - Returns current clipboard content

4. **`get_selected_text`** (if possible)
   - Simulates Ctrl+C, gets clipboard, restores old clipboard
   - Tricky but useful

### Frontend Flow

1. **Hotkey Handler** (App.tsx)
   - Ctrl+Shift+Space pressed → enter transform mode
   - Get clipboard/selected text
   - Show TransformPanel overlay

2. **TransformPanel Component**
   - Shows input text preview
   - Lists configured actions as buttons
   - "Voice Command" button starts recording
   - On action click → execute transform
   - On voice command → transcribe → GPT transform

3. **Settings: Transform Actions**
   - List of configured actions
   - Add/edit/delete actions
   - Built-in presets:
     - "Professional Email"
     - "Bullet Points"
     - "Summarize"
     - "Fix Grammar"
   - Custom webhook builder

### Default GPT Presets
```typescript
const DEFAULT_PRESETS: TransformAction[] = [
  {
    id: "professional_email",
    name: "Professional Email",
    type: "gpt_preset",
    systemPrompt: "Transform the input into a professional email. Keep the core message but make it polished, clear, and appropriately formal. Include a greeting and sign-off."
  },
  {
    id: "bullet_points",
    name: "Bullet Points",
    type: "gpt_preset",
    systemPrompt: "Convert the input into clear, concise bullet points. Extract the key information and organize it logically."
  },
  {
    id: "summarize",
    name: "Summarize",
    type: "gpt_preset",
    systemPrompt: "Summarize the input text concisely while preserving the key points and meaning."
  },
  {
    id: "fix_grammar",
    name: "Fix Grammar",
    type: "gpt_preset",
    systemPrompt: "Fix any grammar, spelling, and punctuation errors. Improve clarity while preserving the original meaning and tone."
  },
  {
    id: "custom_voice",
    name: "Voice Command",
    type: "gpt_custom",
    systemPrompt: "Transform the input text according to the user's instruction."
  }
];
```

### Webhook Payload Format
```json
{
  "text": "The input text to transform",
  "instruction": "Optional voice command/instruction",
  "source": "speakeasy",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Expected Webhook Response
```json
{
  "text": "The transformed output text",
  "success": true
}
```
Or plain text response body.

## Implementation Order

### Phase 1: Core Transform (GPT only)
1. Add `transform_with_gpt` Rust command
2. Add Transform hotkey registration
3. Create basic TransformPanel with presets
4. Wire up clipboard read → GPT → paste

### Phase 2: Voice Commands
1. Add recording in transform mode
2. Transcribe voice → use as instruction
3. Show recording indicator during transform voice

### Phase 3: Webhooks
1. Add `transform_with_webhook` command
2. Add webhook configuration in Settings
3. Add webhook actions to TransformPanel
4. Test with N8N/Make example

### Phase 4: Polish
1. Action quick-select with keyboard (1-9)
2. Custom hotkeys per action
3. Action history/favorites
4. Better error handling & feedback

## UI Mockup (TransformPanel)

```
┌─────────────────────────────────────┐
│  Transform Text                  ✕  │
├─────────────────────────────────────┤
│ Input:                              │
│ ┌─────────────────────────────────┐ │
│ │ hey john wanted to follow up   │ │
│ │ on our meeting yesterday...    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Quick Actions:                      │
│ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│ │ ✉ Email │ │ • Bullet│ │ 📝 Sum │ │
│ └─────────┘ └─────────┘ └────────┘ │
│ ┌─────────┐ ┌──────────────────────┐│
│ │ ✓ Fix   │ │ 🎤 Voice Command... ││
│ └─────────┘ └──────────────────────┘│
│                                     │
│ Webhooks:                           │
│ ┌─────────────────────────────────┐ │
│ │ 📤 Send to Slack #general       │ │
│ │ 🎫 Create Jira Ticket           │ │
│ │ 📓 Save to Notion               │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

## Cost Considerations
- GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output
- Typical transform: ~500 input + 500 output tokens = ~$0.0004
- Very cheap for text transformation

## Security Notes
- Webhook URLs stored locally (not synced)
- API key already stored securely
- Webhook auth tokens in headers (user configures)
- No sensitive data logged

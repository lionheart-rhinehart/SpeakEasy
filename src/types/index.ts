// User and authentication types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  organizationId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Transcription types
export interface Transcription {
  id: string;
  text: string;
  durationMs: number;
  language: string;
  createdAt: string;
}

// Settings types
export type AutoPasteMode = "always" | "smart" | "never";
export type DisplayMode = "direct" | "toast" | "edit";

// LLM Transform providers
export type TransformProvider = "openrouter" | "openai" | "anthropic";

// Settings schema version for migrations
export const SETTINGS_SCHEMA_VERSION = 2;

export interface UserSettings {
  // Schema version for future migrations
  settingsVersion?: number;
  
  // Hotkeys
  hotkeyRecord: string;
  hotkeyAiTransform: string;
  hotkeyHistory: string;
  
  // Transcription settings
  autoPasteMode: AutoPasteMode;
  displayMode: DisplayMode;
  language: string;
  translateToEnglish: boolean;
  audioEnabled: boolean;
  floatingIndicator: boolean;
  historyLimitMb: number;
  startOnBoot: boolean;
  startMinimized: boolean;
  selectedMicrophone: string | null;
  
  // Transform (AI Transform hotkey) settings
  // Note: API keys are NOT stored here - they're in secure OS credential storage
  transformProvider: TransformProvider;
  transformModel: string;
  transformTemperature?: number;
  transformMaxTokens?: number;
  
  // Webhook actions
  webhookActions: WebhookAction[];
}

// API key status from backend (does not contain the actual key)
export interface ApiKeyStatus {
  provider: string;
  is_set: boolean;
  preview: string | null;
}

// Vocabulary types
export interface VocabularyEntry {
  id: string;
  word: string;
  hint?: string;
  scope: "personal" | "team" | "global";
  createdAt: string;
}

// Recording state
export type RecordingState = "idle" | "recording" | "processing" | "error";

// Webhook/Hotkey Action for Transform feature
// method values:
// - "POST" / "GET": webhook transform (copy selection → call backend → paste response)
// - "URL": open a preset URL in Chrome
// - "SMART_URL": copy highlighted text, if URL-like open it, else Google search it
export interface WebhookAction {
  id: string;
  name: string;
  hotkey: string; // e.g., "Control+1", "Control+2", etc.
  webhookUrl: string; // For POST/GET: webhook endpoint; For URL: preset website URL; For SMART_URL: unused
  method: "POST" | "GET" | "URL" | "SMART_URL";
  headers?: Record<string, string>;
  enabled: boolean;
  // Chrome profile targeting (for URL method)
  // When true, shows a profile chooser before opening the URL
  askChromeProfile?: boolean;
}

// Chrome profile info returned from backend
export interface ChromeProfile {
  profile_directory: string; // e.g., "Default", "Profile 1"
  display_name: string; // Friendly name from Chrome, e.g., "Work", "Personal"
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface TranscriptionResponse {
  transcriptionId: string;
  text: string;
  language: string;
  durationMs: number;
  processingTimeMs: number;
}

// ============================================================================
// File-based settings (snake_case for Rust interop via Tauri)
// These interfaces match the Rust UserSettings/WebhookAction structs in config.rs
// ============================================================================

export interface FileWebhookAction {
  id: string;
  name: string;
  hotkey: string;
  webhook_url: string;
  method: string;
  headers?: Record<string, string>;
  enabled: boolean;
  ask_chrome_profile?: boolean;
}

export interface FileUserSettings {
  settings_version?: number;
  hotkey_record: string;
  hotkey_ai_transform: string;
  hotkey_history: string;
  auto_paste_mode: string;
  display_mode: string;
  language: string;
  translate_to_english: boolean;
  audio_enabled: boolean;
  floating_indicator: boolean;
  history_limit_mb: number;
  start_on_boot: boolean;
  start_minimized: boolean;
  selected_microphone: string | null;
  transform_provider: string;
  transform_model: string;
  transform_temperature: number;
  transform_max_tokens: number;
  webhook_actions: FileWebhookAction[];
}

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

// Webhook Action for Transform feature
export interface WebhookAction {
  id: string;
  name: string;
  hotkey: string; // e.g., "Control+1", "Control+2", etc.
  webhookUrl: string;
  method: "POST" | "GET";
  headers?: Record<string, string>;
  enabled: boolean;
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

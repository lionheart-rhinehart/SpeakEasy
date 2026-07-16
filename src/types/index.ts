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
export type TransformProvider = "openrouter" | "openai" | "anthropic" | "poe" | "copycoders";

// Settings schema version for migrations
// v3 (P1-migrate): the PERSISTED action schema collapses the two legacy arrays
// (webhook_actions[] + prompt_actions[]) into one unified `actions[]` array on
// disk. The in-memory UserSettings still keeps the two arrays (P1-action's split);
// the collapse/expand happens at the persistence boundary (see appStore convert
// fns + src/utils/actions.ts). Old v2 configs (no `actions[]`) are read via the
// legacy arrays and rewritten as `actions[]` on the next save — zero data loss.
export const SETTINGS_SCHEMA_VERSION = 3;

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

  // Prompt actions (LLM-based transforms with stored prompts)
  promptActions: PromptAction[];

  // Voice command settings (optional for backward compatibility)
  hotkeyVoiceCommand?: string;
  voiceCommandEnabled?: boolean;
  voiceCommandAutoExecuteThreshold?: number;

  // Cursor Lock settings (optional for backward compatibility)
  cursorLockEnabled?: boolean;
  hotkeyLockTarget?: string;
  lockTargetAutoEnter?: boolean;
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

// ============================================================================
// Custom Hotkey Types
// ============================================================================

// Hotkey modifier keys supported by Tauri global-shortcut plugin
export type HotkeyModifier = "Control" | "Alt" | "Shift" | "Meta";

// Structured representation of a hotkey combination
export interface HotkeyDefinition {
  modifiers: HotkeyModifier[];  // e.g., ["Control", "Shift"]
  key: string;                   // e.g., "D" or "1" or "Space"
}

// ============================================================================
// Voice Command Types
// ============================================================================

// Represents a main system hotkey (Voice to Text, AI Transform, etc.)
export interface MainHotkeyAction {
  type: "main";
  id: string;
  name: string;  // e.g., "Voice to Text", "AI Transform"
  hotkey: string;
}

// Result of matching spoken text against available actions
export interface VoiceCommandMatch {
  action: Action | MainHotkeyAction;
  confidence: number;  // 0-1, where 1 = exact match
  matchType: "exact" | "contains" | "fuzzy";
}

// ============================================================================
// Unified Action model (runtime execution/matching layer)
// ============================================================================
// The persisted schema still stores two arrays (WebhookAction[] + PromptAction[]);
// see config.json / config.rs. At runtime they are normalized into this single
// discriminated `Action` type (via src/utils/actions.ts) so voice matching,
// hotkey registration, and execution all operate on one shape with an explicit
// `kind` tag instead of sniffing object shape. New kinds (e.g. brand-paste) and
// per-action provider/model overrides slot in here without deepening the sprawl.
// The persisted collapse into a single `actions` array happens in P1-migrate.
export type ActionKind = "webhook" | "url" | "smart_url" | "prompt" | "brand_paste";

export interface Action {
  id: string;
  name: string;
  hotkey: string;       // "" = voice-only (no global hotkey registered)
  enabled: boolean;
  kind: ActionKind;

  // Per-action provider/model override (P1-provfield). Unset → global default.
  provider?: TransformProvider;
  model?: string;

  // Kind-specific fields (populated by the mapper per kind; all optional so the
  // discriminated union stays a single struct that mirrors the persisted shapes).
  webhookUrl?: string;                                   // webhook (POST/GET) + url
  method?: "POST" | "GET" | "URL" | "SMART_URL" | "PROMPT"; // preserved from WebhookAction for lossless mapping
  headers?: Record<string, string>;                      // webhook
  askChromeProfile?: boolean;                            // url
  prompt?: string;                                       // prompt
  requiresSelection?: boolean;                           // prompt
  brandDocId?: string;                                   // brand_paste (id of the doc to lazy-load + paste)
}

// ============================================================================
// Brand Asset Library (Track D)
// ============================================================================
// Brand docs are persisted backend-side (brands.json + one .txt per doc under
// <config_dir>/SpeakEasy/brands/), NOT in config.json and NOT in the localStorage
// zustand store (§5b). This metadata mirror is hydrated into a TRANSIENT (non-
// persisted) store slice; bodies stay backend-side and are lazy-loaded at paste
// time via `load_brand_doc`. Mirrors the Rust `BrandDocMeta` struct in brands.rs.
export interface BrandDocMeta {
  id: string;
  name: string;
  brand: string;   // optional grouping label ("" = ungrouped)
  hotkey: string;  // optional global hotkey ("" = voice/click only)
  bytes: number;   // body size (for display; body itself is never in metadata)
  created_at: string;
  updated_at: string;
}

// Webhook/Hotkey Action for Transform feature
// method values:
// - "POST" / "GET": webhook transform (copy selection → call backend → paste response)
// - "URL": open a preset URL in Chrome
// - "SMART_URL": copy highlighted text, if URL-like open it, else Google search it
// - "PROMPT": apply a stored prompt to selected text via AI Transform
export interface WebhookAction {
  id: string;
  name: string;
  hotkey: string; // e.g., "Control+1", "Control+2", etc.
  webhookUrl: string; // For POST/GET: webhook endpoint; For URL: preset website URL; For SMART_URL/PROMPT: unused
  method: "POST" | "GET" | "URL" | "SMART_URL" | "PROMPT";
  headers?: Record<string, string>;
  enabled: boolean;
  // Chrome profile targeting (for URL method)
  // When true, shows a profile chooser before opening the URL
  askChromeProfile?: boolean;
  // For PROMPT method: the stored prompt template (use {{text}} for selected text placeholder)
  prompt?: string;
  // For PROMPT method: when false, runs prompt standalone without copying selected text
  requiresSelection?: boolean;
  // Per-action LLM provider/model override (P1-provfield). Unset → global default.
  // Only meaningful for PROMPT-method actions (LLM transforms).
  provider?: TransformProvider;
  model?: string;
}

// Prompt Action for LLM-based transforms with stored prompts
// Bypasses webhooks and voice - directly applies a stored prompt to selected text
export interface PromptAction {
  id: string;
  name: string;           // e.g., "Add Emojis", "Fix Grammar"
  hotkey: string;         // e.g., "Control+Shift+E"
  prompt: string;         // The stored prompt, use {{text}} for selected text placeholder
  enabled: boolean;
  requiresSelection: boolean; // When false, runs prompt standalone without copying selected text
  // Per-action LLM provider/model override (P1-provfield). Unset → global default.
  provider?: TransformProvider;
  model?: string;
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

// Unified persisted action (snake_case; mirrors the Rust `Action` struct in
// config.rs). This is the v3 on-disk shape — a single `actions[]` array replaces
// the legacy webhook_actions[] + prompt_actions[] split. A `method` field means
// the entry originated as a WebhookAction; its ABSENCE means it originated as a
// PromptAction — that's how the expand step (fileActionsToArrays) routes each
// entry back to the correct in-memory array losslessly.
export interface FileAction {
  id: string;
  name: string;
  hotkey: string;
  enabled: boolean;
  kind: ActionKind;
  // Per-action LLM provider/model override (P1-provfield). Unset → global default.
  provider?: string;
  model?: string;
  // Webhook-origin fields (present ⇒ came from WebhookAction).
  webhook_url?: string;
  method?: string; // "POST" | "GET" | "URL" | "SMART_URL" | "PROMPT"
  headers?: Record<string, string>;
  ask_chrome_profile?: boolean;
  // Prompt fields (webhook PROMPT-method actions and PromptActions both set these).
  prompt?: string;
  requires_selection?: boolean;
}

export interface FileWebhookAction {
  id: string;
  name: string;
  hotkey: string;
  webhook_url: string;
  method: string;
  headers?: Record<string, string>;
  enabled: boolean;
  ask_chrome_profile?: boolean;
  prompt?: string;
  requires_selection?: boolean;
  provider?: string;
  model?: string;
}

export interface FilePromptAction {
  id: string;
  name: string;
  hotkey: string;
  prompt: string;
  enabled: boolean;
  requires_selection?: boolean;
  provider?: string;
  model?: string;
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
  // v3 unified persisted actions. Optional so old v2 configs (which have only the
  // two legacy arrays below) still deserialize; written on every save going forward.
  actions?: FileAction[];
  // Legacy v2 arrays — read-only migration inputs for old configs. Still optional
  // on write so a downgraded read doesn't hard-fail, but v3 saves emit `actions[]`.
  webhook_actions?: FileWebhookAction[];
  prompt_actions?: FilePromptAction[];  // Optional for backward compatibility
  // Voice command settings (optional for backward compatibility)
  hotkey_voice_command?: string;
  voice_command_enabled?: boolean;
  voice_command_auto_execute_threshold?: number;

  // Cursor Lock settings (optional for backward compatibility)
  cursor_lock_enabled?: boolean;
  hotkey_lock_target?: string;
  lock_target_auto_enter?: boolean;
}

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { invoke } from "@tauri-apps/api/core";
import type {
  User,
  UserSettings,
  Transcription,
  RecordingState,
  VocabularyEntry,
  FileUserSettings,
  FileWebhookAction,
  FilePromptAction,
  WebhookAction,
  PromptAction,
  AutoPasteMode,
  DisplayMode,
  TransformProvider,
} from "../types";
import { SETTINGS_SCHEMA_VERSION } from "../types";

// ============================================================================
// Settings conversion helpers (camelCase <-> snake_case for Rust interop)
// ============================================================================

function convertWebhookToSnakeCase(action: WebhookAction): FileWebhookAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    webhook_url: action.webhookUrl,
    method: action.method,
    headers: action.headers,
    enabled: action.enabled,
    ask_chrome_profile: action.askChromeProfile,
  };
}

function convertWebhookToCamelCase(action: FileWebhookAction): WebhookAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    webhookUrl: action.webhook_url,
    method: action.method as WebhookAction["method"],
    headers: action.headers,
    enabled: action.enabled,
    askChromeProfile: action.ask_chrome_profile,
  };
}

function convertPromptToSnakeCase(action: PromptAction): FilePromptAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    prompt: action.prompt,
    enabled: action.enabled,
  };
}

function convertPromptToCamelCase(action: FilePromptAction): PromptAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    prompt: action.prompt,
    enabled: action.enabled,
  };
}

function convertSettingsToSnakeCase(settings: UserSettings): FileUserSettings {
  return {
    settings_version: settings.settingsVersion ?? SETTINGS_SCHEMA_VERSION,
    hotkey_record: settings.hotkeyRecord,
    hotkey_ai_transform: settings.hotkeyAiTransform,
    hotkey_history: settings.hotkeyHistory,
    auto_paste_mode: settings.autoPasteMode,
    display_mode: settings.displayMode,
    language: settings.language,
    translate_to_english: settings.translateToEnglish,
    audio_enabled: settings.audioEnabled,
    floating_indicator: settings.floatingIndicator,
    history_limit_mb: settings.historyLimitMb,
    start_on_boot: settings.startOnBoot,
    start_minimized: settings.startMinimized,
    selected_microphone: settings.selectedMicrophone,
    transform_provider: settings.transformProvider,
    transform_model: settings.transformModel,
    transform_temperature: settings.transformTemperature ?? 0.7,
    transform_max_tokens: settings.transformMaxTokens ?? 4096,
    webhook_actions: settings.webhookActions.map(convertWebhookToSnakeCase),
    prompt_actions: settings.promptActions.map(convertPromptToSnakeCase),
  };
}

function convertSettingsToCamelCase(fileSettings: FileUserSettings): UserSettings {
  return {
    settingsVersion: fileSettings.settings_version ?? SETTINGS_SCHEMA_VERSION,
    hotkeyRecord: fileSettings.hotkey_record,
    hotkeyAiTransform: fileSettings.hotkey_ai_transform,
    hotkeyHistory: fileSettings.hotkey_history,
    autoPasteMode: fileSettings.auto_paste_mode as AutoPasteMode,
    displayMode: fileSettings.display_mode as DisplayMode,
    language: fileSettings.language,
    translateToEnglish: fileSettings.translate_to_english,
    audioEnabled: fileSettings.audio_enabled,
    floatingIndicator: fileSettings.floating_indicator,
    historyLimitMb: fileSettings.history_limit_mb,
    startOnBoot: fileSettings.start_on_boot,
    startMinimized: fileSettings.start_minimized,
    selectedMicrophone: fileSettings.selected_microphone,
    transformProvider: fileSettings.transform_provider as TransformProvider,
    transformModel: fileSettings.transform_model,
    transformTemperature: fileSettings.transform_temperature,
    transformMaxTokens: fileSettings.transform_max_tokens,
    webhookActions: fileSettings.webhook_actions.map(convertWebhookToCamelCase),
    promptActions: (fileSettings.prompt_actions ?? []).map(convertPromptToCamelCase),
  };
}

// ============================================================================
// Debounced settings save to file
// ============================================================================

let saveSettingsTimeout: ReturnType<typeof setTimeout> | null = null;

function debouncedSaveSettingsToFile(settings: UserSettings) {
  if (saveSettingsTimeout) {
    clearTimeout(saveSettingsTimeout);
  }
  saveSettingsTimeout = setTimeout(async () => {
    try {
      const fileSettings = convertSettingsToSnakeCase(settings);
      await invoke("save_user_settings", { settings: fileSettings });
      console.log("[Settings] Saved to file");
    } catch (error) {
      console.error("[Settings] Failed to save to file:", error);
    }
  }, 500); // 500ms debounce
}

// ============================================================================
// One-time migration from localStorage to file-based storage
// ============================================================================

async function migrateSettingsFromLocalStorage(): Promise<void> {
  const migrationKey = "speakeasy-settings-migrated-to-file-v1";

  // Check if already migrated
  if (localStorage.getItem(migrationKey)) {
    return;
  }

  try {
    const oldData = localStorage.getItem("speakeasy-storage");
    if (!oldData) {
      localStorage.setItem(migrationKey, "true");
      return;
    }

    const parsed = JSON.parse(oldData);
    const oldSettings = parsed.state?.settings;

    if (oldSettings) {
      console.log("[Settings] Migrating from localStorage to file...");

      // Save to file via Tauri
      const fileSettings = convertSettingsToSnakeCase(oldSettings);
      await invoke("save_user_settings", { settings: fileSettings });

      console.log("[Settings] Migration complete - settings now persist to config.json");
    }

    localStorage.setItem(migrationKey, "true");
  } catch (error) {
    console.error("[Settings] Migration failed:", error);
  }
}

interface AppState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;

  // API key for Whisper (transcription only)
  apiKey: string | null;

  // Recording state
  recordingState: RecordingState;
  recordingStartTime: number | null;
  currentAudioLevel: number;

  // Transcription state
  lastTranscription: Transcription | null;
  history: Transcription[];

  // Settings
  settings: UserSettings;

  // Vocabulary
  vocabulary: VocabularyEntry[];

  // UI state
  isSettingsOpen: boolean;
  isHistoryOpen: boolean;
  isCapturingHotkey: boolean;

  // Actions
  initialize: () => Promise<void>;
  setUser: (user: User | null) => void;
  setApiKey: (apiKey: string | null) => void;
  setRecordingState: (state: RecordingState) => void;
  startRecording: () => void;
  stopRecording: () => void;
  addTranscription: (transcription: Transcription) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setSettingsOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setCapturingHotkey: (capturing: boolean) => void;
  clearHistory: () => void;
  deleteTranscription: (id: string) => void;
}

const defaultSettings: UserSettings = {
  settingsVersion: SETTINGS_SCHEMA_VERSION,
  
  // Hotkeys
  hotkeyRecord: "Control+Space",
  hotkeyAiTransform: "Control+Backquote",
  hotkeyHistory: "Control+H",
  
  // Transcription settings
  autoPasteMode: "smart",
  displayMode: "direct",
  language: "en",
  translateToEnglish: false,
  audioEnabled: true,
  floatingIndicator: false,
  historyLimitMb: 10,
  startOnBoot: false,
  startMinimized: true,
  selectedMicrophone: null,
  
  // Transform settings (API keys are stored securely in backend, not here)
  transformProvider: "openrouter",
  transformModel: "openai/gpt-4o-mini", // OpenRouter model ID format
  transformTemperature: 0.7,
  transformMaxTokens: 4096,

  // Webhook actions
  webhookActions: [],

  // Prompt actions (LLM-based transforms with stored prompts)
  promptActions: [],
};

/**
 * Migrate settings from older schema versions to current version.
 * This ensures existing users don't lose settings when we add new fields.
 */
function migrateSettings(settings: Partial<UserSettings>): UserSettings {
  const version = settings.settingsVersion ?? 1;
  
  // Start with defaults, then overlay saved settings
  const migrated: UserSettings = { ...defaultSettings, ...settings };
  
  // Migration: v1 -> v2 (added transform provider/model settings)
  if (version < 2) {
    // These fields didn't exist in v1, so use defaults
    migrated.transformProvider = migrated.transformProvider ?? "openrouter";
    migrated.transformModel = migrated.transformModel ?? "openai/gpt-4o-mini";
    migrated.transformTemperature = migrated.transformTemperature ?? 0.7;
    migrated.transformMaxTokens = migrated.transformMaxTokens ?? 4096;
    
    console.log("Migrated settings from v1 to v2 (added transform settings)");
  }
  
  // Always update to current version after migration
  migrated.settingsVersion = SETTINGS_SCHEMA_VERSION;
  
  return migrated;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      apiKey: null,
      recordingState: "idle",
      recordingStartTime: null,
      currentAudioLevel: 0,
      lastTranscription: null,
      history: [],
      settings: defaultSettings,
      vocabulary: [],
      isSettingsOpen: false,
      isHistoryOpen: false,
      isCapturingHotkey: false,

      // Actions
      initialize: async () => {
        try {
          // First, try to migrate from localStorage (one-time)
          await migrateSettingsFromLocalStorage();

          // Load settings from file-based storage
          const fileSettings = await invoke<FileUserSettings>("load_user_settings");
          const settings = convertSettingsToCamelCase(fileSettings);
          const migratedSettings = migrateSettings(settings);

          set({ settings: migratedSettings });
          console.log("[Settings] Loaded from file");
        } catch (error) {
          console.error("[Settings] Failed to load from file, using defaults:", error);
        }

        console.log("SpeakEasy initialized");
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
      },

      setApiKey: (apiKey) => {
        set({ apiKey });
      },

      setRecordingState: (recordingState) => {
        set({ recordingState });
      },

      startRecording: () => {
        set({
          recordingState: "recording",
          recordingStartTime: Date.now(),
        });
      },

      stopRecording: () => {
        set({
          recordingState: "processing",
          recordingStartTime: null,
        });
      },

      addTranscription: (transcription) => {
        const { history, settings } = get();
        const newHistory = [transcription, ...history];

        // Calculate approximate size and trim if needed
        const historyJson = JSON.stringify(newHistory);
        const sizeMb = new Blob([historyJson]).size / (1024 * 1024);

        if (sizeMb > settings.historyLimitMb) {
          // Remove oldest entries until under limit
          while (newHistory.length > 0) {
            const trimmedJson = JSON.stringify(newHistory);
            const trimmedSize = new Blob([trimmedJson]).size / (1024 * 1024);
            if (trimmedSize <= settings.historyLimitMb) break;
            newHistory.pop();
          }
        }

        set({
          lastTranscription: transcription,
          history: newHistory,
          recordingState: "idle",
        });
      },

      updateSettings: (newSettings) => {
        set((state) => {
          const updatedSettings = { ...state.settings, ...newSettings };
          // Debounced save to file (survives reinstalls)
          debouncedSaveSettingsToFile(updatedSettings);
          return { settings: updatedSettings };
        });
      },

      setSettingsOpen: (isSettingsOpen) => {
        set({ isSettingsOpen });
      },

      setHistoryOpen: (isHistoryOpen) => {
        set({ isHistoryOpen });
      },

      setCapturingHotkey: (isCapturingHotkey) => {
        set({ isCapturingHotkey });
      },

      clearHistory: () => {
        set({ history: [] });
      },

      deleteTranscription: (id) => {
        set((state) => ({
          history: state.history.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: "speakeasy-storage",
      // NOTE: Settings are NO LONGER stored in localStorage - they persist to file
      // via config.json which survives app reinstalls. Only transient data lives here.
      partialize: (state) => ({
        // Settings removed - now stored in config.json file (survives reinstalls)
        history: state.history,
        vocabulary: state.vocabulary,
        apiKey: state.apiKey,
      }),
      // Merge localStorage data with current state
      // Settings are loaded separately from file in initialize()
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;

        return {
          ...currentState,
          // Only merge non-settings data from localStorage
          history: persisted.history ?? currentState.history,
          vocabulary: persisted.vocabulary ?? currentState.vocabulary,
          apiKey: persisted.apiKey ?? currentState.apiKey,
          // Settings come from file, not localStorage (set in initialize())
        };
      },
    }
  )
);

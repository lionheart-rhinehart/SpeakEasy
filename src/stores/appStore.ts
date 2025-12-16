import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  UserSettings,
  Transcription,
  RecordingState,
  VocabularyEntry,
} from "../types";
import { SETTINGS_SCHEMA_VERSION } from "../types";

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
  showStatusBar: true,
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
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        }));
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
      partialize: (state) => ({
        settings: state.settings,
        history: state.history,
        vocabulary: state.vocabulary,
        apiKey: state.apiKey,
      }),
      // Migrate settings on load to handle schema changes
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        
        // Migrate settings if present
        const migratedSettings = persisted.settings
          ? migrateSettings(persisted.settings)
          : currentState.settings;
        
        return {
          ...currentState,
          ...persisted,
          settings: migratedSettings,
        };
      },
    }
  )
);

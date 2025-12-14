import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/appStore";
import type { AutoPasteMode, WebhookAction, TransformProvider, ApiKeyStatus } from "../types";

// Model info from provider API
interface ProviderModel {
  id: string;
  name: string;
  description: string | null;
  context_length: number | null;
}

const PROVIDER_INFO: Record<TransformProvider, { name: string; description: string }> = {
  openrouter: { name: "OpenRouter", description: "Access many models with one API key" },
  openai: { name: "OpenAI (Direct)", description: "Direct connection to OpenAI" },
  anthropic: { name: "Anthropic (Direct)", description: "Direct connection to Claude" },
};

// Helper to convert keyboard event to Tauri hotkey format
function keyEventToHotkey(e: KeyboardEvent): string | null {
  // Ignore if only modifier keys
  if (["Control", "Alt", "Shift", "Meta"].includes(e.key)) {
    return null;
  }

  const parts: string[] = [];
  if (e.ctrlKey) parts.push("Control");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");

  // Map special keys to Tauri format
  const keyMap: Record<string, string> = {
    " ": "Space",
    "`": "Backquote",
    "~": "Backquote", // Shift+backtick
    "Dead": "Backquote", // Backtick on some keyboard layouts reports as "Dead"
    "-": "Minus",
    "_": "Minus", // Shift+minus
    "=": "Equal",
    "+": "Equal", // Shift+equal (when not on numpad)
    "[": "BracketLeft",
    "{": "BracketLeft",
    "]": "BracketRight",
    "}": "BracketRight",
    "\\": "Backslash",
    "|": "Backslash",
    ";": "Semicolon",
    ":": "Semicolon",
    "'": "Quote",
    "\"": "Quote",
    ",": "Comma",
    "<": "Comma",
    ".": "Period",
    ">": "Period",
    "/": "Slash",
    "?": "Slash",
    "ArrowUp": "ArrowUp",
    "ArrowDown": "ArrowDown",
    "ArrowLeft": "ArrowLeft",
    "ArrowRight": "ArrowRight",
    "Enter": "Enter",
    "Tab": "Tab",
    "Escape": "Escape",
    "Backspace": "Backspace",
    "Delete": "Delete",
    "Home": "Home",
    "End": "End",
    "PageUp": "PageUp",
    "PageDown": "PageDown",
  };

  // Also check e.code for more reliable key detection (especially for backtick)
  const codeMap: Record<string, string> = {
    "Backquote": "Backquote",
    "Minus": "Minus",
    "Equal": "Equal",
    "BracketLeft": "BracketLeft",
    "BracketRight": "BracketRight",
    "Backslash": "Backslash",
    "Semicolon": "Semicolon",
    "Quote": "Quote",
    "Comma": "Comma",
    "Period": "Period",
    "Slash": "Slash",
  };

  // Prefer code-based detection for special keys, fall back to key-based
  let key = codeMap[e.code] || keyMap[e.key] || e.key.toUpperCase();

  // Handle function keys
  if (e.key.startsWith("F") && !isNaN(parseInt(e.key.substring(1)))) {
    key = e.key.toUpperCase();
  }

  // Handle letter keys (already uppercase from above)
  // Handle number keys
  if (/^[0-9]$/.test(e.key)) {
    key = e.key;
  }

  parts.push(key);
  return parts.join("+");
}

// Helper to display hotkey in user-friendly format
function formatHotkeyDisplay(hotkey: string): string {
  return hotkey
    .replace("Control", "Ctrl")
    .replace("Backquote", "`")
    .replace("Space", "Space")
    .replace("Minus", "-")
    .replace("Equal", "=");
}

interface AudioDevice {
  name: string;
  is_default: boolean;
}

export default function SettingsPanel() {
  const { settings, isSettingsOpen, setSettingsOpen, updateSettings, apiKey, setApiKey, setCapturingHotkey } = useAppStore();
  const [tempApiKey, setTempApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookAction | null>(null);
  const [isAddingWebhook, setIsAddingWebhook] = useState(false);
  const [capturingHotkeyState, setCapturingHotkeyState] = useState<"record" | "aiTransform" | null>(null);
  const [autostart, setAutostart] = useState(false);
  
  // Transform provider settings
  const [transformKeyStatuses, setTransformKeyStatuses] = useState<ApiKeyStatus[]>([]);
  const [tempTransformApiKey, setTempTransformApiKey] = useState("");
  const [isSettingTransformKey, setIsSettingTransformKey] = useState(false);
  const [customModel, setCustomModel] = useState("");
  const [showAdvancedTransform, setShowAdvancedTransform] = useState(false);
  const [providerModels, setProviderModels] = useState<ProviderModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  
  // Refs to prevent infinite refetch loops (these don't trigger re-renders)
  const inFlightRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const cachedModelsRef = useRef<ProviderModel[]>([]);

  // Load audio devices, autostart state, and transform key statuses when panel opens
  useEffect(() => {
    if (isSettingsOpen) {
      loadAudioDevices();
      loadAutostartState();
      loadTransformKeyStatuses();
    }
  }, [isSettingsOpen]);

  // Load transform API key statuses
  const loadTransformKeyStatuses = async () => {
    try {
      const statuses = await invoke<ApiKeyStatus[]>("get_all_transform_api_key_statuses");
      setTransformKeyStatuses(statuses);
    } catch (error) {
      console.error("Failed to load transform API key statuses:", error);
    }
  };

  // Get key status for current provider
  const getCurrentProviderKeyStatus = useCallback((): ApiKeyStatus | undefined => {
    return transformKeyStatuses.find(s => s.provider === settings.transformProvider);
  }, [transformKeyStatuses, settings.transformProvider]);

  // Fetch available models from the current provider's API
  const fetchModelsForProvider = useCallback(async (force = false) => {
    const keyStatus = getCurrentProviderKeyStatus();
    if (!keyStatus?.is_set) {
      setProviderModels([]);
      setModelsError(null);
      cachedModelsRef.current = [];
      return;
    }

    // ALWAYS check in-flight guard first (even for force=true)
    if (inFlightRef.current) {
      console.log("Model fetch already in progress, skipping");
      return;
    }

    // Skip if fetched recently (within 30 seconds) unless forced
    const now = Date.now();
    if (!force && (now - lastFetchTimeRef.current < 30000 && cachedModelsRef.current.length > 0)) {
      console.log("Using cached models (fetched recently)");
      return;
    }

    inFlightRef.current = true;
    setIsLoadingModels(true);
    setModelsError(null);
    
    try {
      // Add a 20-second timeout to prevent UI from hanging forever
      const fetchPromise = invoke<ProviderModel[]>("fetch_provider_models", {
        provider: settings.transformProvider,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Model fetch timed out after 20 seconds. Please check your internet connection.")), 20000)
      );
      
      const models = await Promise.race([fetchPromise, timeoutPromise]);
      
      setProviderModels(models);
      cachedModelsRef.current = models;
      lastFetchTimeRef.current = Date.now();
      
      // If current model isn't in the list and we have models, select the first one
      if (models.length > 0 && !models.some(m => m.id === settings.transformModel)) {
        updateSettings({ transformModel: models[0].id });
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      setModelsError(String(error));
      setProviderModels([]);
      cachedModelsRef.current = [];
    } finally {
      inFlightRef.current = false;
      setIsLoadingModels(false);
    }
  }, [settings.transformProvider, settings.transformModel, getCurrentProviderKeyStatus, updateSettings]);

  // Handler for auto-refresh when model dropdown is focused
  const handleModelDropdownFocus = useCallback(() => {
    fetchModelsForProvider(false); // Don't force, respect the 30-second cache
  }, [fetchModelsForProvider]);

  // Fetch models when provider changes or key is set
  useEffect(() => {
    if (isSettingsOpen) {
      const keyStatus = transformKeyStatuses.find(s => s.provider === settings.transformProvider);
      if (keyStatus?.is_set) {
        fetchModelsForProvider(true); // Force refresh when settings open or provider changes
      }
    }
  // Only depend on primitive values to avoid infinite loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSettingsOpen, settings.transformProvider, transformKeyStatuses.find(s => s.provider === settings.transformProvider)?.is_set]);

  // Set transform API key for current provider
  const handleSetTransformApiKey = async () => {
    if (!tempTransformApiKey.trim()) return;
    
    setIsSettingTransformKey(true);
    try {
      await invoke("set_transform_api_key", {
        provider: settings.transformProvider,
        apiKey: tempTransformApiKey.trim(),
      });
      setTempTransformApiKey("");
      await loadTransformKeyStatuses();
      // Models will be fetched automatically via the useEffect
    } catch (error) {
      console.error("Failed to set transform API key:", error);
      alert(`Failed to save API key: ${error}`);
    } finally {
      setIsSettingTransformKey(false);
    }
  };

  // Clear transform API key for current provider
  const handleClearTransformApiKey = async () => {
    if (!confirm(`Remove ${PROVIDER_INFO[settings.transformProvider].name} API key?`)) return;
    
    try {
      await invoke("clear_transform_api_key", { provider: settings.transformProvider });
      await loadTransformKeyStatuses();
      setProviderModels([]);
    } catch (error) {
      console.error("Failed to clear transform API key:", error);
    }
  };

  const loadAutostartState = async () => {
    try {
      const enabled = await invoke<boolean>("get_autostart");
      setAutostart(enabled);
    } catch (error) {
      console.error("Failed to get autostart state:", error);
    }
  };

  const handleAutostartChange = async (enabled: boolean) => {
    try {
      const result = await invoke<boolean>("set_autostart", { enabled });
      setAutostart(result);
      updateSettings({ startOnBoot: result });
    } catch (error) {
      console.error("Failed to set autostart:", error);
    }
  };

  // Hotkey capture handler
  useEffect(() => {
    if (!capturingHotkeyState) {
      setCapturingHotkey(false); // Notify global state
      return;
    }

    // Notify global state that we're capturing (disables global hotkeys)
    setCapturingHotkey(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const hotkey = keyEventToHotkey(e);
      if (!hotkey) return; // Only modifier keys pressed

      if (capturingHotkeyState === "record") {
        updateSettings({ hotkeyRecord: hotkey });
      } else if (capturingHotkeyState === "aiTransform") {
        updateSettings({ hotkeyAiTransform: hotkey });
      }

      setCapturingHotkeyState(null);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCapturingHotkeyState(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleEscape);
      setCapturingHotkey(false);
    };
  }, [capturingHotkeyState, updateSettings, setCapturingHotkey]);

  const loadAudioDevices = async () => {
    setLoadingDevices(true);
    try {
      const devices = await invoke<AudioDevice[]>("get_audio_devices");
      setAudioDevices(devices);
    } catch (error) {
      console.error("Failed to load audio devices:", error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleMicrophoneChange = async (deviceName: string | null) => {
    try {
      await invoke("set_audio_device", { deviceName });
      updateSettings({ selectedMicrophone: deviceName });
    } catch (error) {
      console.error("Failed to set audio device:", error);
    }
  };

  // Ensure webhookActions is always an array (handles initial state before persist loads)
  const webhookActions = settings.webhookActions ?? [];

  // Webhook management functions
  const addWebhookAction = (webhook: Omit<WebhookAction, "id">) => {
    const newWebhook: WebhookAction = {
      ...webhook,
      id: crypto.randomUUID(),
    };
    updateSettings({
      webhookActions: [...webhookActions, newWebhook],
    });
    setIsAddingWebhook(false);
    setEditingWebhook(null);
  };

  const updateWebhookAction = (webhook: WebhookAction) => {
    updateSettings({
      webhookActions: webhookActions.map((w) =>
        w.id === webhook.id ? webhook : w
      ),
    });
    setEditingWebhook(null);
  };

  const deleteWebhookAction = (id: string) => {
    if (confirm("Delete this webhook action?")) {
      updateSettings({
        webhookActions: webhookActions.filter((w) => w.id !== id),
      });
    }
  };

  const toggleWebhookEnabled = (id: string) => {
    updateSettings({
      webhookActions: webhookActions.map((w) =>
        w.id === id ? { ...w, enabled: !w.enabled } : w
      ),
    });
  };

  if (!isSettingsOpen) return null;

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      setTempApiKey("");
    }
  };

  const handleClearApiKey = () => {
    if (confirm("Remove API key?")) {
      setApiKey(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1 text-text-secondary hover:text-text-primary rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Whisper Transcription API Key Section */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-1">Whisper Transcription API Key</h3>
            <p className="text-xs text-text-secondary mb-3">
              For voice-to-text only. This key is separate from AI Transform settings below.
            </p>
            {apiKey ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono">
                    {showApiKey ? apiKey : "sk-••••••••••••••••"}
                  </div>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 text-text-secondary hover:text-text-primary"
                    title={showApiKey ? "Hide" : "Show"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {showApiKey ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                </div>
                <button
                  onClick={handleClearApiKey}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Remove API Key
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  onClick={handleSaveApiKey}
                  disabled={!tempApiKey.trim()}
                  className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Save API Key
                </button>
              </div>
            )}
          </section>

          {/* Usage Statistics - Placeholder for future API integration */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Usage Statistics</h3>
            <div className="p-4 bg-slate-50 rounded-lg text-center">
              <svg className="w-8 h-8 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-sm text-text-secondary mb-1">Coming Soon</p>
              <p className="text-xs text-text-secondary">
                Live usage data requires Admin API access.
                <br />
                View your usage at{" "}
                <a 
                  href="https://platform.openai.com/usage" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary-500 hover:text-primary-700 underline"
                >
                  platform.openai.com/usage
                </a>
              </p>
            </div>
          </section>

          {/* Microphone Selection */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Microphone</h3>
            {loadingDevices ? (
              <div className="text-sm text-text-secondary">Loading devices...</div>
            ) : (
              <div className="space-y-2">
                <select
                  value={settings.selectedMicrophone || ""}
                  onChange={(e) => handleMicrophoneChange(e.target.value || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">System Default</option>
                  {audioDevices.map((device) => (
                    <option key={device.name} value={device.name}>
                      {device.name} {device.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={loadAudioDevices}
                  className="text-xs text-primary-500 hover:text-primary-700"
                >
                  Refresh device list
                </button>
              </div>
            )}
          </section>

          {/* Auto-Paste Mode */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Auto-Paste Mode</h3>
            <div className="space-y-2">
              {(["always", "smart", "never"] as AutoPasteMode[]).map((mode) => (
                <label
                  key={mode}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="autoPasteMode"
                    value={mode}
                    checked={settings.autoPasteMode === mode}
                    onChange={() => updateSettings({ autoPasteMode: mode })}
                    className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-text-primary capitalize">{mode}</p>
                    <p className="text-xs text-text-secondary">
                      {mode === "always" && "Always paste transcription automatically"}
                      {mode === "smart" && "Paste when a text field is focused"}
                      {mode === "never" && "Only copy to clipboard, don't paste"}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Audio Feedback */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Audio Feedback</h3>
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Sound effects</p>
                <p className="text-xs text-text-secondary">Play sounds for recording start/stop</p>
              </div>
              <input
                type="checkbox"
                checked={settings.audioEnabled}
                onChange={(e) => updateSettings({ audioEnabled: e.target.checked })}
                className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
            </label>
          </section>

          {/* Startup */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Startup</h3>
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Start on boot</p>
                <p className="text-xs text-text-secondary">Launch SpeakEasy when you log in</p>
              </div>
              <input
                type="checkbox"
                checked={autostart}
                onChange={(e) => handleAutostartChange(e.target.checked)}
                className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
            </label>
          </section>

          {/* Language */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Transcription Language</h3>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="auto">Auto-detect</option>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="it">Italian</option>
              <option value="pt">Portuguese</option>
              <option value="nl">Dutch</option>
              <option value="pl">Polish</option>
              <option value="ru">Russian</option>
              <option value="ja">Japanese</option>
              <option value="ko">Korean</option>
              <option value="zh">Chinese</option>
              <option value="tl">Tagalog (Filipino)</option>
            </select>
          </section>

          {/* Translate to English */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Translation</h3>
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Translate to English</p>
                <p className="text-xs text-text-secondary">Speak in any language, get English output</p>
              </div>
              <input
                type="checkbox"
                checked={settings.translateToEnglish}
                onChange={(e) => updateSettings({ translateToEnglish: e.target.checked })}
                className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
              />
            </label>
            {settings.translateToEnglish && (
              <p className="text-xs text-primary-600 mt-2 p-2 bg-primary-50 rounded-lg">
                Translation mode enabled: Your speech will be automatically translated to English.
              </p>
            )}
          </section>

          {/* AI Transform Provider Settings */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">AI Transform Settings</h3>
            <p className="text-xs text-text-secondary mb-3">
              Configure the LLM provider and model for the AI Transform hotkey ({formatHotkeyDisplay(settings.hotkeyAiTransform || "Ctrl+`")}).
            </p>

            {/* Provider Selection */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-secondary mb-1">Provider</label>
                <select
                  value={settings.transformProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as TransformProvider;
                    // Clear models - they'll be fetched via useEffect when provider changes
                    setProviderModels([]);
                    setModelsError(null);
                    updateSettings({
                      transformProvider: newProvider,
                      // Keep current model - will be validated/updated when new models load
                    });
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {(Object.keys(PROVIDER_INFO) as TransformProvider[]).map((provider) => (
                    <option key={provider} value={provider}>
                      {PROVIDER_INFO[provider].name} — {PROVIDER_INFO[provider].description}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key for selected provider */}
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  {PROVIDER_INFO[settings.transformProvider].name} API Key
                  {settings.transformProvider === "openai" && (
                    <span className="text-text-secondary font-normal"> (separate from Whisper above)</span>
                  )}
                </label>
                {(() => {
                  const keyStatus = getCurrentProviderKeyStatus();
                  if (keyStatus?.is_set) {
                    return (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-mono text-green-700">
                          {keyStatus.preview || "••••••••"}
                        </div>
                        <button
                          onClick={handleClearTransformApiKey}
                          className="px-3 py-2 text-red-500 hover:text-red-700 text-sm"
                          title="Remove API Key"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-2">
                      <input
                        type="password"
                        value={tempTransformApiKey}
                        onChange={(e) => setTempTransformApiKey(e.target.value)}
                        placeholder={settings.transformProvider === "anthropic" ? "sk-ant-..." : "sk-..."}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleSetTransformApiKey}
                        disabled={!tempTransformApiKey.trim() || isSettingTransformKey}
                        className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSettingTransformKey ? "Saving..." : "Save API Key"}
                      </button>
                    </div>
                  );
                })()}
                <p className="text-xs text-text-secondary mt-1">
                  {settings.transformProvider === "openrouter" && (
                    <>Get your key at <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">openrouter.ai/keys</a></>
                  )}
                  {settings.transformProvider === "openai" && (
                    <>Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">platform.openai.com/api-keys</a> (can be same key as Whisper)</>
                  )}
                  {settings.transformProvider === "anthropic" && (
                    <>Get your key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">console.anthropic.com</a></>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1 italic">
                  This key is for AI Transform only. Does not affect Whisper transcription.
                </p>
              </div>

              {/* Model Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-text-secondary">Model</label>
                  {getCurrentProviderKeyStatus()?.is_set && (
                    <button
                      onClick={() => fetchModelsForProvider(true)}
                      disabled={isLoadingModels}
                      className="text-xs text-primary-500 hover:text-primary-700 disabled:opacity-50"
                    >
                      {isLoadingModels ? "Loading..." : "Refresh"}
                    </button>
                  )}
                </div>
                
                {!getCurrentProviderKeyStatus()?.is_set ? (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-text-secondary">
                    Add API key above to see available models
                  </div>
                ) : isLoadingModels ? (
                  <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-text-secondary">
                    Loading available models...
                  </div>
                ) : modelsError ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {modelsError}
                    </div>
                    {/* Fallback to custom model input */}
                    <input
                      type="text"
                      value={settings.transformModel}
                      onChange={(e) => updateSettings({ transformModel: e.target.value })}
                      placeholder="Enter model ID manually"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    />
                  </div>
                ) : providerModels.length === 0 ? (
                  <div className="space-y-2">
                    <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-text-secondary">
                      No models found. Enter model ID manually:
                    </div>
                    <input
                      type="text"
                      value={settings.transformModel}
                      onChange={(e) => updateSettings({ transformModel: e.target.value })}
                      placeholder="Enter model ID"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                    />
                  </div>
                ) : (
                  <>
                    <select
                      value={providerModels.some(m => m.id === settings.transformModel) ? settings.transformModel : "__custom__"}
                      onFocus={handleModelDropdownFocus}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setCustomModel(settings.transformModel);
                        } else {
                          updateSettings({ transformModel: e.target.value });
                          setCustomModel("");
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      {providerModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name} {model.description && `— ${model.description}`}
                        </option>
                      ))}
                      <option value="__custom__">Custom model ID...</option>
                    </select>
                    
                    {/* Custom model input */}
                    {(!providerModels.some(m => m.id === settings.transformModel) || customModel !== "") && (
                      <div className="mt-2 space-y-2">
                        <input
                          type="text"
                          value={customModel || settings.transformModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="e.g., gpt-4-turbo"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                        />
                        <button
                          onClick={() => {
                            if (customModel.trim()) {
                              updateSettings({ transformModel: customModel.trim() });
                              setCustomModel("");
                            }
                          }}
                          disabled={!customModel.trim()}
                          className="px-3 py-1.5 bg-slate-200 text-text-primary text-sm rounded-lg hover:bg-slate-300 disabled:opacity-50 transition-colors"
                        >
                          Use Custom Model
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Advanced Settings Toggle */}
              <button
                onClick={() => setShowAdvancedTransform(!showAdvancedTransform)}
                className="text-xs text-primary-500 hover:text-primary-700 flex items-center gap-1"
              >
                {showAdvancedTransform ? "Hide" : "Show"} advanced settings
                <svg
                  className={`w-3 h-3 transition-transform ${showAdvancedTransform ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Advanced Settings */}
              {showAdvancedTransform && (
                <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">
                      Temperature: {settings.transformTemperature?.toFixed(1) ?? 0.7}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={settings.transformTemperature ?? 0.7}
                      onChange={(e) => updateSettings({ transformTemperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-text-secondary">
                      Lower = more focused, Higher = more creative
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">
                      Max Output Tokens: {settings.transformMaxTokens ?? 4096}
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="8192"
                      step="256"
                      value={settings.transformMaxTokens ?? 4096}
                      onChange={(e) => updateSettings({ transformMaxTokens: parseInt(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Webhook Actions */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Webhook Actions</h3>
              <button
                onClick={() => {
                  setIsAddingWebhook(true);
                  setEditingWebhook({
                    id: "",
                    name: "",
                    hotkey: "Control+1",
                    webhookUrl: "",
                    method: "POST",
                    enabled: true,
                  });
                }}
                className="text-xs text-primary-500 hover:text-primary-700 font-medium"
              >
                + Add Action
              </button>
            </div>
            <p className="text-xs text-text-secondary mb-3">
              Connect hotkeys to your APIs and automation tools (N8N, Make, etc.)
            </p>

            {/* Webhook List */}
            {webhookActions.length === 0 && !isAddingWebhook ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <p className="text-sm text-text-secondary">No webhook actions configured</p>
                <p className="text-xs text-text-secondary mt-1">
                  Add an action to connect a hotkey to your API
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhookActions.map((webhook) => (
                  <div
                    key={webhook.id}
                    className={`p-3 rounded-lg border ${
                      webhook.enabled
                        ? "bg-white border-slate-200"
                        : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={webhook.enabled}
                          onChange={() => toggleWebhookEnabled(webhook.id)}
                          className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-text-primary">{webhook.name}</p>
                          <div className="flex items-center gap-2">
                            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono">
                              {webhook.hotkey.replace("Control", "Ctrl")}
                            </kbd>
                            <span className="text-xs text-text-secondary truncate max-w-[150px]">
                              {webhook.webhookUrl}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingWebhook(webhook)}
                          className="p-1 text-text-secondary hover:text-text-primary"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteWebhookAction(webhook.id)}
                          className="p-1 text-text-secondary hover:text-red-500"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add/Edit Webhook Form */}
            {(isAddingWebhook || editingWebhook) && editingWebhook && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="text-sm font-medium text-text-primary mb-3">
                  {isAddingWebhook ? "Add Webhook Action" : "Edit Webhook Action"}
                </h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Name</label>
                    <input
                      type="text"
                      value={editingWebhook.name}
                      onChange={(e) => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                      placeholder="e.g., Claude API, My N8N Workflow"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Hotkey</label>
                    <select
                      value={editingWebhook.hotkey}
                      onChange={(e) => setEditingWebhook({ ...editingWebhook, hotkey: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                        <option key={n} value={`Control+${n}`}>
                          Ctrl+{n}
                        </option>
                      ))}
                      <option value="Control+Shift+1">Ctrl+Shift+1</option>
                      <option value="Control+Shift+2">Ctrl+Shift+2</option>
                      <option value="Control+Shift+3">Ctrl+Shift+3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Webhook URL</label>
                    <input
                      type="url"
                      value={editingWebhook.webhookUrl}
                      onChange={(e) => setEditingWebhook({ ...editingWebhook, webhookUrl: e.target.value })}
                      placeholder="https://your-webhook-url.com/endpoint"
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Method</label>
                    <select
                      value={editingWebhook.method}
                      onChange={(e) => setEditingWebhook({ ...editingWebhook, method: e.target.value as "POST" | "GET" })}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="POST">POST (recommended)</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        if (isAddingWebhook) {
                          addWebhookAction(editingWebhook);
                        } else {
                          updateWebhookAction(editingWebhook);
                        }
                      }}
                      disabled={!editingWebhook.name || !editingWebhook.webhookUrl}
                      className="flex-1 px-3 py-1.5 bg-primary-500 text-white text-sm rounded hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isAddingWebhook ? "Add" : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingWebhook(false);
                        setEditingWebhook(null);
                      }}
                      className="px-3 py-1.5 bg-slate-200 text-text-secondary text-sm rounded hover:bg-slate-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-text-secondary mt-3">
              Highlight text, then press the hotkey to send it to your webhook.
              The response will replace the highlighted text automatically.
            </p>
          </section>

          {/* History Limit */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">History Storage Limit</h3>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="50"
                value={settings.historyLimitMb}
                onChange={(e) => updateSettings({ historyLimitMb: parseInt(e.target.value) })}
                className="flex-1"
              />
              <span className="text-sm text-text-secondary w-12">{settings.historyLimitMb} MB</span>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section>
            <h3 className="text-sm font-medium text-text-primary mb-3">Keyboard Shortcuts</h3>
            <p className="text-xs text-text-secondary mb-3">
              Click a hotkey to change it. Press Escape to cancel.
            </p>
            <div className="space-y-2 text-sm">
              {/* Voice to Text hotkey */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-text-secondary">Voice to Text</span>
                <button
                  onClick={() => setCapturingHotkeyState("record")}
                  className={`px-2 py-1 border rounded text-xs font-mono transition-colors ${
                    capturingHotkeyState === "record"
                      ? "bg-primary-100 border-primary-400 text-primary-700 animate-pulse"
                      : "bg-white border-slate-200 hover:border-primary-300 hover:bg-primary-50"
                  }`}
                >
                  {capturingHotkeyState === "record"
                    ? "Press keys..."
                    : formatHotkeyDisplay(settings.hotkeyRecord || "Control+Space")}
                </button>
              </div>

              {/* AI Transform hotkey */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-text-secondary">AI Transform</span>
                <button
                  onClick={() => setCapturingHotkeyState("aiTransform")}
                  className={`px-2 py-1 border rounded text-xs font-mono transition-colors ${
                    capturingHotkeyState === "aiTransform"
                      ? "bg-primary-100 border-primary-400 text-primary-700 animate-pulse"
                      : "bg-white border-slate-200 hover:border-primary-300 hover:bg-primary-50"
                  }`}
                >
                  {capturingHotkeyState === "aiTransform"
                    ? "Press keys..."
                    : formatHotkeyDisplay(settings.hotkeyAiTransform || "Control+Backquote")}
                </button>
              </div>

              {/* Webhook Actions info */}
              <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                <span className="text-text-secondary">Webhook Actions</span>
                <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono">
                  Configurable above
                </kbd>
              </div>
            </div>
            <p className="text-xs text-text-secondary mt-2">
              AI Transform: Copy text, hold hotkey, speak instruction, release
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200">
          <button
            onClick={() => setSettingsOpen(false)}
            className="w-full px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

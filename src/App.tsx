import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "./stores/appStore";
import MainWindow from "./components/MainWindow";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import RecordingIndicator from "./components/RecordingIndicator";
import Toast, { ToastMessage } from "./components/Toast";
import ProfileChooserModal from "./components/ProfileChooserModal";
import VoiceCommandModal from "./components/VoiceCommandModal";
import { matchVoiceCommand } from "./utils/fuzzyMatch";
import type { WebhookAction, PromptAction, ChromeProfile, VoiceCommandMatch, MainHotkeyAction } from "./types";

// Tauri format: use "Control" not "Ctrl", use "+" as separator
// These are now just fallbacks - actual hotkeys come from settings
const DEFAULT_RECORD_HOTKEY = "Control+Space";
const DEFAULT_AI_TRANSFORM_HOTKEY = "Control+Backquote";
const DEFAULT_VOICE_COMMAND_HOTKEY = "Control+Shift+Space";
const MIN_AI_TRANSFORM_RECORDING_MS = 300; // Minimum recording time to prevent immediate stop
const MIN_VOICE_COMMAND_RECORDING_MS = 200; // Minimum recording time for voice commands
const DEBOUNCE_MS = 500; // Debounce time to prevent spam opens

/**
 * Normalize a string into a URL.
 * - If empty → null (error)
 * - If starts with http://, https://, file:// → use as-is
 * - If looks like a host/path (contains dot, no spaces, or localhost/IP) → prepend https://
 * - Otherwise → Google search URL
 */
function normalizeToUrl(text: string): { url: string; isSearch: boolean } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Already a valid URL scheme
  if (/^(https?|file):\/\//i.test(trimmed)) {
    return { url: trimmed, isSearch: false };
  }

  // Check if it looks like a URL (host/path pattern)
  // - Contains a dot and no spaces (e.g., "example.com", "foo.bar/baz")
  // - OR matches localhost/IP patterns (e.g., "localhost:3000", "127.0.0.1:4000")
  const looksLikeUrl =
    (/^[^\s]+\.[^\s]+$/.test(trimmed) && !trimmed.includes(" ")) ||
    /^localhost(:\d+)?/i.test(trimmed) ||
    /^(\d{1,3}\.){3}\d{1,3}(:\d+)?/.test(trimmed);

  if (looksLikeUrl) {
    return { url: `https://${trimmed}`, isSearch: false };
  }

  // Otherwise, treat as a search query
  return {
    url: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`,
    isSearch: true,
  };
}

function App() {
  const initialize = useAppStore((state) => state.initialize);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const settings = useAppStore((state) => state.settings);
  const webhookActions = useMemo(() => settings.webhookActions ?? [], [settings.webhookActions]);
  const promptActions = useMemo(() => settings.promptActions ?? [], [settings.promptActions]);
  const hotkeyRecord = settings.hotkeyRecord || DEFAULT_RECORD_HOTKEY;
  const hotkeyAiTransform = settings.hotkeyAiTransform || DEFAULT_AI_TRANSFORM_HOTKEY;
  const hotkeyVoiceCommand = settings.hotkeyVoiceCommand || DEFAULT_VOICE_COMMAND_HOTKEY;
  const registeredRecordHotkey = useRef<string>("");
  const registeredAiTransformHotkey = useRef<string>("");
  const registeredVoiceCommandHotkey = useRef<string>("");
  const registeredWebhookHotkeys = useRef<string[]>([]);
  const aiTransformClipboardText = useRef<string>("");
  const aiTransformStartTime = useRef<number>(0);
  const voiceCommandStartTime = useRef<number>(0);
  const pendingVoiceReviewMatches = useRef<VoiceCommandMatch[]>([]);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const showToast = useCallback((message: string, type: "error" | "success" | "info" = "error") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Debounce tracking for hotkey actions (prevents spam opens)
  const actionLastRunRef = useRef<Map<string, number>>(new Map());

  // Chrome profile chooser state
  const [profileChooserOpen, setProfileChooserOpen] = useState(false);
  const [chromeProfiles, setChromeProfiles] = useState<ChromeProfile[]>([]);
  const [pendingUrlAction, setPendingUrlAction] = useState<{ action: WebhookAction; url: string } | null>(null);
  const profilesCacheRef = useRef<ChromeProfile[] | null>(null);

  // Voice command state
  const [voiceCommandModalOpen, setVoiceCommandModalOpen] = useState(false);
  const [voiceCommandTranscript, setVoiceCommandTranscript] = useState("");
  const [voiceCommandMatches, setVoiceCommandMatches] = useState<VoiceCommandMatch[]>([]);
  const voiceCommandListening = useAppStore((state) => state.voiceCommandListening);
  const setVoiceCommandListening = useAppStore((state) => state.setVoiceCommandListening);
  const globalBusy = useAppStore((state) => state.globalBusy);
  const setGlobalBusy = useAppStore((state) => state.setGlobalBusy);

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Listen for tray menu events
  useEffect(() => {
    const unlisten = listen("open-settings", () => {
      setSettingsOpen(true);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [setSettingsOpen]);

  // Register global record hotkey (re-registers when hotkey setting changes)
  useEffect(() => {
    const setupHotkey = async () => {
      try {
        // Unregister previous hotkey if different
        if (registeredRecordHotkey.current && registeredRecordHotkey.current !== hotkeyRecord) {
          await unregister(registeredRecordHotkey.current).catch(console.error);
          registeredRecordHotkey.current = "";
        }

        // Check if already registered
        const alreadyRegistered = await isRegistered(hotkeyRecord);
        if (alreadyRegistered) {
          console.log("Hotkey already registered, unregistering first...");
          await unregister(hotkeyRecord);
        }

        // Register the hotkey
        await register(hotkeyRecord, async (event) => {
          console.log("Hotkey event:", event);

          // Skip if we're capturing a new hotkey in settings
          if (useAppStore.getState().isCapturingHotkey) {
            console.log("Ignoring hotkey - capturing mode active");
            return;
          }

          if (event.state === "Pressed") {
            const state = useAppStore.getState();
            console.log("Current recording state:", state.recordingState);

            if (state.recordingState === "idle") {
              // Start recording
              console.log("Starting recording...");
              try {
                // Play start sound if enabled
                if (state.settings.audioEnabled) {
                  invoke("play_sound", { soundType: "start" }).catch(console.error);
                }
                await invoke("start_recording");
                useAppStore.getState().startRecording();
                // Show the recording overlay
                invoke("show_recording_overlay").then(() => {
  console.log('[Frontend] show_recording_overlay success.');
}).catch((err) => {
  console.error('[Frontend] show_recording_overlay failed:', err);
});
                console.log("Recording started via hotkey");
              } catch (error) {
                console.error("Failed to start recording:", error);
              }
            } else if (state.recordingState === "recording") {
              // Stop recording and transcribe
              console.log("Stopping recording...");

              // Calculate recording duration before stopping
              const recordingDurationMs = state.recordingStartTime
                ? Date.now() - state.recordingStartTime
                : 0;

              // Play stop sound if enabled
              if (state.settings.audioEnabled) {
                invoke("play_sound", { soundType: "stop" }).catch(console.error);
              }

              // Switch overlay to processing state (don't hide it)
              invoke("set_overlay_state", {
  // Logging included

                state: "processing",
                recordingDurationMs,
              }).catch(console.error);

              useAppStore.getState().stopRecording();

              try {
                const currentApiKey = useAppStore.getState().apiKey;
                if (!currentApiKey) {
                  useAppStore.getState().addTranscription({
                    id: crypto.randomUUID(),
                    text: "Please set your OpenAI API key first.",
                    durationMs: 0,
                    language: "en",
                    createdAt: new Date().toISOString(),
                  });
                  invoke("hide_recording_overlay").catch(console.error);
                  return;
                }

                // Get language from settings - pass null for auto-detect
                const currentSettings = useAppStore.getState().settings;
                const lang = currentSettings.language === "auto" ? null : currentSettings.language;

                const result = await invoke<{
                  text: string;
                  language: string;
                  duration_ms: number;
                }>("transcribe_audio", {
                  apiKey: currentApiKey,
                  language: lang,
                  translateToEnglish: currentSettings.translateToEnglish,
                });

                // Hide overlay after successful transcription
                invoke("hide_recording_overlay").catch(console.error);

                useAppStore.getState().addTranscription({
                  id: crypto.randomUUID(),
                  text: result.text,
                  durationMs: result.duration_ms,
                  language: result.language,
                  createdAt: new Date().toISOString(),
                });
                console.log("Transcription completed via hotkey:", result.text);

                // Auto-paste: copy to clipboard and simulate paste
                if (currentSettings.autoPasteMode !== "never") {
                  try {
                    await invoke("copy_to_clipboard", { text: result.text });
                    console.log("Text copied to clipboard");

                    // Small delay then paste
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await invoke("paste_text");
                    console.log("Paste simulated");
                  } catch (pasteError) {
                    console.error("Auto-paste failed:", pasteError);
                  }
                }
              } catch (error) {
                console.error("Failed to transcribe:", error);
                // Hide overlay on error too
                invoke("hide_recording_overlay").catch(console.error);
                useAppStore.getState().addTranscription({
                  id: crypto.randomUUID(),
                  text: `Error: ${error}`,
                  durationMs: 0,
                  language: "en",
                  createdAt: new Date().toISOString(),
                });
              }
            }
          }
        });

        registeredRecordHotkey.current = hotkeyRecord;
        console.log(`Global hotkey registered: ${hotkeyRecord}`);
      } catch (error) {
        console.error("Failed to register hotkey:", error);
      }
    };

    setupHotkey();

    // Cleanup on unmount
    return () => {
      if (registeredRecordHotkey.current) {
        unregister(registeredRecordHotkey.current).catch(console.error);
        registeredRecordHotkey.current = "";
      }
    };
  }, [hotkeyRecord]);

  // Register AI Transform hotkey (configurable, default Ctrl+`)
  // Flow: Press = grab clipboard + start recording, Release = transcribe instruction + GPT transform + paste
  useEffect(() => {
    const setupAiTransformHotkey = async () => {
      try {
        // Unregister previous hotkey if different
        if (registeredAiTransformHotkey.current && registeredAiTransformHotkey.current !== hotkeyAiTransform) {
          await unregister(registeredAiTransformHotkey.current).catch(console.error);
          registeredAiTransformHotkey.current = "";
        }

        const alreadyRegistered = await isRegistered(hotkeyAiTransform);
        if (alreadyRegistered) {
          await unregister(hotkeyAiTransform);
        }

        await register(hotkeyAiTransform, async (event) => {
          // Skip if we're capturing a new hotkey in settings
          if (useAppStore.getState().isCapturingHotkey) {
            console.log("Ignoring AI Transform hotkey - capturing mode active");
            return;
          }

          const state = useAppStore.getState();

          if (event.state === "Pressed") {
            // Only start if we're idle (not already recording for transcription)
            if (state.recordingState !== "idle") {
              console.log("Already recording, ignoring AI transform hotkey");
              return;
            }

            // Note: We no longer check for API key here - the backend will check
            // if a key is set for the selected transform provider

            // Auto-copy: simulate Ctrl+C to copy selected text first
            try {
              console.log("AI Transform: copying selected text...");
              await invoke("simulate_copy");

              // Small delay to let clipboard update
              await new Promise((resolve) => setTimeout(resolve, 50));

              // Now grab clipboard text
              const clipboardText = await invoke<string>("get_clipboard_text");
              if (!clipboardText || clipboardText.trim() === "") {
                console.log("No text selected/copied for AI Transform");
                return;
              }
              aiTransformClipboardText.current = clipboardText;
              aiTransformStartTime.current = Date.now();
              console.log(`AI Transform: captured ${clipboardText.length} chars from selection`);

              // Play start sound
              if (state.settings.audioEnabled) {
                invoke("play_sound", { soundType: "start" }).catch(console.error);
              }

              // Start recording the voice instruction
              await invoke("start_recording");
              useAppStore.getState().startRecording();
              invoke("show_recording_overlay").then(() => {
  console.log('[Frontend] show_recording_overlay success.');
}).catch((err) => {
  console.error('[Frontend] show_recording_overlay failed:', err);
});
              console.log("AI Transform: recording voice instruction...");
            } catch (error) {
              console.error("Failed to start AI Transform:", error);
              aiTransformClipboardText.current = "";
              aiTransformStartTime.current = 0;
            }
          } else if (event.state === "Released") {
            // Only process if we have clipboard text captured (meaning we started an AI transform)
            if (!aiTransformClipboardText.current) {
              return;
            }

            const currentState = useAppStore.getState();
            if (currentState.recordingState !== "recording") {
              return;
            }

            // Check minimum recording time to prevent immediate stop from key bounce
            const recordingDurationMs = Date.now() - aiTransformStartTime.current;
            if (recordingDurationMs < MIN_AI_TRANSFORM_RECORDING_MS) {
              console.log(`AI Transform: ignoring early release (${recordingDurationMs}ms < ${MIN_AI_TRANSFORM_RECORDING_MS}ms)`);
              return;
            }

            // Play stop sound
            if (currentState.settings.audioEnabled) {
              invoke("play_sound", { soundType: "stop" }).catch(console.error);
            }

            // Switch overlay to processing state
            invoke("set_overlay_state", {
  // Logging included

              state: "processing",
              recordingDurationMs,
            }).catch(console.error);

            useAppStore.getState().stopRecording();

            try {
              const apiKey = useAppStore.getState().apiKey;
              if (!apiKey) {
                console.log("No API key for transcription");
                aiTransformClipboardText.current = "";
                invoke("hide_recording_overlay").catch(console.error);
                return;
              }

              // Transcribe the voice instruction
              console.log("AI Transform: transcribing voice instruction...");
              const transcriptionResult = await invoke<{
                text: string;
                language: string;
                duration_ms: number;
              }>("transcribe_audio", {
                apiKey: apiKey,
                language: "en",
                translateToEnglish: false,
              });

              const instruction = transcriptionResult.text;
              console.log(`AI Transform instruction: "${instruction}"`);

              if (!instruction || instruction.trim() === "") {
                console.log("No voice instruction detected");
                aiTransformClipboardText.current = "";
                invoke("hide_recording_overlay").catch(console.error);
                useAppStore.getState().setRecordingState("idle");
                return;
              }

              // Get transform settings from current state
              const transformSettings = useAppStore.getState().settings;
              
              // Now send to LLM for transformation using configured provider
              console.log(`AI Transform: sending to ${transformSettings.transformProvider}/${transformSettings.transformModel}...`);
              const llmResult = await invoke<{
                success: boolean;
                output_text: string | null;
                error: string | null;
                error_type: string | null;
                provider: string | null;
                model: string | null;
              }>("transform_with_llm", {
                provider: transformSettings.transformProvider,
                model: transformSettings.transformModel,
                inputText: aiTransformClipboardText.current,
                instruction: instruction,
                temperature: transformSettings.transformTemperature,
                maxTokens: transformSettings.transformMaxTokens,
              });

              // Hide overlay after LLM processing completes
              invoke("hide_recording_overlay").catch(console.error);

              if (llmResult.success && llmResult.output_text) {
                console.log(`AI Transform complete: ${llmResult.output_text.length} chars via ${llmResult.provider}/${llmResult.model}`);

                // Copy to clipboard and paste
                await invoke("copy_to_clipboard", { text: llmResult.output_text });
                await new Promise((resolve) => setTimeout(resolve, 100));
                await invoke("paste_text");

                // Play success sound
                if (currentState.settings.audioEnabled) {
                  invoke("play_sound", { soundType: "stop" }).catch(console.error);
                }

                // Add to history
                useAppStore.getState().addTranscription({
                  id: crypto.randomUUID(),
                  text: `[AI Transform via ${llmResult.provider}] ${instruction}\n→ ${llmResult.output_text.substring(0, 100)}...`,
                  durationMs: transcriptionResult.duration_ms,
                  language: "en",
                  createdAt: new Date().toISOString(),
                });
              } else {
                console.error("LLM Transform failed:", llmResult.error);
                // Show a more helpful error message if it's a known error type
                if (llmResult.error_type === "NoApiKey") {
                  console.log("No API key set for transform provider - please configure in Settings");
                }
                useAppStore.getState().setRecordingState("idle");
              }
            } catch (error) {
              console.error("AI Transform failed:", error);
              invoke("hide_recording_overlay").catch(console.error);
              useAppStore.getState().setRecordingState("idle");
              
              // Add error to history so user can see what went wrong
              useAppStore.getState().addTranscription({
                id: crypto.randomUUID(),
                text: `[AI Transform Error] ${error}`,
                durationMs: 0,
                language: "en",
                createdAt: new Date().toISOString(),
              });
            } finally {
              aiTransformClipboardText.current = "";
              aiTransformStartTime.current = 0;
            }
          }
        });

        registeredAiTransformHotkey.current = hotkeyAiTransform;
        console.log(`AI Transform hotkey registered: ${hotkeyAiTransform}`);
      } catch (error) {
        console.error("Failed to register AI Transform hotkey:", error);
      }
    };

    setupAiTransformHotkey();

    return () => {
      if (registeredAiTransformHotkey.current) {
        unregister(registeredAiTransformHotkey.current).catch(console.error);
        registeredAiTransformHotkey.current = "";
      }
    };
  }, [hotkeyAiTransform]);

  // Handle prompt action execution (LLM-based transforms with stored prompts)
  const executePromptAction = useCallback(async (action: PromptAction) => {
    console.log(`Prompt Action: executing "${action.name}"`);

    // Debounce check - prevent spam execution
    const now = Date.now();
    const lastRun = actionLastRunRef.current.get(action.id) || 0;
    if (now - lastRun < DEBOUNCE_MS) {
      console.log(`Prompt Action: debounced (${now - lastRun}ms < ${DEBOUNCE_MS}ms)`);
      return;
    }
    actionLastRunRef.current.set(action.id, now);

    const currentSettings = useAppStore.getState().settings;

    // Copy selected text using the same approach as webhook actions
    let selectedText: string;
    try {
      console.log("Prompt Action: copying selected text...");
      await invoke("simulate_copy");
      await new Promise((resolve) => setTimeout(resolve, 50));
      selectedText = await invoke<string>("get_clipboard_text");
    } catch (error) {
      console.error("Prompt Action: Failed to copy selected text:", error);
      showToast("Failed to copy selected text", "error");
      return;
    }

    if (!selectedText || selectedText.trim() === "") {
      console.log("Prompt Action: No text selected");
      showToast("No text selected", "error");
      return;
    }

    console.log(`Prompt Action: captured ${selectedText.length} chars from selection`);

    // Play sound to indicate transform started
    if (currentSettings.audioEnabled) {
      invoke("play_sound", { soundType: "start" }).catch(console.error);
    }

    // Process the prompt: replace {{text}} placeholder or append text
    let finalInstruction: string;
    if (action.prompt.includes("{{text}}")) {
      finalInstruction = action.prompt.replace(/\{\{text\}\}/g, selectedText);
    } else {
      // No placeholder - append text to end of prompt
      finalInstruction = `${action.prompt}\n\n${selectedText}`;
    }

    console.log(`Prompt Action: using prompt template, final instruction length: ${finalInstruction.length}`);

    // Call LLM transform using global settings
    try {
      const result = await invoke<{
        success: boolean;
        output_text: string | null;
        error: string | null;
        error_type: string | null;
        provider: string | null;
        model: string | null;
      }>("transform_with_llm", {
        provider: currentSettings.transformProvider,
        model: currentSettings.transformModel,
        inputText: selectedText,
        instruction: finalInstruction,
        temperature: currentSettings.transformTemperature ?? 0.7,
        maxTokens: currentSettings.transformMaxTokens ?? 4096,
      });

      if (result.success && result.output_text) {
        console.log(`Prompt Action: complete (${result.output_text.length} chars via ${result.provider}/${result.model})`);

        // Copy to clipboard and paste
        await invoke("copy_to_clipboard", { text: result.output_text });
        await new Promise((resolve) => setTimeout(resolve, 100));
        await invoke("paste_text");

        // Play success sound
        if (currentSettings.audioEnabled) {
          invoke("play_sound", { soundType: "stop" }).catch(console.error);
        }

        // Add to history
        useAppStore.getState().addTranscription({
          id: crypto.randomUUID(),
          text: `[Prompt: ${action.name}] ${result.output_text.substring(0, 100)}${result.output_text.length > 100 ? "..." : ""}`,
          durationMs: 0,
          language: "en",
          createdAt: new Date().toISOString(),
        });

        console.log("Prompt Action: transform complete and pasted");
      } else {
        console.error("Prompt Action failed:", result.error);
        if (result.error_type === "NoApiKey") {
          showToast("No API key set for AI Transform - configure in Settings", "error");
        } else {
          showToast(result.error || "Prompt action failed", "error");
        }
      }
    } catch (error) {
      console.error("Prompt Action error:", error);
      showToast(`Prompt action error: ${error}`, "error");
    }
  }, [showToast]);

  // Handle hotkey action execution (webhooks, URL, SMART_URL)
  const executeWebhookAction = useCallback(async (action: WebhookAction) => {
    console.log(`Action: executing "${action.name}" (${action.method})`);
    console.log(`[DEBUG] askChromeProfile:`, action.askChromeProfile, `type:`, typeof action.askChromeProfile);


    // Debounce check - prevent spam execution
    const now = Date.now();
    const lastRun = actionLastRunRef.current.get(action.id) || 0;
    if (now - lastRun < DEBOUNCE_MS) {
      console.log(`Action: debounced (${now - lastRun}ms < ${DEBOUNCE_MS}ms)`);
      return;
    }
    actionLastRunRef.current.set(action.id, now);

    const currentSettings = useAppStore.getState().settings;

    // ========== URL MODE ==========
    if (action.method === "URL") {
      // Normalize the preset URL
      const normalized = normalizeToUrl(action.webhookUrl);
      if (!normalized) {
        console.error("URL action: Invalid or empty URL");
        showToast("URL is invalid or empty", "error");
        return;
      }

      // If askChromeProfile is enabled, show the profile chooser
      if (action.askChromeProfile) {
        let profiles: ChromeProfile[] = [];

        // Step 1: Fetch profiles (separate try-catch for profile errors)
        try {
          console.log("URL action: fetching Chrome profiles...");
          profiles = await invoke<ChromeProfile[]>("list_chrome_profiles");
          console.log("URL action: got profiles:", profiles);
          profilesCacheRef.current = profiles;
        } catch (error) {
          console.error("URL action: failed to list Chrome profiles:", error);
          showToast("Couldn't list Chrome profiles. Opening in default profile.", "info");
          // Fall through to open without profile
        }

        // Step 2: If we have profiles, show the modal
        if (profiles.length > 0) {
          // Set React state FIRST (before any window operations that might fail)
          console.log("Setting up profile chooser modal with", profiles.length, "profiles");
          setChromeProfiles(profiles);
          setPendingUrlAction({ action, url: normalized.url });
          setProfileChooserOpen(true);

          // Step 3: Try to bring window to foreground (separate try-catch)
          try {
            const mainWindow = getCurrentWindow();
            await mainWindow.show();
            await mainWindow.setFocus();
            console.log("Window shown and focused");
          } catch (windowError) {
            // Window operations failed, but modal state is already set
            // The modal should still render when window becomes visible
            console.error("Failed to show/focus window:", windowError);
          }

          console.log("Returning - waiting for user to select profile");
          return; // Don't open URL yet - wait for user selection in modal
        } else if (profiles.length === 0 && profilesCacheRef.current === profiles) {
          // Only show "no profiles" if we successfully fetched but got empty list
          // (not if the fetch failed - that has its own error message)
          showToast("No Chrome profiles found. Opening in default profile.", "info");
        }
      }

      // Play sound if enabled
      if (currentSettings.audioEnabled) {
        invoke("play_sound", { soundType: "start" }).catch(console.error);
      }

      // Open the URL (without specific profile)
      try {
        const result = await invoke<{
          success: boolean;
          opened_with: string;
          error: string | null;
        }>("open_url_in_chrome", { url: normalized.url, profileDirectory: null });

        if (result.success) {
          console.log(`URL action: opened in ${result.opened_with}`);
          // Log to history
          useAppStore.getState().addTranscription({
            id: crypto.randomUUID(),
            text: `[URL Open - ${action.name}] ${normalized.url}`,
            durationMs: 0,
            language: "en",
            createdAt: new Date().toISOString(),
          });
        } else {
          console.error("URL action failed:", result.error);
          showToast(result.error || "Failed to open URL", "error");
        }
      } catch (error) {
        console.error("URL action error:", error);
        showToast(`Failed to open URL: ${error}`, "error");
      }
      return;
    }

    // ========== SMART_URL MODE ==========
    if (action.method === "SMART_URL") {
      // Copy selected text
      let selectedText: string;
      try {
        console.log("SMART_URL: copying selected text...");
        await invoke("simulate_copy");
        await new Promise((resolve) => setTimeout(resolve, 50));
        selectedText = await invoke<string>("get_clipboard_text");
      } catch (error) {
        console.error("SMART_URL: Failed to copy selected text:", error);
        showToast("Failed to copy selected text", "error");
        return;
      }

      if (!selectedText || selectedText.trim() === "") {
        console.log("SMART_URL: No text selected");
        showToast("No text selected", "error");
        return;
      }

      // Normalize the selected text
      const normalized = normalizeToUrl(selectedText);
      if (!normalized) {
        showToast("Invalid selection", "error");
        return;
      }

      // Play sound if enabled
      if (currentSettings.audioEnabled) {
        invoke("play_sound", { soundType: "start" }).catch(console.error);
      }

      // Open the URL
      try {
        const result = await invoke<{
          success: boolean;
          opened_with: string;
          error: string | null;
        }>("open_url_in_chrome", { url: normalized.url, profileDirectory: null });

        if (result.success) {
          console.log(`SMART_URL: opened ${normalized.isSearch ? "search" : "URL"} in ${result.opened_with}`);
          // Log to history
          useAppStore.getState().addTranscription({
            id: crypto.randomUUID(),
            text: normalized.isSearch
              ? `[Smart URL - ${action.name}] Search: ${selectedText.trim()}`
              : `[Smart URL - ${action.name}] ${normalized.url}`,
            durationMs: 0,
            language: "en",
            createdAt: new Date().toISOString(),
          });
        } else {
          console.error("SMART_URL action failed:", result.error);
          showToast(result.error || "Failed to open URL", "error");
        }
      } catch (error) {
        console.error("SMART_URL action error:", error);
        showToast(`Failed to open URL: ${error}`, "error");
      }
      return;
    }

    // ========== PROMPT MODE ==========
    if (action.method === "PROMPT") {
      if (!action.prompt) {
        showToast("No prompt configured for this action", "error");
        return;
      }

      // Copy selected text
      let selectedText: string;
      try {
        console.log("PROMPT action: copying selected text...");
        await invoke("simulate_copy");
        await new Promise((resolve) => setTimeout(resolve, 50));
        selectedText = await invoke<string>("get_clipboard_text");
      } catch (error) {
        console.error("PROMPT action: Failed to copy selected text:", error);
        showToast("Failed to copy selected text", "error");
        return;
      }

      if (!selectedText || selectedText.trim() === "") {
        console.log("PROMPT action: No text selected");
        showToast("No text selected", "error");
        return;
      }

      console.log(`PROMPT action: captured ${selectedText.length} chars from selection`);

      // Play sound to indicate transform started
      if (currentSettings.audioEnabled) {
        invoke("play_sound", { soundType: "start" }).catch(console.error);
      }

      // Process the prompt: replace {{text}} placeholder or append text
      let finalInstruction: string;
      if (action.prompt.includes("{{text}}")) {
        finalInstruction = action.prompt.replace(/\{\{text\}\}/g, selectedText);
      } else {
        // No placeholder - append text to end of prompt
        finalInstruction = `${action.prompt}\n\n${selectedText}`;
      }

      console.log(`PROMPT action: using prompt template, final instruction length: ${finalInstruction.length}`);

      // Call LLM transform using global settings
      try {
        const result = await invoke<{
          success: boolean;
          output_text: string | null;
          error: string | null;
          error_type: string | null;
          provider: string | null;
          model: string | null;
        }>("transform_with_llm", {
          provider: currentSettings.transformProvider,
          model: currentSettings.transformModel,
          inputText: selectedText,
          instruction: finalInstruction,
          temperature: currentSettings.transformTemperature ?? 0.7,
          maxTokens: currentSettings.transformMaxTokens ?? 4096,
        });

        if (result.success && result.output_text) {
          console.log(`PROMPT action: complete (${result.output_text.length} chars via ${result.provider}/${result.model})`);

          // Copy to clipboard and paste
          await invoke("copy_to_clipboard", { text: result.output_text });
          await new Promise((resolve) => setTimeout(resolve, 100));
          await invoke("paste_text");

          // Play success sound
          if (currentSettings.audioEnabled) {
            invoke("play_sound", { soundType: "stop" }).catch(console.error);
          }

          // Add to history
          useAppStore.getState().addTranscription({
            id: crypto.randomUUID(),
            text: `[Prompt: ${action.name}] ${result.output_text.substring(0, 100)}${result.output_text.length > 100 ? "..." : ""}`,
            durationMs: 0,
            language: "en",
            createdAt: new Date().toISOString(),
          });

          console.log("PROMPT action: transform complete and pasted");
        } else {
          console.error("PROMPT action failed:", result.error);
          if (result.error_type === "NoApiKey") {
            showToast("No API key set for AI Transform - configure in Settings", "error");
          } else {
            showToast(result.error || "Prompt action failed", "error");
          }
        }
      } catch (error) {
        console.error("PROMPT action error:", error);
        showToast(`Prompt action error: ${error}`, "error");
      }
      return;
    }

    // ========== WEBHOOK MODE (POST/GET) ==========
    // Copy selected text using the same approach as AI Transform (which works)
    // This triggers on Pressed, so the selection is still active
    let selectedText: string;
    try {
      console.log("Webhook: copying selected text...");
      await invoke("simulate_copy");

      // Small delay to let clipboard update (same as AI Transform)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Read the clipboard
      selectedText = await invoke<string>("get_clipboard_text");
    } catch (error) {
      console.error("Webhook: Failed to copy selected text:", error);
      showToast("Failed to copy selected text", "error");
      return;
    }

    if (!selectedText || selectedText.trim() === "") {
      console.log("Webhook: No text selected - nothing to send");
      showToast("No text selected", "error");
      return;
    }

    console.log(`Webhook: captured ${selectedText.length} chars from selection`);

    // Play a sound to indicate transform started
    if (currentSettings.audioEnabled) {
      invoke("play_sound", { soundType: "start" }).catch(console.error);
    }

    // Send to webhook
    try {
      console.log(`Webhook: sending to ${action.webhookUrl}`);
      const result = await invoke<{
        success: boolean;
        output_text: string | null;
        error: string | null;
      }>("transform_with_webhook", {
        webhookUrl: action.webhookUrl,
        method: action.method,
        inputText: selectedText,
        headers: action.headers || null,
      });

      if (result.success && result.output_text) {
        console.log(`Webhook: received response (${result.output_text.length} chars)`);

        // Copy result to clipboard and paste
        await invoke("copy_to_clipboard", { text: result.output_text });

        // Small delay then paste
        await new Promise((resolve) => setTimeout(resolve, 100));
        await invoke("paste_text");

        // Play success sound
        if (currentSettings.audioEnabled) {
          invoke("play_sound", { soundType: "stop" }).catch(console.error);
        }

        console.log("Webhook: transform complete and pasted");
      } else {
        console.error("Webhook: request failed -", result.error);
        showToast(result.error || "Webhook request failed", "error");
      }
    } catch (error) {
      console.error("Webhook: HTTP request error -", error);
      showToast(`Webhook error: ${error}`, "error");
    }
  }, [showToast]);

  // Register hotkey actions (webhooks, URL, SMART_URL, and prompt actions)
  useEffect(() => {
    // Abort controller to prevent race conditions when effect re-runs
    const abortController = new AbortController();

    const setupActionHotkeys = async () => {
      // Unregister any previously registered hotkeys
      for (const hotkey of registeredWebhookHotkeys.current) {
        if (abortController.signal.aborted) {
          console.log("Hotkey registration aborted during unregister phase");
          return;
        }
        try {
          const isReg = await isRegistered(hotkey);
          if (isReg) {
            await unregister(hotkey);
            console.log(`Unregistered action hotkey: ${hotkey}`);
          }
        } catch (e) {
          console.error(`Failed to unregister hotkey ${hotkey}:`, e);
        }
      }
      registeredWebhookHotkeys.current = [];

      // Register webhook action hotkeys
      for (const action of webhookActions) {
        if (abortController.signal.aborted) {
          console.log("Hotkey registration aborted during webhook registration phase");
          return;
        }
        // Check if action should be registered:
        // - Must be enabled and have a hotkey
        // - For POST/GET/URL: must have webhookUrl
        // - For SMART_URL: no webhookUrl required
        if (!action.enabled || !action.hotkey) continue;
        if ((action.method === "POST" || action.method === "GET" || action.method === "URL") && !action.webhookUrl) {
          continue;
        }

        try {
          const isReg = await isRegistered(action.hotkey);
          if (abortController.signal.aborted) return;
          if (isReg) {
            await unregister(action.hotkey);
          }
          if (abortController.signal.aborted) return;

          await register(action.hotkey, async (event) => {
            // Trigger on Pressed (like AI Transform) to copy while keys are held
            // This ensures the selection is still active before the editor processes the chord
            if (event.state === "Pressed") {
              // Get fresh action data in case it was updated
              const currentActions = useAppStore.getState().settings.webhookActions ?? [];
              console.log(`[DEBUG] Hotkey pressed: ${action.hotkey}, fresh actions:`, currentActions.map(a => ({
                name: a.name,
                askChromeProfile: a.askChromeProfile
              })));
              const currentAction = currentActions.find((a) => a.id === action.id);
              console.log(`[DEBUG] Found action:`, currentAction?.name, `askChromeProfile:`, currentAction?.askChromeProfile);
              if (currentAction && currentAction.enabled) {
                executeWebhookAction(currentAction);
              }
            }
          });

          registeredWebhookHotkeys.current.push(action.hotkey);
          console.log(`Registered webhook hotkey: ${action.hotkey} -> ${action.name} (${action.method})`);
        } catch (error) {
          console.error(`Failed to register webhook hotkey ${action.hotkey}:`, error);
        }
      }

      // Register prompt action hotkeys
      for (const action of promptActions) {
        if (abortController.signal.aborted) {
          console.log("Hotkey registration aborted during prompt registration phase");
          return;
        }
        if (!action.enabled || !action.hotkey || !action.prompt) continue;

        try {
          const isReg = await isRegistered(action.hotkey);
          if (abortController.signal.aborted) return;
          if (isReg) {
            await unregister(action.hotkey);
          }
          if (abortController.signal.aborted) return;

          await register(action.hotkey, async (event) => {
            if (event.state === "Pressed") {
              // Get fresh action data in case it was updated
              const currentActions = useAppStore.getState().settings.promptActions ?? [];
              const currentAction = currentActions.find((a) => a.id === action.id);
              if (currentAction && currentAction.enabled) {
                executePromptAction(currentAction);
              }
            }
          });

          registeredWebhookHotkeys.current.push(action.hotkey);
          console.log(`Registered prompt hotkey: ${action.hotkey} -> ${action.name}`);
        } catch (error) {
          console.error(`Failed to register prompt hotkey ${action.hotkey}:`, error);
        }
      }
    };

    setupActionHotkeys();

    // Cleanup on unmount or when actions change
    return () => {
      // Abort any in-flight registration to prevent race conditions
      abortController.abort();
      for (const hotkey of registeredWebhookHotkeys.current) {
        unregister(hotkey).catch(console.error);
      }
      registeredWebhookHotkeys.current = [];
    };
  }, [webhookActions, promptActions, executeWebhookAction, executePromptAction]);

  // Handle profile selection from the chooser modal
  const handleProfileSelect = useCallback(async (profile: ChromeProfile) => {
    if (!pendingUrlAction) return;

    const { action, url } = pendingUrlAction;
    const currentSettings = useAppStore.getState().settings;

    // Close modal
    setProfileChooserOpen(false);
    setPendingUrlAction(null);

    // Play sound if enabled
    if (currentSettings.audioEnabled) {
      invoke("play_sound", { soundType: "start" }).catch(console.error);
    }

    // Open URL with selected profile
    try {
      const result = await invoke<{
        success: boolean;
        opened_with: string;
        error: string | null;
      }>("open_url_in_chrome", { 
        url, 
        profileDirectory: profile.profile_directory 
      });

      if (result.success) {
        console.log(`URL action: opened in ${result.opened_with} (profile: ${profile.display_name})`);
        // Log to history
        useAppStore.getState().addTranscription({
          id: crypto.randomUUID(),
          text: `[URL Open - ${action.name}] ${url} (Profile: ${profile.display_name})`,
          durationMs: 0,
          language: "en",
          createdAt: new Date().toISOString(),
        });
      } else {
        console.error("URL action failed:", result.error);
        showToast(result.error || "Failed to open URL", "error");
      }
    } catch (error) {
      console.error("URL action error:", error);
      showToast(`Failed to open URL: ${error}`, "error");
    }
  }, [pendingUrlAction, showToast]);

  // Handle profile chooser cancel
  const handleProfileCancel = useCallback(() => {
    setProfileChooserOpen(false);
    setPendingUrlAction(null);
    console.log("Profile chooser cancelled");
  }, []);

  // Get all available actions for voice command matching
  const getAllActions = useCallback((): Array<WebhookAction | PromptAction | MainHotkeyAction> => {
    const currentSettings = useAppStore.getState().settings;
    const actions: Array<WebhookAction | PromptAction | MainHotkeyAction> = [];

    // Add main hotkeys as actions
    actions.push({
      type: "main",
      id: "voice-to-text",
      name: "Voice to Text",
      hotkey: currentSettings.hotkeyRecord || DEFAULT_RECORD_HOTKEY,
    });
    actions.push({
      type: "main",
      id: "ai-transform",
      name: "AI Transform",
      hotkey: currentSettings.hotkeyAiTransform || DEFAULT_AI_TRANSFORM_HOTKEY,
    });

    // Add enabled webhook actions
    const webhooks = currentSettings.webhookActions ?? [];
    for (const action of webhooks) {
      if (action.enabled) {
        actions.push(action);
      }
    }

    // Add enabled prompt actions
    const prompts = currentSettings.promptActions ?? [];
    for (const action of prompts) {
      if (action.enabled) {
        actions.push(action);
      }
    }

    return actions;
  }, []);

  // Execute a voice command match
  const executeVoiceCommandMatch = useCallback(async (match: VoiceCommandMatch) => {
    console.log(`Voice Command: executing match "${match.action.name}" (confidence: ${match.confidence})`);
    setVoiceCommandModalOpen(false);

    const action = match.action;

    // Check if it's a main hotkey action
    if ("type" in action && action.type === "main") {
      // For main actions, we just show a toast since they require user interaction (press-hold-release)
      showToast(`"${action.name}" requires holding the hotkey. Use ${action.hotkey}`, "info");
      return;
    }

    // Check if it's a webhook action
    if ("method" in action) {
      await executeWebhookAction(action as WebhookAction);
      return;
    }

    // Check if it's a prompt action
    if ("prompt" in action) {
      await executePromptAction(action as PromptAction);
      return;
    }
  }, [executeWebhookAction, executePromptAction, showToast]);

  // Handle voice command cancellation
  const handleVoiceCommandCancel = useCallback(() => {
    setVoiceCommandModalOpen(false);
    setVoiceCommandMatches([]);
    setVoiceCommandTranscript("");
    console.log("Voice command cancelled");
  }, []);

  // Start voice command recording flow
  const startVoiceCommandRecording = useCallback(async () => {
    // Check if voice commands are enabled
    if (!settings.voiceCommandEnabled) {
      console.log("Voice commands are disabled");
      return;
    }

    // Check if already busy
    if (globalBusy) {
      showToast("Wait for current action to complete", "info");
      return;
    }

    // Check if already recording
    const state = useAppStore.getState();
    if (state.recordingState !== "idle") {
      showToast("Already recording", "info");
      return;
    }

    console.log("Voice Command: starting recording...");
    setGlobalBusy(true);
    setVoiceCommandListening(true);
    voiceCommandStartTime.current = Date.now();

    try {
      // Play start sound if enabled
      if (state.settings.audioEnabled) {
        invoke("play_sound", { soundType: "start" }).catch(console.error);
      }

      await invoke("start_recording");
      useAppStore.getState().startRecording();

      // Show recording overlay in voice command mode
      invoke("show_recording_overlay").catch(console.error);
    } catch (error) {
      console.error("Voice Command: failed to start recording:", error);
      setGlobalBusy(false);
      setVoiceCommandListening(false);
      voiceCommandStartTime.current = 0;
    }
  }, [settings.voiceCommandEnabled, globalBusy, showToast, setGlobalBusy, setVoiceCommandListening]);

  // Stop voice command recording and process
  const stopVoiceCommandRecording = useCallback(async () => {
    if (!voiceCommandListening) {
      return;
    }

    // Check minimum recording time
    const recordingDurationMs = Date.now() - voiceCommandStartTime.current;
    if (recordingDurationMs < MIN_VOICE_COMMAND_RECORDING_MS) {
      console.log(`Voice Command: ignoring early release (${recordingDurationMs}ms < ${MIN_VOICE_COMMAND_RECORDING_MS}ms)`);
      return;
    }

    console.log("Voice Command: stopping recording...");

    const state = useAppStore.getState();

    // Play stop sound if enabled
    if (state.settings.audioEnabled) {
      invoke("play_sound", { soundType: "stop" }).catch(console.error);
    }

    // Switch overlay to processing state
    invoke("set_overlay_state", {
      state: "processing",
      recordingDurationMs,
    }).catch(console.error);

    useAppStore.getState().stopRecording();
    setVoiceCommandListening(false);

    try {
      const apiKey = useAppStore.getState().apiKey;
      if (!apiKey) {
        console.log("Voice Command: no API key");
        showToast("Please set your OpenAI API key first", "error");
        invoke("hide_recording_overlay").catch(console.error);
        setGlobalBusy(false);
        voiceCommandStartTime.current = 0;
        return;
      }

      // Transcribe the voice command
      console.log("Voice Command: transcribing...");
      const result = await invoke<{
        text: string;
        language: string;
        duration_ms: number;
      }>("transcribe_audio", {
        apiKey: apiKey,
        language: "en", // Voice commands always in English
        translateToEnglish: false,
      });

      invoke("hide_recording_overlay").catch(console.error);

      const transcribedText = result.text.trim();
      console.log(`Voice Command: transcribed "${transcribedText}"`);

      if (!transcribedText) {
        console.log("Voice Command: no speech detected");
        showToast("No speech detected", "info");
        setGlobalBusy(false);
        voiceCommandStartTime.current = 0;
        return;
      }

      // Match against available actions
      const allActions = getAllActions();
      const matches = matchVoiceCommand(transcribedText, allActions);
      const threshold = settings.voiceCommandAutoExecuteThreshold ?? 0.4;

      console.log(`Voice Command: found ${matches.length} matches (threshold: ${threshold})`);

      if (matches.length > 0 && matches[0].confidence >= threshold) {
        // Auto-execute best match - confidence is above threshold
        const bestMatch = matches[0];
        console.log(`Voice Command: auto-executing "${bestMatch.action.name}" (confidence: ${bestMatch.confidence} >= ${threshold})`);

        const action = bestMatch.action;

        if ("type" in action && action.type === "main") {
          showToast(`"${action.name}" requires holding the hotkey. Use ${action.hotkey}`, "info");
        } else if ("method" in action) {
          await executeWebhookAction(action as WebhookAction);
        } else if ("prompt" in action) {
          await executePromptAction(action as PromptAction);
        }

        // Reset state after auto-execute
        setGlobalBusy(false);
        voiceCommandStartTime.current = 0;
      } else if (matches.length > 0) {
        // Show review window - confidence is below threshold
        console.log(`Voice Command: showing review window (best confidence: ${matches[0].confidence} < ${threshold})`);

        // Store matches for when user selects from review window
        pendingVoiceReviewMatches.current = matches.slice(0, 5);

        // Convert matches to the format expected by the backend
        const matchesForReview = pendingVoiceReviewMatches.current.map(m => ({
          action: m.action,
          confidence: m.confidence,
          matchType: m.matchType,
        }));

        try {
          await invoke("show_voice_review", {
            transcribedText,
            matches: matchesForReview,
          });
          // Don't reset globalBusy here - will be reset when review window closes
        } catch (e) {
          console.error("Voice Command: failed to show review window:", e);
          showToast("Failed to show review window", "error");
          pendingVoiceReviewMatches.current = [];
          setGlobalBusy(false);
          voiceCommandStartTime.current = 0;
        }
      } else {
        showToast("No matching action found", "info");
        setGlobalBusy(false);
        voiceCommandStartTime.current = 0;
      }
    } catch (error) {
      console.error("Voice Command: transcription failed:", error);
      invoke("hide_recording_overlay").catch(console.error);
      showToast(`Voice command error: ${error}`, "error");
      setGlobalBusy(false);
      voiceCommandStartTime.current = 0;
    }
  }, [voiceCommandListening, getAllActions, showToast, setGlobalBusy, setVoiceCommandListening, executeWebhookAction, executePromptAction, settings.voiceCommandAutoExecuteThreshold]);

  // Reset globalBusy when voice command modal closes
  useEffect(() => {
    if (!voiceCommandModalOpen) {
      setGlobalBusy(false);
      voiceCommandStartTime.current = 0;
    }
  }, [voiceCommandModalOpen, setGlobalBusy]);

  // Listen for voice review result (from the review window)
  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<{ selectedIndex: number | null; cancelled: boolean }>(
        "voice-review-result",
        async (event) => {
          const { selectedIndex, cancelled } = event.payload;
          console.log("Voice Review Result:", event.payload);

          if (cancelled || selectedIndex === null) {
            console.log("Voice Command: review cancelled");
            pendingVoiceReviewMatches.current = [];
            setGlobalBusy(false);
            voiceCommandStartTime.current = 0;
            return;
          }

          // Execute the selected match
          const match = pendingVoiceReviewMatches.current[selectedIndex];
          if (match) {
            console.log(`Voice Command: executing selected "${match.action.name}"`);
            const action = match.action;

            if ("type" in action && action.type === "main") {
              showToast(`"${action.name}" requires holding the hotkey. Use ${action.hotkey}`, "info");
            } else if ("method" in action) {
              await executeWebhookAction(action as WebhookAction);
            } else if ("prompt" in action) {
              await executePromptAction(action as PromptAction);
            }
          }

          pendingVoiceReviewMatches.current = [];
          setGlobalBusy(false);
          voiceCommandStartTime.current = 0;
        }
      );

      return unlisten;
    };

    const unlistenPromise = setupListener();

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [showToast, setGlobalBusy, executeWebhookAction, executePromptAction]);

  // Register voice command hotkey
  useEffect(() => {
    if (!settings.voiceCommandEnabled) {
      // Unregister if disabled
      if (registeredVoiceCommandHotkey.current) {
        unregister(registeredVoiceCommandHotkey.current).catch(console.error);
        registeredVoiceCommandHotkey.current = "";
      }
      return;
    }

    const setupVoiceCommandHotkey = async () => {
      try {
        // Unregister previous hotkey if different
        if (registeredVoiceCommandHotkey.current && registeredVoiceCommandHotkey.current !== hotkeyVoiceCommand) {
          await unregister(registeredVoiceCommandHotkey.current).catch(console.error);
          registeredVoiceCommandHotkey.current = "";
        }

        const alreadyRegistered = await isRegistered(hotkeyVoiceCommand);
        if (alreadyRegistered) {
          await unregister(hotkeyVoiceCommand);
        }

        await register(hotkeyVoiceCommand, async (event) => {
          // Skip if we're capturing a new hotkey in settings
          if (useAppStore.getState().isCapturingHotkey) {
            console.log("Ignoring voice command hotkey - capturing mode active");
            return;
          }

          if (event.state === "Pressed") {
            startVoiceCommandRecording();
          } else if (event.state === "Released") {
            stopVoiceCommandRecording();
          }
        });

        registeredVoiceCommandHotkey.current = hotkeyVoiceCommand;
        console.log(`Voice Command hotkey registered: ${hotkeyVoiceCommand}`);
      } catch (error) {
        console.error("Failed to register voice command hotkey:", error);
      }
    };

    setupVoiceCommandHotkey();

    return () => {
      if (registeredVoiceCommandHotkey.current) {
        unregister(registeredVoiceCommandHotkey.current).catch(console.error);
        registeredVoiceCommandHotkey.current = "";
      }
    };
  }, [hotkeyVoiceCommand, settings.voiceCommandEnabled, startVoiceCommandRecording, stopVoiceCommandRecording]);

  // Listen for manual voice command button trigger
  useEffect(() => {
    const handleVoiceCommandTrigger = () => {
      // Toggle behavior: if listening, stop; if not, start
      if (voiceCommandListening) {
        stopVoiceCommandRecording();
      } else {
        startVoiceCommandRecording();
      }
    };

    window.addEventListener("voice-command-trigger", handleVoiceCommandTrigger);
    return () => {
      window.removeEventListener("voice-command-trigger", handleVoiceCommandTrigger);
    };
  }, [voiceCommandListening, startVoiceCommandRecording, stopVoiceCommandRecording]);

  return (
    <div className="min-h-screen bg-background">
      <MainWindow />
      <HistoryPanel />
      <SettingsPanel />
      <RecordingIndicator />
      <Toast messages={toasts} onDismiss={dismissToast} />
      <ProfileChooserModal
        isOpen={profileChooserOpen}
        profiles={chromeProfiles}
        actionName={pendingUrlAction?.action.name ?? ""}
        onSelect={handleProfileSelect}
        onCancel={handleProfileCancel}
      />
      <VoiceCommandModal
        isOpen={voiceCommandModalOpen}
        transcribedText={voiceCommandTranscript}
        matches={voiceCommandMatches}
        autoExecuteThreshold={settings.voiceCommandAutoExecuteThreshold ?? 0.9}
        onExecute={executeVoiceCommandMatch}
        onCancel={handleVoiceCommandCancel}
      />
    </div>
  );
}

export default App;

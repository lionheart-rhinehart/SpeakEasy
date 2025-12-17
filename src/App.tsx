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
import type { WebhookAction, PromptAction, ChromeProfile } from "./types";

// Tauri format: use "Control" not "Ctrl", use "+" as separator
// These are now just fallbacks - actual hotkeys come from settings
const DEFAULT_RECORD_HOTKEY = "Control+Space";
const DEFAULT_AI_TRANSFORM_HOTKEY = "Control+Backquote";
const MIN_AI_TRANSFORM_RECORDING_MS = 300; // Minimum recording time to prevent immediate stop
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
  const registeredRecordHotkey = useRef<string>("");
  const registeredAiTransformHotkey = useRef<string>("");
  const registeredWebhookHotkeys = useRef<string[]>([]);
  const aiTransformClipboardText = useRef<string>("");
  const aiTransformStartTime = useRef<number>(0);

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
        try {
          // Use cached profiles if available, otherwise fetch
          let profiles = profilesCacheRef.current;
          if (!profiles) {
            console.log("URL action: fetching Chrome profiles...");
            profiles = await invoke<ChromeProfile[]>("list_chrome_profiles");
            profilesCacheRef.current = profiles;
          }

          if (profiles.length === 0) {
            // No profiles found, show toast and fall back to normal open
            showToast("No Chrome profiles found. Opening in default profile.", "info");
          } else {
            // Show profile chooser modal
            setChromeProfiles(profiles);
            setPendingUrlAction({ action, url: normalized.url });

            // Bring main window to foreground so user can see the modal
            const mainWindow = getCurrentWindow();
            await mainWindow.show();
            await mainWindow.setFocus();

            setProfileChooserOpen(true);
            return; // Don't open yet - wait for user selection
          }
        } catch (error) {
          console.error("URL action: failed to list Chrome profiles:", error);
          showToast("Couldn't list Chrome profiles. Opening in default profile.", "info");
          // Fall through to open without profile
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
    const setupActionHotkeys = async () => {
      // Unregister any previously registered hotkeys
      for (const hotkey of registeredWebhookHotkeys.current) {
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
          if (isReg) {
            await unregister(action.hotkey);
          }

          await register(action.hotkey, async (event) => {
            // Trigger on Pressed (like AI Transform) to copy while keys are held
            // This ensures the selection is still active before the editor processes the chord
            if (event.state === "Pressed") {
              // Get fresh action data in case it was updated
              const currentActions = useAppStore.getState().settings.webhookActions ?? [];
              const currentAction = currentActions.find((a) => a.id === action.id);
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
        if (!action.enabled || !action.hotkey || !action.prompt) continue;

        try {
          const isReg = await isRegistered(action.hotkey);
          if (isReg) {
            await unregister(action.hotkey);
          }

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
    </div>
  );
}

export default App;

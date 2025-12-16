import { useEffect, useRef, useCallback, useMemo } from "react";
import { register, unregister, isRegistered } from "@tauri-apps/plugin-global-shortcut";
import { invoke } from "@tauri-apps/api/core";
import { listen, emit } from "@tauri-apps/api/event";
import { useAppStore } from "./stores/appStore";
import MainWindow from "./components/MainWindow";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import RecordingIndicator from "./components/RecordingIndicator";
import type { WebhookAction } from "./types";

// Tauri format: use "Control" not "Ctrl", use "+" as separator
// These are now just fallbacks - actual hotkeys come from settings
const DEFAULT_RECORD_HOTKEY = "Control+Space";
const DEFAULT_AI_TRANSFORM_HOTKEY = "Control+Backquote";
const MIN_AI_TRANSFORM_RECORDING_MS = 300; // Minimum recording time to prevent immediate stop

function App() {
  const initialize = useAppStore((state) => state.initialize);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const settings = useAppStore((state) => state.settings);
  const webhookActions = useMemo(() => settings.webhookActions ?? [], [settings.webhookActions]);
  const hotkeyRecord = settings.hotkeyRecord || DEFAULT_RECORD_HOTKEY;
  const hotkeyAiTransform = settings.hotkeyAiTransform || DEFAULT_AI_TRANSFORM_HOTKEY;
  const registeredRecordHotkey = useRef<string>("");
  const registeredAiTransformHotkey = useRef<string>("");
  const registeredWebhookHotkeys = useRef<string[]>([]);
  const aiTransformClipboardText = useRef<string>("");
  const aiTransformStartTime = useRef<number>(0);

  useEffect(() => {
    initialize();
    // Show status bar on startup if enabled
    const showBar = settings.showStatusBar ?? true;
    if (showBar) {
      invoke("show_status_bar").catch(console.error);
    }
  }, [initialize, settings.showStatusBar]);

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

  // Emit status updates to status-bar window
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe((state) => {
      emit("status_update", {
        recordingState: state.recordingState,
        recordingStartTime: state.recordingStartTime,
      });
    });
    return () => unsubscribe();
  }, []);

  // Handle webhook action execution
  const executeWebhookAction = useCallback(async (action: WebhookAction) => {
    console.log(`Webhook: executing action "${action.name}"`);

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
      return;
    }

    if (!selectedText || selectedText.trim() === "") {
      console.log("Webhook: No text selected - nothing to send");
      return;
    }

    console.log(`Webhook: captured ${selectedText.length} chars from selection`);

    // Play a sound to indicate transform started
    const settings = useAppStore.getState().settings;
    if (settings.audioEnabled) {
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
        if (settings.audioEnabled) {
          invoke("play_sound", { soundType: "stop" }).catch(console.error);
        }

        console.log("Webhook: transform complete and pasted");
      } else {
        console.error("Webhook: request failed -", result.error);
      }
    } catch (error) {
      console.error("Webhook: HTTP request error -", error);
    }
  }, []);

  // Register webhook hotkeys
  useEffect(() => {
    const setupWebhookHotkeys = async () => {
      // Unregister any previously registered webhook hotkeys
      for (const hotkey of registeredWebhookHotkeys.current) {
        try {
          const isReg = await isRegistered(hotkey);
          if (isReg) {
            await unregister(hotkey);
            console.log(`Unregistered webhook hotkey: ${hotkey}`);
          }
        } catch (e) {
          console.error(`Failed to unregister hotkey ${hotkey}:`, e);
        }
      }
      registeredWebhookHotkeys.current = [];

      // Register new webhook hotkeys
      for (const action of webhookActions) {
        if (!action.enabled || !action.hotkey || !action.webhookUrl) continue;

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
              const currentActions = useAppStore.getState().settings.webhookActions;
              const currentAction = currentActions.find((a) => a.id === action.id);
              if (currentAction && currentAction.enabled) {
                executeWebhookAction(currentAction);
              }
            }
          });

          registeredWebhookHotkeys.current.push(action.hotkey);
          console.log(`Registered webhook hotkey: ${action.hotkey} -> ${action.name}`);
        } catch (error) {
          console.error(`Failed to register webhook hotkey ${action.hotkey}:`, error);
        }
      }
    };

    setupWebhookHotkeys();

    // Cleanup on unmount or when webhookActions changes
    return () => {
      for (const hotkey of registeredWebhookHotkeys.current) {
        unregister(hotkey).catch(console.error);
      }
      registeredWebhookHotkeys.current = [];
    };
  }, [webhookActions, executeWebhookAction]);

  return (
    <div className="min-h-screen bg-background">
      <MainWindow />
      <HistoryPanel />
      <SettingsPanel />
      <RecordingIndicator />
    </div>
  );
}

export default App;

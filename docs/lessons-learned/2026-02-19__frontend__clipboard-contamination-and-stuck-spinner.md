# Clipboard Contamination & Stuck Spinner in Prompt Actions

**Date:** 2026-02-19
**Area:** Frontend (App.tsx, RecordingButton, SettingsPanel, LLM backend)
**Tags:** clipboard, state-management, error-handling, zustand, tauri

---

## Summary

Two interacting bugs in PROMPT-type hotkey actions: (1) clipboard contamination where old transcription text silently gets appended to prompt output, and (2) stuck spinner where 6+ error paths fail to reset `recordingState`, locking the entire app.

## Problem 1: Clipboard Contamination

**Root cause:** `executePromptAction` and `executeWebhookAction` PROMPT mode always call `simulate_copy` + `get_clipboard_text`. When nothing is selected, the clipboard retains old transcription from the record hotkey. The stale text passes empty checks and gets sent to the LLM as `inputText`, contaminating the output.

**Hidden coupling:** The record hotkey copies transcription results to clipboard (for paste convenience). A subsequent prompt action hotkey fires `simulate_copy` on nothing, clipboard unchanged, stale transcription passes through.

**Fix:**
- Added stale clipboard detection: save clipboard before copy, compare after — if unchanged, nothing was actually selected
- Added per-hotkey `requiresSelection` toggle so standalone prompts skip clipboard entirely
- Updated LLM backend to handle empty `inputText` cleanly (don't format "Text to transform:\n\n\n\nInstruction:")

## Problem 2: Stuck Spinner (6+ Broken State Reset Paths)

**Root cause:** `addTranscription()` in the Zustand store unconditionally resets `recordingState` to `"idle"` as a **side effect**. Success paths call `addTranscription` and implicitly reset state. Error paths that DON'T call `addTranscription` leave `recordingState` stuck at `"processing"` forever.

**Impact:** When stuck, Record, AI Transform, AND Voice Command all stop working (they check `recordingState === "idle"` before starting). Only recovery was restarting the app.

**Broken paths found:**
1. Voice command transcription error catch
2. Voice command auto-execute → action fails
3. Voice command auto-execute → webhook PROMPT fails
4. Voice review → cancel
5. Voice review → execute → action fails
6. Voice review → execute → webhook PROMPT fails
7. `handleVoiceCommandCancel` missing resets for globalBusy, voiceCommandListening, recordingState

**Fix:**
- Added explicit `setRecordingState("idle")` to ALL error paths
- Fixed `handleVoiceCommandCancel` to reset all state flags
- Added 90s frontend timeout on LLM calls (backend has 60s but frontend waited forever)
- Added `promptActionBusy` ref to prevent concurrent execution
- Added click-to-cancel on RecordingButton when stuck in processing state

## Prevention

1. **Never rely on side effects for state cleanup.** If `addTranscription()` needs to reset `recordingState`, that coupling should be explicit and documented, not hidden.
2. **Every error path must reset state.** When adding `try/catch` around async operations that set state to "processing", the catch block MUST reset to "idle".
3. **Always provide manual recovery.** Disabled buttons during processing states with no timeout = guaranteed stuck UI.
4. **Clipboard operations are inherently fragile.** Always compare before/after to detect stale data. Never trust that `simulate_copy` actually copied something new.
5. **Per-action configuration > global settings.** Users need granular control over which actions require selected text vs. running standalone.

## References

- Files: `src/App.tsx`, `src/types/index.ts`, `src-tauri/src/config.rs`, `src/stores/appStore.ts`, `src-tauri/src/llm.rs`, `src/components/RecordingButton.tsx`, `src/components/SettingsPanel.tsx`
- Related: `addTranscription()` side effect in appStore.ts line ~402-406
- Existing but unused: `get_selected_text` command in clipboard.rs line ~419 (detects stale clipboard server-side)

# Phantom Dev Server Hotkey Conflicts & Silent Recording Failures

**Date:** 2026-02-18
**Area:** devops, hotkeys, error-handling, openai
**Tags:** test-protocol, global-shortcuts, dual-instance, o3-mini, reasoning-models, node-detection

## Summary

Three issues surfaced after test-protocol rebuilds: (1) hotkeys intermittently stopped working ~3 minutes after install, (2) recording start failures were invisible to the user, (3) OpenAI o3-mini rejected the `max_tokens` parameter. Root cause of #1 was the test-protocol always spawning a phantom dev server due to false-positive node.exe detection.

## Problem 1: Intermittent Hotkey Failures After Rebuild

**Symptom:** "works sometimes, then 3 min later it won't, then 30 sec later it will"

**Root cause:** `detectRunningDevServer()` in `scripts/test-protocol.mjs` checked for ANY `node.exe` process:
```javascript
const tasks = execSync('tasklist /FI "IMAGENAME eq node.exe" ...', ...);
devServerWasRunning = tasks.includes('node.exe');
```

Since Claude Code and the test-protocol script both run on node.exe, `devServerWasRunning` was **always true**. This caused `restartDevServer()` to spawn `npm run tauri:dev` in the background after every rebuild.

The dev server's Rust compilation takes ~3 minutes. When it finishes, the Tauri binary starts, triggers the single-instance plugin callback on the installed app (calling `window.show()` and `window.set_focus()`), and creates interference. The intermittent timing matched the compilation duration exactly.

**Fix:**
1. Changed detection to use WMIC command-line matching: `wmic.includes('tauri') && wmic.includes('dev')`
2. Added dev server process kill to `killRunningApp()` — finds and kills node processes with `tauri dev` in their command line
3. Used `--no-restart` flag during testing to prevent dev server spawn

**Key lesson:** When detecting specific processes on Windows, never match by executable name alone (`node.exe`, `python.exe`). Always match against the full command line to avoid false positives from unrelated processes.

## Problem 2: Silent Recording Start Failures

**Symptom:** User presses hotkey, hears start sound, but nothing happens afterward. No error visible.

**Root cause:** Two catch blocks in `src/App.tsx` used `console.error` only:
- Record hotkey start (line 294): `console.error("Failed to start recording:", error);`
- AI Transform start (line 498): `console.error("Failed to start AI Transform:", error);`

The start sound plays BEFORE `invoke("start_recording")`, so the user hears the sound but if the Rust backend fails (mic unavailable, audio driver issue), there's zero user feedback.

**Fix:** Added `showToast(...)` and state reset to both catch blocks.

**Key lesson:** This was the THIRD time we found "console.error only" catch blocks in the same file (first was AI Transform errors, second was hotkey registration, third was recording start). **Pattern: when fixing a bug class, grep for ALL instances immediately.** Don't fix one and move on — search for `console.error` across the entire file and fix them all at once.

## Problem 3: OpenAI o3-mini Parameter Rejection

**Symptom:** Toast error: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead."

**Root cause:** OpenAI reasoning models (o1*, o3*) use different API parameters:
- `max_tokens` → `max_completion_tokens`
- `temperature` → not supported (omit entirely)

The `transform_openai()` function in `src-tauri/src/llm.rs` used the same body for all models.

**Fix:** Added model prefix detection and conditional body construction:
```rust
let is_reasoning_model = request.model.starts_with("o1") || request.model.starts_with("o3");
```

**Key lesson:** When adding LLM provider support, always check the API docs for model-specific parameter differences. Reasoning models have different parameter names and restrictions.

## Prevention

- **Process detection:** Always match command-line content, not just executable name
- **Bug class hunting:** When finding a `console.error`-only catch, immediately grep for the pattern across ALL files
- **Test-protocol safety:** Use `--no-restart` flag when testing to eliminate dev server interference
- **LLM parameters:** Check model family docs before assuming universal parameter support

## Files Modified

- `scripts/test-protocol.mjs` — Fixed `detectRunningDevServer()` and `killRunningApp()`
- `src/App.tsx` — Added toasts to recording start catch blocks
- `src-tauri/src/llm.rs` — Conditional body for reasoning models

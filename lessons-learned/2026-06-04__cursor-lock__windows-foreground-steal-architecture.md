# Cursor Lock — delivering text to a background window on Windows

**Date**: 2026-06-04
**Area**: cursor-lock
**Tags**: tauri, rust, windows, win32, focus, ux

## Summary
Built "Cursor Lock": the user pins a destination field (click it, press Alt+Shift+Z),
then dictates and walks away; when transcription/transform output is ready, SpeakEasy
forces the locked window to the foreground, pastes, and optionally presses Enter. The
locked target is stored in a separate Tauri-managed `TargetState` (HWND as `isize`), and
ALL five output paste paths (dictation, AI Transform, both Prompt Actions, Webhook
response) route through one shared `pasteOutput()` helper so behavior can't drift.

## Problem
The hard part is foregrounding a *background* window. Per MSDN's `SetForegroundWindow`
Remarks, a background process is normally refused — Windows just flashes the taskbar
button instead. At delivery time the user is working in another app, so SpeakEasy is not
the foreground process and didn't receive the last input event → the focus-steal fails.
Naive code would then `Ctrl+V` (and Enter) into whatever app the user is currently in,
dumping the transcript into an unrelated document. `AttachThreadInput` is NOT a reliable
bypass on Win10/11.

## Root Cause
`SetForegroundWindow` only succeeds if a documented condition holds (e.g. "foreground
lock time-out has expired" or "calling process received the last input event"). None hold
for a background app at delivery time.

## Fix
In `src-tauri/src/target_window.rs`, `focus_window_robust()`:
1. `IsWindow()` guard against a stale/closed HWND.
2. Save then zero the foreground-lock timeout via
   `SystemParametersInfoW(SPI_SETFOREGROUNDLOCKTIMEOUT, 0, ...)` (the lever AutoHotkey's
   `WinActivate` uses), restore it afterward.
3. `AttachThreadInput` as a secondary aid (it lives in `Win32::System::Threading`, not
   `KeyboardAndMouse` — needed the `Win32_System_Threading` windows-crate feature).
4. **Return `GetForegroundWindow() == target`** as the only trustworthy success signal.

The `paste_to_target` command then **refuses to paste unless that returns true**, and
re-verifies foreground immediately before both the paste and the Enter. On failure the
text is left on the clipboard with a toast — a benign "press Ctrl+V yourself" instead of
corrupting another app. The target is `take()`n up front (one-shot, no double-fire).

## Verification
`cargo check --all-targets` with `-D warnings`, `tsc --noEmit`, eslint clean, full Tauri
release build + install + launch succeeded. Manual test plan includes a deliberate
"corruption guard" check: be typing in another app at delivery and confirm nothing lands
there if the locked window can't be reached.

## Prevention
Any feature that injects input into another window must treat focus-stealing as
best-effort and VERIFY (`GetForegroundWindow()`), never assume success. Always copy to
clipboard first so a failed delivery never loses data.

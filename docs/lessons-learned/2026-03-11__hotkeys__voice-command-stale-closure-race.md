# Voice Command Hotkey Stale Closure Race Condition

**Area:** hotkeys, React hooks, Tauri global shortcuts
**Date:** 2026-03-11
**Tags:** react, stale-closure, useCallback, useEffect, global-shortcut, windows

## Summary

Voice command hotkey (press-and-hold to record) broke after a Windows update. Root cause was a React stale closure race condition where the hotkey was being unregistered and re-registered between the Press and Release events, causing the Release event to be lost.

## Problem

The voice command hotkey registration `useEffect` included `startVoiceCommandRecording` and `stopVoiceCommandRecording` in its dependency array. These callbacks had volatile deps (`globalBusy`, `voiceCommandListening`) that changed the moment the user pressed the hotkey:

1. Press -> `setGlobalBusy(true)` + `setVoiceCommandListening(true)`
2. Both callbacks recreate (their deps changed)
3. useEffect re-runs -> **unregisters** the hotkey -> **re-registers** with new callbacks
4. Release event **lost** during the unregister/re-register gap
5. Recording never stops, state gets stuck

Additionally found:
- Early release (<200ms) left `globalBusy` stuck forever (no cleanup)
- Manual voice command button had the same stale closure issue
- No safety net to auto-recover from stuck `globalBusy`
- Even after fixing the race, Windows sent spurious immediate Release events for certain hotkey combos, making press-and-hold unreliable

## Solution

**4 fixes + 1 UX change, all in `src/App.tsx`:**

1. **Stabilized callbacks** - Changed `startVoiceCommandRecording` and `stopVoiceCommandRecording` to read volatile state from `useAppStore.getState()` instead of closures. Removed volatile deps.

2. **Ref safety layer** - Added `startVoiceCommandRecordingRef` and `stopVoiceCommandRecordingRef` refs. Hotkey handler calls via refs. Hotkey effect deps reduced to `[hotkeyVoiceCommand, settings.voiceCommandEnabled, showToast]` only.

3. **Early release cleanup** - Added full cleanup (stop Rust recording, reset globalBusy, hide overlay) in the early release path.

4. **globalBusy timeout** - Added 120-second safety net that auto-resets stuck globalBusy when not actively recording.

5. **Toggle mode** - Switched voice command from press-and-hold to toggle (press to start, press again to stop). Eliminates dependency on Released events entirely.

## Prevention

- **Rule:** For press/release hotkeys, NEVER put callbacks with volatile deps in the useEffect dependency array. Use refs + `useAppStore.getState()`.
- **Pattern:** Compare with the record hotkey (stable deps: `[hotkeyRecord, showToast]`, all state read inline) as the reference implementation.
- **Test:** After any hotkey change, verify in console that the hotkey registration log appears ONCE at startup, not repeated between press/release.

## References

- `src/App.tsx` lines 1488-1680 (voice command callbacks)
- `src/App.tsx` lines 1757-1816 (hotkey registration with refs)
- Record hotkey (working reference): `src/App.tsx` lines 246-429
- AI Transform hotkey (working reference): `src/App.tsx` lines 431-695

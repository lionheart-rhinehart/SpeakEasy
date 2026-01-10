# Handoff: Transcription Stuck on Processing Bug

**Generated:** 2026-01-04 16:00
**From Worker:** Chat-A
**Reason:** Stuck - need fresh perspective, wasting user's time

---

## THE ACTUAL PROBLEM

User reports: "Transcription was working for months, then suddenly stopped. When I use the hotkey to transcribe, it gets stuck on 'Processing...' forever and I have to hit refresh."

**CRITICAL INSIGHT:** When we added debug logging to the Rust backend and tested, **ZERO logs were written** when the user pressed the hotkey. This means:

1. The Rust `start_recording` command is NEVER being called
2. The Rust `stop_recording` command is NEVER being called
3. The Rust `transcribe_audio` command is NEVER being called

**The problem is 100% in the FRONTEND JavaScript/TypeScript.** The backend is fine - it's just never receiving any commands from the frontend.

---

## WHAT WAS TRIED (ALL FAILED)

### Attempt 1: Timeout Wrapper
- Created `src/utils/transcriptionWithTimeout.ts` with Promise.race timeout
- Created `src/utils/transcriptionErrors.ts` for user-friendly errors
- Modified App.tsx, RecordingButton.tsx, RecordingOverlay.tsx
- **Result:** Made things worse, reverted all changes

### Attempt 2: Backend Timeout Reduction
- Reduced HTTP timeout from 900s to 45s
- Reduced retries from 5 to 3
- **Result:** No effect because backend wasn't even being called

### Attempt 3: File-based Debug Logging
- Modified main.rs to write logs to `C:\Users\lionh\AppData\Local\SpeakEasy\debug.log`
- Added debug logs to commands.rs (start_recording, stop_recording, transcribe_audio)
- Added debug logs to transcription.rs
- **Result:** Only "SpeakEasy starting up..." appeared. NO logs when hotkey pressed.

### Attempt 4: Full Revert
- Reverted ALL code changes to original state
- Clean rebuild
- **Result:** User says it still doesn't work

---

## KEY FINDING

The debug log shows the Rust backend starts fine:
```
=== SpeakEasy Debug Log ===
Started: 2026-01-04 15:48:23.410285100 -05:00
Log path: "C:\\Users\\lionh\\AppData\\Local\\SpeakEasy\\debug.log"
===========================

[15:48:23.410] INFO - SpeakEasy starting up...
```

But when user presses the transcription hotkey, **NOTHING is logged**. The Rust commands are never called.

---

## WHAT THE NEXT CHAT SHOULD INVESTIGATE

1. **Frontend Hotkey Handler** - Check App.tsx where global shortcuts are registered and handled
   - Look for `tauri-plugin-global-shortcut` usage
   - Check if the shortcut callback is actually invoking Rust commands
   - Check for silent JavaScript errors

2. **Check if Hotkeys Work At All**
   - Does the recording overlay appear when hotkey is pressed?
   - Is the frontend detecting the hotkey but failing to call invoke()?

3. **Test invoke() Directly**
   - Try calling `invoke("start_recording")` from a button click
   - See if basic IPC works at all

4. **Check for External Factors**
   - Did Windows update break something?
   - Did a dependency update?
   - Check if API key is actually being loaded

5. **Run in Dev Mode**
   - Use `npm run tauri dev` to see console.log output
   - This will show any JavaScript errors

---

## CURRENT FILE STATE

All code changes were REVERTED. Current state should be identical to the last working commit (26028cc).

**Uncommitted files (ignore these - just .claude config):**
- .claude/commands/* (new)
- .claude/rules/* (new)
- src/utils/transcriptionErrors.ts (DELETE THIS)
- src/utils/transcriptionWithTimeout.ts (DELETE THIS)

---

## PROJECT INFO

- **Tech Stack:** Tauri (Rust backend + React/TypeScript frontend)
- **Hotkey Plugin:** tauri-plugin-global-shortcut
- **Audio Recording:** cpal (Rust)
- **Transcription API:** OpenAI Whisper

---

## STARTER PROMPT

Copy everything below into a new Claude Code chat:

---

I have a critical bug in my SpeakEasy app that I use all day. The transcription feature stopped working suddenly after months of working fine.

**The Problem:**
- When I press the transcription hotkey, it gets stuck on "Processing..." forever
- I have to refresh to recover

**Critical Discovery from Previous Debugging:**
We added debug logging to the Rust backend. When I press the hotkey, **ZERO logs appear**. The Rust commands (start_recording, stop_recording, transcribe_audio) are NEVER being called.

This means the problem is 100% in the **frontend JavaScript** - the hotkey is either not being detected, or the invoke() calls to Rust are failing silently.

**What I Need:**
1. Run the app in dev mode (`npm run tauri dev`) so we can see console.log output
2. Find where the hotkey handler calls invoke() in the frontend code
3. Figure out why the frontend isn't calling the Rust backend

Please start by reading App.tsx and finding the hotkey registration/handling code. The hotkeys use `tauri-plugin-global-shortcut`.

---

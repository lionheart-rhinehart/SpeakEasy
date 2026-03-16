# Intermittent Voice Detection Failures

**Date:** 2026-03-16
**Area:** Audio Pipeline (Rust + Frontend)
**Severity:** Critical — core feature broken intermittently

## Summary

Voice recording appeared to start (beep played, overlay showed) but transcription returned empty or failed silently. Affected all 3 recording flows: regular hotkey, voice commands, and AI Transform. Intermittent — sometimes worked, sometimes didn't.

## Root Causes Found (6 total)

### 1. CRITICAL: Beep/Recording WASAPI Conflict

**Problem:** `play_beep()` in `audio.rs` uses rodio (which internally uses cpal) to open an audio OUTPUT stream and blocks for ~150ms. The frontend fired `play_sound` as fire-and-forget, then immediately called `start_recording`. Both Tauri commands ran concurrently on separate threads — rodio's output stream and cpal's input stream competed for Windows WASAPI initialization simultaneously.

On Windows (especially USB audio or shared input/output devices), concurrent WASAPI stream creation can cause the input stream to **silently fail or start in a degraded state**, producing zero samples while appearing to work.

**Fix:** Changed all 3 flows from `invoke("play_sound").catch(...)` (fire-and-forget) to `await invoke("play_sound")`. The beep now fully completes (and its output stream is dropped) before recording starts. Adds ~150ms imperceptible delay.

**Lesson:** Never open concurrent audio streams on Windows. Sequence audio operations — output first, then input.

### 2. CRITICAL: Audio Stream Initialization Race Condition

**Problem:** `AudioRecorderHandle::start()` spawned a thread to set up the cpal input stream, then slept only 50ms before returning success. Inside the thread: device enumeration, config lookup, stream building (3 format variants), setting `is_recording = true`, and calling `stream.play()` — all of which can take >100ms on Windows. The frontend got "success" back but the stream wasn't actually capturing yet.

**Fix:** Replaced the 50ms sleep with an `mpsc::channel` synchronization. The spawned thread sends `Ok(())` through a `ready_tx` channel after `stream.play()` succeeds. `start()` waits on `ready_rx.recv_timeout(3s)` — only returning success when the stream is confirmed running. Error paths (thread panic, setup failure, timeout) reset `is_recording` to prevent "Already recording" on next attempt.

**Lesson:** Never use `thread::sleep` as a synchronization mechanism. Use proper sync primitives (channels, condvars) to confirm work completion across threads.

### 3. Silent Empty Transcription Results

**Problem:** When OpenAI Whisper returned `{ text: "" }` (on silence/near-silence), the regular recording flow silently added an empty entry to history and auto-pasted nothing. No toast, no feedback. User thought it "didn't work."

**Fix:** Added empty-text checks in regular recording (App.tsx) and RecordingButton.tsx. Shows "No speech detected" toast. Voice commands and AI Transform already had this check.

**Lesson:** Always validate API response content, not just success status. An API returning `200 OK` with empty data is a different failure mode than a `4xx/5xx` error.

### 4. No Audio Signal Validation

**Problem:** Only check was `samples.is_empty()`. Recordings with near-zero peak level (mic muted/disconnected) or very short duration (<200ms) got sent to Whisper, wasting API calls.

**Fix:** Added in `stop()`: peak level check (< 0.001 = "No audio signal detected"), duration check (< 200ms = "Recording too short"), and diagnostic logging of sample count, duration, and peak level.

**Lesson:** Validate data quality at the source (audio capture), not just at the destination (Whisper API). Fail fast with clear messages.

### 5. Noise Gate Too Aggressive

**Problem:** Noise gate threshold was 10% of RMS. The soft gate progressively attenuated samples below this threshold. For quiet speakers or distant mics, actual voice content was being suppressed.

**Fix:** Reduced from `rms * 0.1` to `rms * 0.03`. Still suppresses electrical hum but preserves quiet speech.

### 6. Missing Error Toasts

**Problem:** Voice command start failure (App.tsx) silently reset state with no toast. RecordingButton set state to `"error"` which isn't a valid recordingState value.

**Fix:** Added toast to voice command catch block. Changed RecordingButton to `"idle"`.

## Key Debugging Insight

The critical clue was: "beep plays but voice not detected, OS voice-to-text works fine." This meant:
- Mic hardware = working
- Audio drivers = working
- Issue was in app's audio pipeline specifically

The beep playing confirmed the hotkey handler fired and reached the recording code. The fact that OS voice-to-text worked ruled out hardware/driver issues. The intermittent nature pointed to a timing/race condition rather than a configuration issue.

## Prevention

1. **Audio operations must be sequential** — never fire-and-forget audio commands that could overlap
2. **Thread synchronization must be explicit** — channels/condvars, never sleeps
3. **Every user-facing operation needs a feedback path** — toast for success, toast for empty, toast for error
4. **Validate captured data before sending to external APIs** — signal level, duration, format
5. **Audio processing parameters (noise gate, etc.) should err on the side of preserving signal** — let Whisper handle noise, it's good at it

## Files Modified

- `src-tauri/src/audio.rs` — Race condition fix, sample validation, noise gate reduction
- `src/App.tsx` — Await beep in 3 flows, empty transcription feedback, voice command toast
- `src/components/RecordingButton.tsx` — Empty transcription feedback, fix invalid state

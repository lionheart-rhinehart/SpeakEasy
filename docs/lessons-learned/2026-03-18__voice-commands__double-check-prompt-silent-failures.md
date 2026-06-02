# Voice Command "Double Check Prompt" Silent Failures

**Date:** 2026-03-18
**Area:** Voice Commands, API Keys, Fuzzy Matching
**Tags:** voice-commands, api-keys, whisper, fuzzy-match, silent-failures

## Summary

"Double check prompt" voice command appeared completely broken — user would speak it, hear the beep, but nothing happened. No error in history, no toast, nothing. Root cause was THREE compounding issues that all had to be fixed together.

## Problem 1: API Key Not Shared Between Whisper and AI Transform

The Whisper transcription key (stored in frontend localStorage / Zustand) and the AI Transform key (stored in backend Windows Credential Manager) were completely separate storage systems. User entered their OpenAI key for Whisper — transcription worked. But "double check prompt" is a PROMPT action that calls `transform_with_llm`, which looked for a key in the credential store and found nothing. Error: "No API key set for AI Transform."

## Problem 2: Errors Were Invisible

When prompt actions failed (no API key, 401 error, etc.), the error was only shown as a toast notification that disappeared after a few seconds. Nothing was logged to the transcription history. So if the user wasn't watching at the exact right moment, the failure was completely invisible — it looked like the voice command never triggered at all.

## Problem 3: Whisper Punctuation Broke Fuzzy Matching

Whisper transcribes "double check prompt" as "Double check prompt." (with period) or "double-check prompt" (with hyphen). The fuzzy matcher was comparing raw transcription against action names. Punctuation and hyphens caused the match confidence to drop, sometimes below the auto-execute threshold.

## Fix

1. **API key fallback:** When `transform_with_llm` is called with provider=OpenAI and no dedicated key exists, fall back to the Whisper API key (synced from frontend → backend on startup and on change via `set_api_key` command)
2. **Error visibility:** ALL voice command and prompt action errors/results now log to transcription history. User can always scroll back and see exactly what happened.
3. **Text normalization:** Added `normalize()` function to fuzzy matcher that strips punctuation, converts hyphens to spaces, and collapses whitespace before matching.

## Prevention

- Any feature that can fail silently MUST log to a user-visible history, not just toast
- When two features share the same external service (OpenAI), keys should fall back to each other
- Voice command matching must account for Whisper's formatting quirks (punctuation, hyphens, capitalization)

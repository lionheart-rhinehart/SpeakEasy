# Fix AI Transform Silent Errors & Vite Multi-Page Build

**Date:** 2026-02-18
**Area:** bugfix, build
**Tags:** ai-transform, error-handling, showToast, vite, multi-page

## Summary

AI Transform feature failed silently — hotkey fired (sound played) but nothing happened. All errors were only logged to `console.error` with zero user-visible feedback. Additionally, Vite production builds were broken by inline `<style>` tags in multi-page HTML entry points.

## Problem 1: Silent Error Handling

The AI Transform hotkey handler in `src/App.tsx` had 4 error paths that all silently swallowed errors:

1. **LLM transform failure** (lines 617-624) — `console.error` only, no toast, no history entry
2. **No transcription API key** (lines 533-539) — silent return, no toast
3. **No voice instruction detected** (lines 564-570) — silent return, no toast
4. **Early release < 300ms** (BUG-003, lines 511-514) — no state cleanup, app gets stuck in recording mode

The rest of the app uses `showToast()` in 30+ places, but the AI Transform `useEffect` never called it. The `showToast` function wasn't even in the dependency array.

## Solution 1

- Added `showToast()` with error-type-specific messages (NoApiKey, InvalidApiKey, ModelNotFound, RateLimited, generic) to the LLM failure path
- Added error entries to transcription history so user has a record
- Added toasts to the no-API-key and no-instruction paths
- Added proper state cleanup (reset refs, hide overlay, set idle) for the early release path (BUG-003)
- Added `showToast` to the `useEffect` dependency array

## Problem 2: Vite Multi-Page Build Failure

Three HTML entry points (`overlay.html`, `voice-review.html`, `profile-chooser.html`) had inline `<style>` tags. Vite's `html-inline-proxy` plugin can't process these during multi-page production builds, causing `Could not load ...?html-proxy&inline-css&index=0.css` errors.

## Solution 2

Extracted the shared inline CSS into `src/styles/transparent-window.css` and replaced inline `<style>` tags with `<link rel="stylesheet">` references in all three HTML files.

## Prevention

- **Always use `showToast` for user-facing errors** — never rely on `console.error` alone
- **Check `useEffect` dependency arrays** when using callbacks from parent scope
- **Avoid inline `<style>` in HTML entry points** for Vite multi-page builds — use external CSS files instead
- **Pattern: any early return from a function that started async operations needs cleanup**

## Files Modified

- `src/App.tsx` — AI Transform error handling + BUG-003 fix
- `overlay.html` — Extracted inline CSS
- `voice-review.html` — Extracted inline CSS
- `profile-chooser.html` — Extracted inline CSS
- `src/styles/transparent-window.css` — New shared CSS for transparent windows

# localStorage quota overflow white-screens the whole app

**Date:** 2026-06-17
**Area:** storage / state persistence
**Tags:** zustand, persist, localStorage, error-boundary, quota

## Summary

A `QuotaExceededError` from the zustand `persist` layer was crashing the entire
app to a blank white window (most visibly when opening Settings), and throwing a
`Voice command error: QuotaExceededError` toast on voice commands.

## Problem

- Persisted store (`speakeasy-storage`) keeps `history` + `vocabulary` + `apiKey`
  in **localStorage**, which is capped at ~5 MB per origin.
- The history trim limit (`historyLimitMb`) **defaulted to 10 MB** and the
  Settings slider allowed **up to 50 MB** — both above the real quota. So the
  trimmer let `history` grow past what localStorage could hold.
- zustand `persist` writes the whole partialized state on **every `set()`**. Once
  over quota, *every* state change threw `QuotaExceededError`:
  - Opening Settings fires a `set()` → throw.
  - Running a voice command fires a `set()` → throw (the toast).
- There was **no React error boundary anywhere**, so an uncaught throw during a
  render/handler unmounted the whole tree → white screen.

## Solution

1. **Cap below the real quota:** added `MAX_HISTORY_LIMIT_MB = 4`, lowered the
   default to 4, clamped the trim to `Math.min(settings.historyLimitMb, MAX...)`,
   and set the Settings slider `max` to the constant. (`src/stores/appStore.ts`,
   `src/components/SettingsPanel.tsx`)
2. **Safe storage wrapper:** `createJSONStorage` over a `safeLocalStorage` whose
   `setItem` catches `QuotaExceededError`, drops the write instead of throwing,
   and dispatches a `speakeasy-toast` `CustomEvent` so the user sees a warning.
   App.tsx listens for that event and calls `showToast`. (`src/stores/appStore.ts`,
   `src/App.tsx`)
3. **Top-level error boundary:** new `src/components/ErrorBoundary.tsx` wrapping
   `<App />` in `main.tsx` — shows a "Something went wrong" + Reload UI instead of
   a blank window for any future throw.

## Prevention

- Any limit that gates writes to a quota-bound store (localStorage ~5 MB) MUST be
  capped below the real quota — never trust a user/file-configured value.
- A persist layer should never be able to throw synchronously into React. Wrap
  storage `setItem` in try/catch.
- Keep a top-level error boundary so no single throw can white-screen the app.
  (Secondary windows overlay/profileChooser/voiceReview still lack one — follow-up.)

## References

- `src/stores/appStore.ts` (MAX_HISTORY_LIMIT_MB, safeLocalStorage, addTranscription)
- `src/components/ErrorBoundary.tsx`, `src/main.tsx`, `src/App.tsx`
- Plan: `~/.claude/plans/full-fix-lower-the-memoized-mochi.md`

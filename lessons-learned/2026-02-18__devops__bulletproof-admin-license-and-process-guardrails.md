# Bulletproof Admin License Persistence & Process Guardrails

**Date:** 2026-02-18
**Area:** devops, license, error-handling
**Tags:** admin-bypass, marker-file, triple-redundancy, hotkey-registration, coding-rules, smoke-test

## Summary

Admin license status kept resetting because `activate_license()` hardcoded `is_admin: false`. Additionally, hotkey registration failures were silent (same bug class as the AI Transform errors fixed earlier). Added triple-redundant admin persistence, toast notifications on all hotkey registrations, coding rules in CLAUDE.md, and smoke test checklist to test-protocol.

## Problem 1: Admin Status Wipe Cycle

The `activate_license()` function at `src-tauri/src/license.rs:630` always created state with `is_admin: false`. Two code paths triggered it:
1. **State file missing but key exists** (line 692) — e.g., after file deletion or corruption
2. **Machine ID mismatch** (line 702) — e.g., hardware change

This created a cycle: admin set to true manually -> something triggers re-activation -> admin reset to false -> Supabase is down (free tier paused) -> grace period banner returns.

**Why previous fix was wrong:** The keychain fallback check at line 652 compared `get_license_key()` against `ADMIN_LICENSE_KEY`, but the keychain had the regular license key (`1761...`), not the admin key. The check always returned false for non-admin-activated users.

## Solution 1: Triple Redundancy

Three independent mechanisms, any ONE preserving admin status:

| Mechanism | Survives state deletion | Survives keychain wipe | Survives reinstall |
|-----------|------------------------|------------------------|--------------------|
| `is_admin` in license.json | No | Yes | Yes |
| `.admin` marker file | Yes | Yes | Yes |
| Keychain = ADMIN_LICENSE_KEY | Yes | No | Yes |

Changes:
- `activate_license()` now reads existing `is_admin` from state AND checks `.admin` marker file before creating new state
- `save_license_state()` syncs `.admin` marker file on every save
- `validate_license()` checks all three sources: state flag, marker file, keychain

## Problem 2: Silent Hotkey Registration Failures

All three hotkey registrations (record, AI transform, voice command) had the same bug pattern as the original AI Transform issue: `console.error` only, zero user-visible feedback. If a hotkey failed to register, the user would press it and nothing would happen — no sound, no toast, no indication of failure.

This is the EXACT same class of bug we fixed for transform errors in the same session, but in a different location.

## Solution 2: Toast on Registration Failure

Added `showToast()` calls to all three hotkey registration catch blocks:
- Record hotkey: `src/App.tsx:412`
- AI Transform hotkey: `src/App.tsx:678`
- Voice Command hotkey: `src/App.tsx:1701`

Also fixed the voice command useEffect dependency array to include `showToast`.

## Problem 3: No Process Guardrails

No rules existed to prevent shipping silent errors. No manual verification checklist existed in the test protocol.

## Solution 3: Coding Rules + Smoke Test

- Added **Coding Rules** section to `CLAUDE.md` with three mandatory rules:
  1. Error Visibility: every catch must have user-visible feedback
  2. Offline-First Design: no remote dependencies on critical paths
  3. Change Verification: end-to-end manual testing requirements

- Added **Smoke Test Checklist** to `scripts/test-protocol.mjs` — prints after app launch:
  - App launched without banner?
  - Ctrl+Space works?
  - AI Transform hotkey responds?
  - Settings panel works?
  - No error toasts on startup?

## Prevention

- **"console.error only" is now a codified violation** in CLAUDE.md coding rules
- **Admin status uses triple redundancy** — no single point of failure can wipe it
- **Smoke test checklist** makes manual verification explicit and visible in the pipeline
- **Pattern: when fixing a bug class, grep for the same pattern elsewhere** — the silent hotkey registration was the same bug as silent transform errors, just in different code

## Files Modified

- `src-tauri/src/license.rs` — Admin marker file system, preserve admin in activate_license, triple-check in validate_license
- `src/App.tsx` — showToast on all 3 hotkey registration catch blocks, voice command useEffect deps
- `CLAUDE.md` — New coding rules section
- `scripts/test-protocol.mjs` — Smoke test checklist step

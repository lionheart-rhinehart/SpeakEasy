---
name: Gmail_Hotkey_ChromeProfiles
overview: Add an “ask which Chrome profile” chooser for URL hotkeys (e.g. Gmail), by enumerating Chrome profiles and launching Chrome with `--profile-directory` so the same Gmail URL reliably opens the intended inbox.
todos:
  - id: types-action-fields
    content: Extend `WebhookAction` with minimal “ask profile” fields needed for URL actions (no pinning).
    status: completed
  - id: tauri-list-profiles
    content: Add `list_chrome_profiles` command that reads Chrome User Data/Local State and returns available profiles with friendly names + directory IDs.
    status: completed
  - id: tauri-open-with-profile
    content: Update `open_url_in_chrome` to accept optional `profile_directory` and pass `--profile-directory` when launching Chrome.
    status: completed
  - id: settings-ui-profile
    content: Add a simple “Ask which Chrome profile” toggle for URL actions (uses friendly names from `list_chrome_profiles`).
    status: completed
  - id: runtime-ask-modal
    content: Implement an in-app profile chooser modal shown on hotkey press; add quick filter; wire URL open to chosen profile.
    status: completed
  - id: manual-verify
    content: Verify on Windows with multiple Chrome profiles; validate discovery, chooser UX, error/fallback behavior, and backwards compatibility.
    status: completed
---

# Add Chrome-profile-aware URL hotkeys

## What you have today

- URL hotkeys call `open_url_in_chrome(url)` which launches Chrome (or falls back to default browser) but **does not pick a Chrome profile** (it just opens in whatever profile Chrome decides).
- See `open_url_in_chrome` in [src-tauri/src/commands.rs](src-tauri/src/commands.rs), which currently does `Command::new(path).arg(&url).spawn()`.

## Goal

- For URL hotkeys (especially Gmail), **always ask which Chrome profile** to use at trigger-time, and open the URL inside that profile so the correct inbox/session is used.

## Approach

### 1) Extend action config (frontend)

- Extend `WebhookAction` in [src/types/index.ts](src/types/index.ts) with the minimal fields for this feature (backward compatible):\n+  - `askChromeProfile?: boolean` (applies to `method === "URL"`; default false for existing actions)\n+- We are explicitly **not** adding “pin to specific profile” in this iteration to keep scope tight and avoid configuration complexity.

### 2) Add backend support to enumerate profiles (Windows)

- Add a new Tauri command in [src-tauri/src/commands.rs](src-tauri/src/commands.rs):
- `list_chrome_profiles() -> Result<Vec<ChromeProfile>, String>`
- `ChromeProfile` contains at least:
- `profile_directory: String` ("Default", "Profile 1", …)
- `display_name: String` (friendly name from Chrome’s `Local State` if available; fallback to directory name)
- Implementation (Windows-first):
- Read Chrome user data dir: `%LOCALAPPDATA%\\Google\\Chrome\\User Data`.
- Parse `Local State` JSON for `profile.info_cache` to map directory → display name.
- Also scan subdirs `Default` and `Profile *` to ensure we include profiles even if Local State parsing fails.\n+- Sort by friendly name (case-insensitive) for a stable chooser experience.

### 3) Upgrade URL opening command to accept profile selection

- Update `open_url_in_chrome` in [src-tauri/src/commands.rs](src-tauri/src/commands.rs) signature to accept optional args:
- `open_url_in_chrome(url: String, profile_directory: Option<String>) -> Result<OpenUrlResponse, String>`
- When Chrome is found and `profile_directory` is provided:
- Launch Chrome as:
- `chrome.exe --profile-directory="<dir>" <url>`
- Keep the current safe `.arg(...)` approach (no shell).
- If Chrome isn’t found / spawn fails, keep your existing `open::that(&url)` fallback.

### 4) Settings UI: enable “Ask which profile” per URL action

- In [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx) when editing an action of type `URL` (and optionally `SMART_URL`):
- Add a single checkbox/toggle: **Ask which Chrome profile on run**.\n+- (No pinned profile dropdown in this iteration.)\n+- Persist `askChromeProfile` with the action.

### 5) Runtime chooser (shown when Ask is enabled)

- In [src/App.tsx](src/App.tsx), for `action.method === "URL"`:
- If `action.askChromeProfile === true`:\n+  - Load cached profile list (from `list_chrome_profiles`) and show a small modal/overlay chooser.\n+  - Include a **type-to-filter** input so selection is fast with many profiles.\n+  - User picks a profile; then call `open_url_in_chrome` with that `profile_directory`.\n+- Else: call `open_url_in_chrome` with no profile (current behavior).

### 6) Reliability + failure modes (must-have)

- If Chrome profile discovery fails:\n+  - Show a toast explaining we couldn’t list profiles.\n+  - Fall back to opening the URL normally (no profile arg) so the hotkey still works.\n+- If the chooser is opened but user cancels:\n+  - Do nothing (no browser launch) and show no error.\n+- Cache profile list in-memory (per app run) to avoid filesystem reads on every hotkey press.

### 7) Gmail convenience (optional but nice)

- Add a one-click preset in the action editor for Gmail URL (e.g. `https://mail.google.com/mail/u/0/#inbox`) and/or allow storing a per-action “Gmail account index” if you also want to force account selection inside Gmail.
- Note: Chrome profile targeting is the most reliable way to land in the right inbox.

## Test plan (Windows)

- Create 2+ Chrome profiles and verify:
- A URL hotkey with “Ask which Chrome profile” enabled shows a chooser with friendly names and opens in the selected profile.
- Existing URL hotkeys without profile fields still work.
- Discovery fallback: if `Local State` parse fails, directory scan still returns usable options.
- Fallback to default browser still works when Chrome isn’t available.

## Key files to change

- Frontend types: [src/types/index.ts](src/types/index.ts)
- Settings UI: [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx)
- Hotkey execution: [src/App.tsx](src/App.tsx)
- Tauri commands: [src-tauri/src/commands.rs](src-tauri/src/commands.rs)
- Command registration already includes `open_url_in_chrome` in [src-tauri/src/lib.rs](src-tauri/src/lib.rs); we’ll also register `list_chrome_profiles`.
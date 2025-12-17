---
name: WebhookHotkey_URLActions_v2
overview: Add two new hotkey action modes—open a preset URL in Chrome and smart-open highlighted text (URL if valid, else Google search)—with user-visible errors, sound feedback, debouncing, and history logging; keep existing GET/POST webhook behavior unchanged (Windows-first).
todos:
  - id: types
    content: Extend `WebhookAction.method` to include `URL` and `SMART_URL`.
    status: pending
  - id: tauriCmd
    content: Add `open_url_in_chrome` command with Chrome discovery, safe spawn, fallback open, and structured response.
    status: pending
  - id: settingsUI
    content: Update SettingsPanel method dropdown; hide/require URL field based on mode; adjust save validation.
    status: pending
  - id: appExecution
    content: Branch execution in App.tsx by method; add 500ms debounce; add sound + open_url invoke; handle errors.
    status: pending
  - id: notifications
    content: Add user-visible notifications for invalid URL, empty selection, and open failures (toast preferred, alert acceptable).
    status: pending
  - id: history
    content: Log URL opens/searches to the existing transcription history.
    status: pending
  - id: manualVerify
    content: Run Windows manual test plan; verify no webhook regression, Chrome/fallback behavior, debounce, history, sounds, errors.
    status: pending
---

# Webhook hotkey URL actions

## Goal

Extend the existing **Webhook Actions** hotkey system so an action can:

- **POST/GET**: current webhook transform behavior (copy selection → call backend → paste response)
- **URL**: open a **preset** URL in **Google Chrome**
- **SMART_URL**: copy **highlighted text** and:
- if it’s a URL (or URL-like), open it in Chrome
- otherwise, open a **Google search** for the text in Chrome

Also required:

- **User-visible error feedback** (not just console)
- **Sound feedback** on trigger (reuse existing `start` sound; respect `audioEnabled`)
- **Debounce** to prevent spam opens
- **History logging** in the same transcription/history panel
- **Windows-only** support for now (macOS later)

## Existing code touchpoints (where changes will go)

- UI for actions: [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx)
- Hotkey registration + execution: [src/App.tsx](src/App.tsx)
- Action type: [src/types/index.ts](src/types/index.ts)
- Backend commands: [src-tauri/src/commands.rs](src-tauri/src/commands.rs)
- Command registration: [src-tauri/src/lib.rs](src-tauri/src/lib.rs)

## Design decisions

### Action representation (backwards-compatible)

Keep using `WebhookAction` but expand `method` to represent “mode”:

- `method`: `"POST" | "GET" | "URL" | "SMART_URL"`
- keep existing `webhookUrl` field:
- for `POST/GET`: webhook endpoint
- for `URL`: preset website URL
- for `SMART_URL`: unused/optional (UI hides it)

This avoids migrations: existing persisted `POST/GET` actions keep working.

### URL normalization rules

For **URL** mode: normalize stored URL before opening.
For **SMART_URL** mode: normalize selected text.

Normalization algorithm:

1. Trim whitespace.
2. If empty → error.
3. If starts with `http://`, `https://`, or `file://` → use as-is.
4. Else if looks like a host/path:

- contains a dot and no spaces (e.g. `openai.com`, `foo.bar/baz`) OR matches localhost/IP patterns (`localhost:3000`, `127.0.0.1:4000`)
- then prefix `https://`.

5. Else → Google search:

- `https://www.google.com/search?q=${encodeURIComponent(text)}`

This supports “anything” including long Google Drive URLs, images, etc.

## Backend: open URL in Chrome (Windows-first)

Add a new Tauri command:

- `open_url_in_chrome(url: String) -> Result<OpenUrlResponse, String>`

`OpenUrlResponse`:

- `success: bool`
- `opened_with: "chrome" | "default"`
- `error: Option<String>`

Implementation notes (Windows):

- **Discover Chrome** by trying:
- `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`
- `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`
- `%LOCALAPPDATA%\\Google\\Chrome\\Application\\chrome.exe` (expand env var)
- **Spawn safely** via `std::process::Command`:
- pass URL as a single `.arg(url)` (no shell interpolation) to avoid command injection.
- If Chrome can’t be launched: **fallback** to opening with the system default browser (via Tauri shell open).

Register the command in `invoke_handler!` in [src-tauri/src/lib.rs](src-tauri/src/lib.rs).

## Frontend: Settings UI changes

In [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx):

- Extend the “Method” dropdown options:
- `POST (webhook)`
- `GET (webhook)`
- `URL (open in Chrome)`
- `Selection → URL or Google search`
- Conditional rendering:
- `POST/GET`: show input label “Webhook URL”
- `URL`: show input label “Website URL”
- `SMART_URL`: hide URL input (not required)
- Validation:
- action name always required
- URL required for `POST/GET/URL`, not required for `SMART_URL`

Optional rename: section header “Webhook Actions” → “Hotkey Actions” (since it now does more).

## Frontend: execution logic changes

In [src/App.tsx](src/App.tsx):

- Keep hotkey registration loop the same, but branch `executeWebhookAction(action)` by `action.method`:

### Debounce

- Add a `useRef<Map<string, number>>` storing last-run timestamps by `action.id`.
- If now - last < 500ms → ignore.

### Sound feedback

- If `settings.audioEnabled`, call `invoke("play_sound", { soundType: "start" })` at trigger for `URL` and `SMART_URL`.

### URL mode

- Normalize `action.webhookUrl`.
- Call `invoke("open_url_in_chrome", { url })`.
- On failure: show user-visible notification + console error.
- On success: log to history.

### SMART_URL mode

- Copy selection (existing pattern): `simulate_copy` + small delay + `get_clipboard_text`.
- If empty: show “No text selected” notification + return.
- Normalize (URL vs search) and open as above.
- Log to history.

### POST/GET mode

- Leave current webhook transform behavior unchanged.

## User-visible notifications (errors)

Implement minimal notification UX:

- Preferred: a simple toast component in React (lightweight) used by App-level actions.
- Acceptable fallback: `alert()` (but toast is better UX).

Cases that must notify:

- URL invalid/empty
- SMART_URL with no selection
- Chrome + fallback open failure

## History logging

When a URL/search is opened, add an entry to the existing history using the existing `addTranscription` shape:

- `text` examples:
- `[URL Open - <action.name>] <url>`
- `[Smart URL - <action.name>] Search: <query>`
- `durationMs: 0`, `language: "en"`, `createdAt: now`.

## Manual test plan (Windows)

- **Regression**: existing POST/GET webhook action still works end-to-end.
- **URL**:
- `https://example.com` opens in Chrome
- `example.com` becomes `https://example.com`
- `localhost:3000` opens
- long Google Drive URL opens
- invalid/empty URL shows error
- spam hotkey doesn’t open multiple times
- **SMART_URL**:
- highlight `openai.com` → opens `https://openai.com`
- highlight `best speech to text` → opens Google search
- highlight nothing → shows error
- **Chrome missing**: simulate by renaming install dir → fallback default browser works + notify.
- **History**: entries appear in history panel.
- **Sound**: respects `audioEnabled`.

## Implementation todos

- **types**: update `WebhookAction.method` union in [src/types/index.ts](src/types/index.ts)
- **tauriCmd**: implement and register `open_url_in_chrome` in [src-tauri/src/commands.rs](src-tauri/src/commands.rs) + [src-tauri/src/lib.rs](src-tauri/src/lib.rs)
- **settingsUI**: dropdown + conditional URL field + validation in [src/components/SettingsPanel.tsx](src/components/SettingsPanel.tsx)
- **appExecution**: branch by method + debounce + sound + history + invoke open in [src/App.tsx](src/App.tsx)
- **notifications**: add toast/alert wiring for visible errors
- **manualVerify**: execute the Windows test plan above
# Brand Library (Track D): Tauri v2 gotchas + worktree build traps

**Date:** 2026-07-16
**Branch:** feature/brand

Reusable lessons from building the Brand Asset Library (Track D). Keep these for the next
SpeakEasy session — several bit at runtime, not at compile time.

## 1. Tauri v2 blocks JS `emit()` from a webview via the event ACL

Calling `emit("brands-changed")` from `@tauri-apps/api/event` inside the brand-manager window
threw **`Command plugin:event|emit not allowed by ACL`** at runtime (typecheck/lint/build were all
green — this only appears when the code actually runs).

- **Why:** the JS event `emit` needs an explicit capability permission (`core:event:allow-emit`)
  granted to that window. The existing windows never hit this because they signal cross-window via
  **Rust commands** (`emit_profile_chooser_result`, `emit_voice_review_result`), not JS `emit`.
- **Fix (the codebase's own pattern):** emit from the **Rust backend** — `use tauri::Emitter;` then
  `app.emit("brands-changed", ())` inside the `save_brand_doc`/`delete_brand_doc` commands. Backend
  emit is not frontend-ACL-gated. `listen()` on the main window was already fine (it has listen perm).
- **Rule:** for cross-window signaling in this app, emit from a Rust command, not from window JS.

## 2. A best-effort side-effect failing looked like the whole operation failing

The doc **saved** (file on disk), but the post-save `emit` threw, my `try/catch` wrapped both, and
the UI showed a red **"Save failed"** — actively misleading. Separate the critical path (the write)
from best-effort notifications (the refresh ping) so a notification failure never reports the write
as failed.

## 3. Dark-mode text colors without a dark background = invisible text

`@media (prefers-color-scheme: dark)` set light text colors on `.bm-root` but I never set a dark
**background**, so on an OS in dark mode the webview stayed white → light text on white = the
"white/gray text on white" the owner reported. (The textarea looked fine only because it had its own
dark `background`.) **Always pair dark-mode text colors with a dark-mode `html/body` background.**

## 4. Building a Tauri release inside a worktree under `.claude/` — `dist` gets locked

`vite build` failed with **`EPERM: mkdir 'dist\assets'`**. Cause: writing `brand-manager.html`
triggered the Browser-pane auto-preview, which started a **vite dev server** that held a handle on
the worktree's `dist`. `Remove-Item dist` silently failed (locked).

- **Fix:** stop the stray vite process (`Get-CimInstance Win32_Process | where CommandLine -match
  'vite'`), then remove `dist`, then rebuild. The preview server is this session's (spawned by the
  file write), so stopping it is safe — but confirm it's vite/preview, not another chat's dev server.
- Also: `git worktree add` under `.claude/worktrees/` gives clean isolation from parallel chats, but
  npm in the worktree resolves the **parent** `node_modules` (dir walk-up) — fine, just be aware.

## 5. Brand actions deliberately bypass `config.json`'s `actions[]`

Brand-paste actions are **runtime-synthesized** from a transient (non-persisted) store slice and
injected into `getAllActions()` + the hotkey-reg list — they never enter the persisted `actions[]`.
This was intentional: the `fileActionsToArrays` collapse routes webhook-vs-prompt by `method`
presence, so a `brand_paste` entry would be mis-routed. Bypassing it also kept us out of the
migration/serde code that caused the earlier 46-action data-loss scare. Storage is its own
`brands.json` + one `.txt` per doc under `%APPDATA%\SpeakEasy\brands\` — separate from `config.json`.

## 6. Generated files churn CRLF on every build

`src-tauri/gen/schemas/*.json` and sometimes `Cargo.toml` show as modified after a build but the diff
is **CRLF-only** (empty under `git -c core.autocrlf=false diff`). Restore them with
`git checkout origin/master -- <file>` before committing so they don't add noise.

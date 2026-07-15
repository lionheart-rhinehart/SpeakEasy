# SpeakEasy

A Tauri-based desktop app for voice-driven language learning with AI-powered conversation practice.

## Development Workflow

```
Make changes → /test-protocol → Manual testing → /wrapup
```

- `/test-protocol` - Builds, installs, and launches the app for testing
- `/wrapup` - Commits and pushes after testing is complete

## Git Safety Rules

**FORBIDDEN** - NEVER run these git commands directly:
- `git reset` (any form)
- `git stash` (any form)
- `git checkout` on whole directories or `.claude/`
- `git rebase`
- `git branch -D` (delete branches)

**ALLOWED** - Only these git commands outside of scripts:
- `git status` (read-only)
- `git diff` (read-only)
- `git log` (read-only)
- `git branch` (read-only, no -D)
- `git checkout origin/master -- <single-file>` (targeted recovery only)

All commits and pushes MUST go through `/wrapup`.

## Recovery Procedures

| Issue | Recovery Steps |
|-------|---------------|
| Files missing | `git checkout origin/master -- <path>` |
| Branch desynced | `git fetch && git reset --hard origin/master` |
| Corrupted folder | Restart computer, delete folder, restore from git |
| Lost work | Check `.backups/` for recent timestamped backups |
| Need to rollback | `git log` to find commit, `git revert <hash>` |

## Project Structure

- `src/` - React frontend
- `src-tauri/` - Rust backend (Tauri)
- `scripts/` - Build and workflow scripts (test-protocol.mjs, wrapup.mjs)
- `lessons-learned/` - Session documentation created by wrapup
- `.backups/` - Local backups created by test-protocol (gitignored)

## Coding Rules

### Error Visibility (MANDATORY)
- NEVER use `console.error` alone. Every `catch` block and error branch MUST have user-visible feedback via `showToast()`, UI state change, or alert.
- Silent failures are bugs. If a feature can fail, the user must see WHY it failed.
- This applies to: API calls, hotkey registration, file operations, clipboard operations, and all async operations.

### Offline-First Design
- Features that should work offline MUST NOT depend on remote services for their critical path.
- Admin bypasses and local overrides must work without network connectivity.
- Persistent state (license, settings) must survive app restarts, reinstalls, and state file corruption.

### Change Verification
- After modifying any feature, manually verify it works end-to-end before committing.
- Hotkey changes: test the full flow (press → record → transcribe → result).
- Error handling changes: trigger the error path and confirm the user sees feedback.
- License changes: verify app launches without offline-mode banner.

### "Builds" and "launched" are NOT "works" (MANDATORY)
- A green `typecheck`/`lint`/`cargo test` and a successful `/test-protocol` prove the app **compiles,
  installs, and starts** — they do **NOT** prove the feature behaves correctly. Never mark a change
  "done/verified" on build success + "app launched" alone.
- "Done" for anything with a runtime surface requires **observing the actual behavior/data** in the
  running app (or an explicit statement that the runtime check is an owner smoke you did not perform).
  If you cannot observe it yourself, say so plainly — do not imply it's verified.

### Settings / schema / migration changes (MANDATORY — this class already caused a data-loss scare)
- Any change to `config.rs`, `appStore.ts` conversion/`migrateSettings`, `SETTINGS_SCHEMA_VERSION`,
  the action/settings shape, or the Rust⇄JS boundary is **data-integrity-critical**. Before marking done:
  1. **Back up the real config first:** copy `%APPDATA%\SpeakEasy\config.json` somewhere safe. The owner's
     40+ actions live there and load non-destructively — they are only overwritten on the next settings
     **save**, so a bad load looks fine on disk right up until the user changes one setting.
  2. **Verify the real data loads at runtime**, not just that a unit test on synthetic/raw JSON passes.
     Tests must model the **actual Rust serialization boundary** (e.g. serde emits empty `Vec` as `[]`,
     never omitted — so decide by CONTENT `length > 0`, never by presence `!== undefined`).
  3. **Confirm the migrated data is actually present in the running UI** (action count before == after),
     or explicitly flag it as an owner smoke you could not run. See the memory note
     `serde-empty-array-presence-check-trap`.

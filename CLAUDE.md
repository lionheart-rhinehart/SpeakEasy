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

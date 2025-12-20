# Test Protocol - Standard Operating Procedure

## Purpose

The `/test-protocol` command automates the build, install, and launch process so you can manually test changes before committing to git. This ensures you never push untested code.

## When to Use

Run `/test-protocol` after you've made code changes and want to verify they work in the actual installed application - not just the dev server.

## What It Does

0. **Create Backup** - Creates a timestamped backup in `.backups/` (safety net)
1. **Preflight Checks** - Verifies node, npm, rust, and git are available
2. **Quality Gates** - Runs lint, typecheck, build, and cargo check (fails fast if any issues)
3. **Release Build** - Creates the NSIS installer (`npm run tauri build`)
4. **Kill Running App** - Terminates any running SpeakEasy.exe instances
5. **Run Installer** - Silently installs the new build
6. **Launch App** - Starts the freshly installed application
7. **Restart Dev Server** - Restarts the dev server in the background (if it was running)
8. **Log to History** - Appends run result to `.test-protocol-history.json`

## How to Run

### Via Slash Command (Recommended)
```
/test-protocol
```

### Via npm
```bash
npm run test-protocol
```

### With Flags
```bash
npm run test-protocol -- --skip-backup   # Skip creating backup
npm run test-protocol -- --skip-gates    # Skip lint/typecheck/build
npm run test-protocol -- --skip-rust     # Skip cargo check
npm run test-protocol -- --no-restart    # Don't restart dev server
```

## Behavior

- **Fail-Fast**: If any step fails, the process stops immediately. Fix the issue and run again.
- **State File**: Results are saved to `.test-protocol-result.json` for wrapup to read later.
- **History Log**: Each run is appended to `.test-protocol-history.json` for tracking across sessions.
- **Local Backup**: Each run creates a backup in `.backups/` (keeps last 5, rotates older ones).
- **No Git Operations**: This command does NOT commit or push anything.

## After Running

1. The app should now be running
2. Test your changes manually
3. When satisfied, run `/wrapup` to commit and push

## Workflow Integration

```
Make changes → /test-protocol → Manual testing → /wrapup
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Lint fails | Fix ESLint errors, run again |
| Typecheck fails | Fix TypeScript errors, run again |
| Build fails | Check console output for Vite/Tauri errors |
| Installer not found | Ensure `npm run tauri build` completed successfully |
| App won't launch | Check install path: `%LOCALAPPDATA%\SpeakEasy\SpeakEasy.exe` |

## Related Files

- Script: `scripts/test-protocol.mjs`
- Slash Command: `~/.claude/commands/test-protocol.md` (global)
- State Output: `.test-protocol-result.json` (gitignored)
- History Log: `.test-protocol-history.json` (gitignored)
- Backups: `.backups/` directory (gitignored)

## Git Safety Rules for Claude

**FORBIDDEN** - Claude should NEVER run these git commands directly:
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

All commits and pushes should go through `/wrapup`.

## Recovery Procedures

| Issue | Recovery Steps |
|-------|---------------|
| Files missing | `git checkout origin/master -- <path>` |
| Branch desynced | `git fetch && git reset --hard origin/master` |
| Corrupted folder | Restart computer, delete folder, restore from git |
| Lost work | Check `.backups/` for recent timestamped backups |
| Need to rollback | `git log` to find commit, `git revert <hash>` |

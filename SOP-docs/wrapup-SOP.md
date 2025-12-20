# Wrapup - Standard Operating Procedure

## Purpose

The `/wrapup` command finalizes your work session by documenting what was done, scanning for secrets, and committing/pushing to git. It's designed to be run AFTER you've tested your changes.

## When to Use

Run `/wrapup` after:
1. You've run `/test-protocol`
2. You've manually tested the application
3. You're satisfied the changes work correctly

## What It Does

0. **Verify Integrity** - Checks for unexpected file deletions, correct branch, and remote sync
1. **Read Test Protocol Results** - Loads results from prior `/test-protocol` run (if available)
2. **Show History Summary** - Displays test-protocol run history for context
3. **Secret Scan** - Scans codebase for accidentally committed API keys, tokens, etc.
4. **Change Summary** - Generates git diff statistics
5. **Lessons Learned** - Creates a documentation entry with test results incorporated
6. **Git Commit & Push** - Stages all changes, commits with structured message, pushes to remote
7. **Archive Results** - Moves test-protocol state file to archive

## How to Run

### Via Slash Command (Recommended)
```
/wrapup
```
Claude will analyze the chat session and run with appropriate arguments.

### Via npm (Automated Mode)
```bash
npm run wrapup -- --area "bugfix" --title "fix-issue-name" --summary "What was fixed"
```

### With Optional Fields
```bash
npm run wrapup -- \
  --area "frontend" \
  --title "add-dark-mode" \
  --summary "Added dark mode toggle" \
  --problem "Theme wasn't persisting" \
  --fix "Added localStorage for theme preference"
```

### Flags
```bash
npm run wrapup -- --skip-integrity # Skip integrity check (not recommended)
npm run wrapup -- --skip-secrets   # Skip secret scanning
npm run wrapup -- --no-git         # Skip git operations (just create docs)
```

## Safety Features

The integrity check (Step 0) prevents common issues:
- **No Unexpected Deletions**: Blocks commit if files would be deleted compared to origin/master
- **Branch Verification**: Warns if not on master/main branch
- **Remote Sync Check**: Warns if local is behind remote

## Area Categories

Use one of these for the `--area` argument:
- `frontend` - React/UI changes
- `backend` - API/server changes
- `tauri` - Rust/Tauri changes
- `devops` - Build/deploy/tooling changes
- `bugfix` - Bug fixes
- `feature` - New features
- `refactor` - Code refactoring
- `docs` - Documentation only

## Commit Message Format

Wrapup creates commits in this format:
```
wrapup: <title> [<area>]
```

Example: `wrapup: fix-settings-panel [bugfix]`

## Test Protocol Integration

When `/test-protocol` was run before wrapup:
- Test results are automatically incorporated into lessons learned
- Step timings and any warnings/errors are documented
- Verification field notes that test protocol passed

## Output

Wrapup creates a lessons learned entry at:
```
lessons-learned/YYYY-MM-DD__<area>__<title>.md
```

This file includes:
- Summary of what was done
- Any problems encountered and how they were fixed
- Test protocol results (if available)
- Git change summary

## Workflow Integration

```
Make changes → /test-protocol → Manual testing → /wrapup
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Integrity check fails | Files may have been accidentally deleted - investigate before using --skip-integrity |
| Secret scan fails | Remove or gitignore the flagged file |
| No changes to commit | All changes already committed, or nothing modified |
| Push fails | Check git remote configuration and authentication |
| Interactive prompts | Provide --area, --title, --summary to skip prompts |
| Behind remote | Run `git fetch && git pull` to sync before wrapup |

## Related Files

- Script: `scripts/wrapup.mjs`
- Slash Command: `~/.claude/commands/wrapup.md` (global)
- Config: `.wrapup.json` (gitignored, stores preferences)
- Output: `lessons-learned/` directory
- History: `.test-protocol-history.json` (shows test run history)

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

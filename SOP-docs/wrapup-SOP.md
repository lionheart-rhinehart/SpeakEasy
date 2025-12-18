# Wrapup - Standard Operating Procedure

## Purpose

The `/wrapup` command finalizes your work session by documenting what was done, scanning for secrets, and committing/pushing to git. It's designed to be run AFTER you've tested your changes.

## When to Use

Run `/wrapup` after:
1. You've run `/test-protocol`
2. You've manually tested the application
3. You're satisfied the changes work correctly

## What It Does

1. **Read Test Protocol Results** - Loads results from prior `/test-protocol` run (if available)
2. **Secret Scan** - Scans codebase for accidentally committed API keys, tokens, etc.
3. **Change Summary** - Generates git diff statistics
4. **Lessons Learned** - Creates a documentation entry with test results incorporated
5. **Git Commit & Push** - Stages all changes, commits with structured message, pushes to remote
6. **Archive Results** - Moves test-protocol state file to archive

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
npm run wrapup -- --skip-secrets   # Skip secret scanning
npm run wrapup -- --no-git         # Skip git operations (just create docs)
```

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
| Secret scan fails | Remove or gitignore the flagged file |
| No changes to commit | All changes already committed, or nothing modified |
| Push fails | Check git remote configuration and authentication |
| Interactive prompts | Provide --area, --title, --summary to skip prompts |

## Related Files

- Script: `scripts/wrapup.mjs`
- Slash Command: `.claude/commands/wrapup.md`
- Config: `.wrapup.json` (gitignored, stores preferences)
- Output: `lessons-learned/` directory

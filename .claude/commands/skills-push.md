# /skills-push (Deprecated)

> **⚠️ DEPRECATED:** This command has been merged into `/wrapup`.

When you run `/wrapup`, new and modified skills are **automatically synced** to High Level Vibing.

## What Changed

Before (v1.x):
```
1. Work on skills
2. Run /skills-push manually
3. Skills copied to central repo
```

After (v2.0):
```
1. Work on skills
2. Run /wrapup
3. Skills automatically synced to HLV (no extra step!)
```

## Why Deprecated

- One less command to remember
- Automatic sync means you never forget to share improvements
- HLV is now the single source of truth (no separate skills repo)

## If You Really Need Manual Push

The functionality still exists in `/wrapup`. Just run `/wrapup` and it will:
1. Detect new/modified skills in `.claude/skills/`
2. Copy them to HLV
3. Show you what was synced

## Protected Paths

These are **never synced** (same as before):
- `.claude/skills/project/` - Project-specific skills stay local

## Related Commands

- `/wrapup` - Complete session + auto-sync skills to HLV
- `/system-upgrade-pull` - Pull skills (and commands, rules) from HLV

---

## Migration Note

> This command was deprecated in v2.0.0 as part of the sync architecture consolidation.
> All functionality is now in `/wrapup`.

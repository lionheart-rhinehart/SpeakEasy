# /skills-pull (Deprecated)

> **⚠️ DEPRECATED:** This command has been merged into `/system-upgrade-pull`.

Run `/system-upgrade-pull` to get all updates including skills, commands, and rules.

## What Changed

Before (v1.x):
```
/skills-pull          # Pull skills only
/system-upgrade-pull  # Pull commands/rules only
```

After (v2.0):
```
/system-upgrade-pull  # Pull everything (interactive selection!)
```

## Why Deprecated

- One command to pull everything
- Interactive selection lets you choose what you want (skills, commands, rules)
- Smart filtering - skills are filtered by your project's tech stack automatically
- Simpler mental model: one command to pull, one to push issues

## New Workflow

```
/system-upgrade-pull

═══════════════════════════════════════════════════════════════
                    AVAILABLE UPDATES
═══════════════════════════════════════════════════════════════

COMMANDS: 3 new, 2 updated
SKILLS: 1 updated (filtered by your tech stack: next-js, supabase)
RULES: 1 new

What would you like to pull?
→ Pull All
→ Select Categories (choose what to pull)
→ None
```

## Smart Skill Filtering

When you pull skills, only those matching your project's tech stack are synced:

```json
// .claude/framework-manifest.json
{
  "tech_stack": ["next-js", "supabase", "meta-ads"]
}
```

HLV has ALL skills. Your project only gets matching ones.

## Related Commands

- `/system-upgrade-pull` - Pull everything from HLV (replaces this command)
- `/wrapup` - Auto-sync new skills TO HLV

---

## Migration Note

> This command was deprecated in v2.0.0 as part of the sync architecture consolidation.
> Use `/system-upgrade-pull` for all pull operations.

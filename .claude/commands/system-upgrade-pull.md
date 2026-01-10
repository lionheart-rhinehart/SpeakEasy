# /system-upgrade-pull - Pull Updates from High Level Vibing

Pull framework updates from HLV into your project. Interactive selection lets you choose what to pull.

## Usage

```
/system-upgrade-pull              # Interactive: choose what to pull
/system-upgrade-pull --all        # Pull everything, skip prompts
/system-upgrade-pull --list       # Just show what's available, don't pull
```

## When to Use

- After someone made changes in HLV (new commands, skill updates, rule changes)
- Periodically to get latest framework improvements
- After running `/system-upgrade-push` from another project and fixing issues in HLV

## Prerequisites

- Must be run from a project (NOT from HLV itself)
- HLV must be accessible (path in `~/.claude/system-config.json` → `hlv_path`)

---

## Process

### Step 1: Safety Check

```
Checking environment...
✓ Not running from HLV (safe to pull)
✓ HLV accessible at D:\Claude CODE\High Level Vibing
```

**If running from HLV:**
```
⚠️ Cannot pull into HLV itself.
This command pulls FROM HLV, not INTO it.
Run this from a project folder instead.
```

### Step 2: Scan for Available Updates

Compare HLV with current project:

| Category | Source | What's Checked |
|----------|--------|----------------|
| Commands | `HLV/.claude/commands/` | All `.md` files (excluding `project/`) |
| Skills | `HLV/.claude/skills/` | Only skills matching project tech_stack |
| Rules | `HLV/.claude/rules/` | All rule files |
| Doc Templates | `HLV/docs/_*.md` | Template files only |

**Smart Skill Filtering:**
- Read project's `.claude/framework-manifest.json` → `tech_stack`
- OR detect from `package.json` (next, @supabase/supabase-js, etc.)
- Only show/pull skills that match

### Step 3: Show Summary

```
═══════════════════════════════════════════════════════════════
                    AVAILABLE UPDATES
═══════════════════════════════════════════════════════════════

Source: D:\Claude CODE\High Level Vibing

───────────────────────────────────────────────────────────────
COMMANDS: 3 new, 2 updated
───────────────────────────────────────────────────────────────
  + FB-campaign-analysis.md (new)
  + custom-report.md (new)
  ↑ wrapup.md (updated)
  ↑ pre-flight-check.md (updated)

───────────────────────────────────────────────────────────────
SKILLS: 1 updated (filtered by your tech stack)
───────────────────────────────────────────────────────────────
  Your tech stack: next-js, supabase, meta-ads
  ↑ next-js/next.js - patterns.md (updated)

───────────────────────────────────────────────────────────────
RULES: 1 new
───────────────────────────────────────────────────────────────
  + visuals.md (new)

───────────────────────────────────────────────────────────────
DOC TEMPLATES: 0 changes
───────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════
```

### Step 4: Ask What to Pull

Use AskUserQuestion with options:
- **Pull All** - Pull all categories (commands, skills, rules, templates)
- **Select Categories** - Choose which categories to pull
- **None** - Don't pull anything now

**If "Select Categories":**
```
Select categories to pull:
[ ] Commands (3 new, 2 updated)
[ ] Skills (1 updated)
[ ] Rules (1 new)
[ ] Doc Templates (0 changes)
```

### Step 5: Pull Selected Categories

For each selected category:
1. Copy files from HLV to project
2. Preserve protected paths (never overwrite `settings.json`, `skills/project/`, etc.)
3. Report each file copied

### Step 6: Show Results

```
═══════════════════════════════════════════════════════════════
                    PULL COMPLETE
═══════════════════════════════════════════════════════════════

✓ Commands: 5 files copied
✓ Rules: 1 file copied
⊘ Skills: skipped (user choice)
⊘ Doc Templates: no changes

Protected (untouched):
  - settings.json
  - settings.local.json
  - skills/project/
  - commands/project/

Your project is now current with HLV.

═══════════════════════════════════════════════════════════════
```

---

## Protected Paths (NEVER Synced)

These are NEVER touched by pull:

```
.claude/
├── settings.json           ← Project MCP permissions
├── settings.local.json     ← Project overrides
├── commands/project/       ← Project-specific commands
└── skills/project/         ← Project-specific skills
```

---

## Smart Skill Filtering

HLV contains ALL skills (next-js, supabase, tailwind-css, meta-ads, react-native, etc.).

Your project only gets skills matching its tech stack:

```json
// .claude/framework-manifest.json
{
  "tech_stack": ["next-js", "supabase", "meta-ads"]
}
```

**Auto-detection fallback:**
If no `tech_stack` in manifest, detect from `package.json`:
- `next` → next-js skill
- `@supabase/supabase-js` → supabase skill
- `tailwindcss` → tailwind-css skill

---

## Flags

| Flag | What it does |
|------|--------------|
| `--all` | Skip prompts, pull everything |
| `--list` | Just show what's available, don't pull |

---

## Error Handling

| Scenario | How It's Handled |
|----------|------------------|
| Running from HLV | ERROR: "Cannot pull into HLV itself" |
| HLV not accessible | ERROR: "HLV not found at [path]. Check ~/.claude/system-config.json" |
| No tech_stack defined | WARN: "No tech_stack found. Pulling all skills." |
| File copy fails | Report error, continue with other files |

---

## Example Interaction

```
User: /system-upgrade-pull

Claude: Checking environment...
        ✓ Not running from HLV
        ✓ HLV accessible

        ═══════════════════════════════════════════════════════════════
                            AVAILABLE UPDATES
        ═══════════════════════════════════════════════════════════════

        COMMANDS: 3 new, 2 updated
        SKILLS: 1 updated (next-js)
        RULES: 1 new
        DOC TEMPLATES: 0 changes

        What would you like to pull?

User: Select Categories

Claude: Select categories:
        [x] Commands
        [ ] Skills
        [x] Rules
        [ ] Doc Templates

User: Commands, Rules

Claude: Pulling...
        ✓ Copied 5 command files
        ✓ Copied 1 rule file

        Your project is now current.
```

---

## Related Commands

- `/wrapup` - Commits and auto-syncs new commands/skills to HLV
- `/system-upgrade-push` - Log issues to HLV backlog (text only)
- `/pre-flight-check` - Start a work session, see what's available

---

## Migration Note

> This command was previously named `/system-upgrade`. The old name still works but is deprecated.
> `/skills-pull` has been merged into this command. Use `/system-upgrade-pull` for everything.

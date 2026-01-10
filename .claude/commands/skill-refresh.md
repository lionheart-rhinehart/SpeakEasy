# /skill-refresh - Update Project Skills

Regenerate or update project skills as the project evolves without recreating the entire scaffold.

## Usage

```
/skill-refresh                    # Analyze current state and suggest updates
/skill-refresh --all              # Regenerate all skills
/skill-refresh [skill-name]       # Regenerate specific skill
/skill-refresh --add [skill-name] # Add new skill from template
/skill-refresh --list             # List available skill templates
```

**Examples:**
```
/skill-refresh                     # Show skill health report
/skill-refresh testing-patterns    # Update testing skill
/skill-refresh --add code-review   # Add code review skill
/skill-refresh --all               # Full skill refresh
```

## When to Use

- After significant SRS or feature changes
- When a skill isn't working well (Claude not using it)
- When you want to add a new skill type
- After implementing several features (skills may need updating)
- When onboarding new team members (ensure skills are current)
- After running `/initial-setup-step4-last-checkpoint` to verify skills are complete

## Process

### Step 1: Analyze Current State

**Inventory Current Skills:**
```
Current Skills in .claude/skills/

┌─────────────────────┬──────────────┬─────────────┬──────────────┐
│ Skill               │ Status       │ Last Update │ Health       │
├─────────────────────┼──────────────┼─────────────┼──────────────┤
│ project-context     │ Present      │ 5 days ago  │ ⚠️ Outdated   │
│ testing-patterns    │ Present      │ 12 days ago │ ✅ OK         │
│ api-conventions     │ Present      │ 12 days ago │ ✅ OK         │
│ code-review         │ Missing      │ -           │ ❌ Not found  │
│ security-patterns   │ Present      │ 12 days ago │ ✅ OK         │
└─────────────────────┴──────────────┴─────────────┴──────────────┘

Available Templates (not installed):
- code-review
```

**Health Check Criteria:**
- **✅ OK:** Skill exists, YAML valid, description clear
- **⚠️ Outdated:** Skill older than SRS/features, may need update
- **❌ Not found:** Expected skill missing
- **⚠️ Invalid:** YAML errors or missing required fields

### Step 2: Compare Against SRS/Features

Check for gaps between skills and project state:

**Analysis:**
```
Skill Gap Analysis:

Project has 8 features, 45 acceptance criteria

Coverage:
- project-context: Covers overall structure ✅
- testing-patterns:
  - Has Jest patterns ✅
  - Missing: Playwright E2E patterns added in feature-5 ⚠️
- api-conventions:
  - Covers REST endpoints ✅
  - Missing: WebSocket conventions added in feature-7 ⚠️
- security-patterns:
  - Has auth patterns ✅
  - Missing: Rate limiting from latest requirements ⚠️

Recommendations:
1. Update testing-patterns with Playwright info
2. Add WebSocket conventions to api-conventions
3. Add rate limiting to security-patterns
```

### Step 3: Handle User Request

**For `/skill-refresh` (no args):**
- Show analysis report
- List recommendations
- Ask if user wants to proceed

**For `/skill-refresh --all`:**
- Backup existing skills
- Regenerate all from templates + SRS
- Report changes

**For `/skill-refresh [skill-name]`:**
- Regenerate specific skill
- Preserve custom sections (with confirmation)
- Report changes

**For `/skill-refresh --add [skill-name]`:**
- Check if template exists
- Copy and customize
- Report new skill

### Step 4: Regenerate Skills

**Regeneration Process:**
1. Read current skill content
2. Identify custom sections (non-template content)
3. Read latest SRS and feature specs
4. Merge template + project info + custom sections
5. Write updated skill

**Preservation Strategy:**
```
Skill: project-context

Template Sections (will update):
- Tech Stack
- Architecture Pattern
- Key Directories

Custom Sections (will preserve):
- "Team Conventions" section you added
- Custom "Deployment Notes"

Proceed? [Y/n/review]
```

### Step 5: Validate Updated Skills

For each updated skill, verify:
- [ ] YAML frontmatter valid
- [ ] `name` follows naming convention
- [ ] `description` is specific and contains keywords
- [ ] `allowed-tools` appropriate
- [ ] Content is project-relevant
- [ ] No placeholder text remaining

**Validation Report:**
```
Skill Validation: testing-patterns

✅ YAML frontmatter: Valid
✅ Name: testing-patterns (valid format)
✅ Description: 127 chars, includes keywords [test, unit, integration]
✅ Allowed-tools: Read, Grep, Glob, Bash (appropriate)
⚠️ Content: Found placeholder "[To be filled]" on line 45
   → Updated with Playwright configuration

Result: VALID (with updates)
```

### Step 6: Generate Report

```markdown
## Skill Refresh Report

**Date:** [Current Date]
**Mode:** [Full Refresh / Selective / Add]

### Changes Made

| Skill | Action | Details |
|-------|--------|---------|
| project-context | Updated | Added 3 new directories |
| testing-patterns | Updated | Added Playwright patterns |
| api-conventions | Updated | Added WebSocket section |
| code-review | Added | New skill from template |
| security-patterns | Updated | Added rate limiting |

### Custom Content Preserved
- project-context: "Team Conventions" section
- testing-patterns: "Local Test Setup" section

### Validation Summary
- Total skills: 5
- Valid: 5
- Warnings: 0
- Errors: 0

### Recommendations
1. Review project-context skill for accuracy
2. Test that Claude discovers skills correctly
```

## Output Summary

```
✅ SKILL REFRESH COMPLETE

Updated: 4 skills
Added: 1 skill
Preserved: 2 custom sections

Skills Status:
├── project-context     ✅ Updated
├── testing-patterns    ✅ Updated
├── api-conventions     ✅ Updated
├── code-review         ✅ Added
└── security-patterns   ✅ Updated

All skills validated successfully.

Test skill discovery by asking Claude about:
- "How should I structure tests in this project?"
- "What are the API conventions here?"
- "Review this code for security issues"
```

## Available Skill Templates

Templates in workflow repo `skill-templates/`:

| Template | Purpose | When to Use |
|----------|---------|-------------|
| project-context | Project understanding | Always include |
| testing-patterns | Test conventions | Projects with tests |
| api-conventions | API design | API projects |
| code-review | Review checklist | All projects |
| security-patterns | Security practices | All projects |

## Quality Checklist

Before completing:
- [ ] All requested skills updated
- [ ] Custom content preserved
- [ ] YAML validated for all skills
- [ ] Descriptions are discovery-friendly
- [ ] No placeholder text remaining
- [ ] Report generated

## Error Handling

**If skill template not found:**
- List available templates
- Suggest closest match
- Offer to create custom skill

**If skill has syntax errors:**
- Show specific error
- Offer to fix or regenerate
- Keep backup of original

**If SRS/features not found:**
- Warn about limited customization
- Offer to proceed with template defaults
- Recommend running `/initial-setup-step2-srs-analyze` first

**If custom content detected:**
- Ask for preservation preference
- Show diff before applying
- Allow selective updates

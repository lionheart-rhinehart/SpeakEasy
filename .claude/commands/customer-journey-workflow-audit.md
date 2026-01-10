# /customer-journey-workflow-audit - User Experience Validation

Validate the High Level Vibing workflow from a user's perspective by tracing the entire journey without documentation.

> **Note:** This is one of two audit commands:
> - `/codebase-workflow-audit` - Technical/structural consistency
> - `/customer-journey-workflow-audit` - User experience validation (this command)

## How This Works

This command outputs a prompt that you **copy into a FRESH Claude Code session**. The fresh session ensures no prior context - a true black-box test of the user experience.

## Why Fresh Session?

- No prior knowledge of the system
- Must discover workflow by reading code only
- Identifies gaps that documentation might mask
- Reveals hidden assumptions in the codebase

---

## THE AUDIT PROMPT

Copy everything below the line into a **new Claude Code session**:

---

# Customer Journey Workflow Audit

You are auditing the "High Level Vibing" workflow system from a user's perspective.

## CRITICAL RULES - DO NOT VIOLATE

1. **DO NOT READ:** CHEAT-SHEET.md, any README files, START HERE/, or documentation guides
2. **ONLY READ:** Command files (*.md in ~/.claude/commands/), scripts (*.mjs), and config files
3. **PRETEND:** You are a new user discovering this system with no prior knowledge

## Your Mission

### Phase 1: Discovery

Read only the command files and scripts. For each one, note:
- What it claims to do (from its own description)
- What files/folders it creates or modifies
- What command it suggests running next (if any)

Start by listing all command files:
```
~/.claude/commands/*.md
```

Then read each one systematically.

### Phase 2: Trace the Journey

Starting from `/new-project`, trace what a user would experience:

1. What happens when they run each command?
2. Does the command tell them what to do next?
3. Are there any dead ends or unclear transitions?
4. What files get created that the user needs to know about?

Map the complete workflow as you understand it from the code alone.

### Phase 3: Report

Generate a comprehensive report with these sections:

---

## CUSTOMER JOURNEY AUDIT REPORT

### Discovered Workflow
[Describe what you think the full workflow is, based only on reading the command files and scripts]

### Phase Transitions
| From | To | Clear? | Notes |
|------|-----|--------|-------|
| /new-project | ? | | |
| ... | ... | | |

### User Experience Gaps
[Where might a user get lost or confused?]

- Missing "next step" guidance
- Commands that assume prior knowledge
- Unclear transitions between phases
- Files created but never explained

### Missing Handoffs
[Commands that don't naturally lead to the next step]

| Command | Expected Next Step | Actually Tells User | Gap |
|---------|-------------------|---------------------|-----|
| | | | |

### Hidden Assumptions
[Things the code assumes but doesn't explicitly tell the user]

- Required tools or dependencies
- Expected folder structure
- Prerequisite knowledge
- Configuration that must exist

### Dead Ends
[Places where a user might get stuck with no guidance]

### Recommendations
[What would make the user journey clearer?]

1. [Specific recommendation]
2. [Specific recommendation]
3. [Specific recommendation]

---

## After Running This Audit

Once you complete the audit in the fresh session:

1. Compare findings against actual documentation
2. Fix any gaps identified
3. Run `/codebase-workflow-audit` to verify technical consistency
4. Commit fixes with: `audit: fix customer journey gaps`

## When to Run

- Before major releases
- After adding new commands
- When onboarding feels confusing
- Quarterly as preventive maintenance

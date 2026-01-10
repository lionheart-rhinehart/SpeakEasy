# /system-upgrade-push - Push Framework Issues to High Level Vibing

Capture framework issues, improvements, or discoveries while working in any project. Automatically logs to High Level Vibing's backlog - no copying required.

## Usage

```
/system-upgrade-push                    # Interactive: scan conversation, ask priority
/system-upgrade-push high: Fix the sync # Quick mode: one-liner with priority
```

## When to Use

- You discovered a framework bug or limitation
- You have an improvement idea for the workflow
- You want to log a framework change for later
- You don't want to lose the thought or switch contexts

## Prerequisites

- HLV must be accessible at the path in `~/.claude/system-config.json` → `hlv_path`

---

## Process

### Step 1: Gather Issue Details

**If using quick mode** (`/system-upgrade-push priority: description`):
- Parse priority and description from command
- Skip to Step 4

**If interactive mode:**
```
What framework issue did you discover?
```

Then ask priority:
```
What priority should this be?
- High (blocking work)
- Medium (should fix soon)
- Low (nice to have)
```

### Step 2: Scan Conversation Context

Analyze the current conversation for:

**Issue Context:**
- What were you trying to do when you found the issue?
- What command or workflow exposed the problem?
- What error messages or unexpected behavior occurred?

**Files Affected:**
- Which framework files, commands, or docs are involved?
- Which project files exposed the issue?

**Proposed Solutions:**
- Did you identify potential fixes during the conversation?
- What are the tradeoffs of different approaches?

### Step 3: Generate Handoff Content

Create a structured handoff:

```markdown
**Issue:** [one-line summary]

**What happened:**
[Detailed context from conversation]

**The problem:**
[Why this is an issue - impact on workflow]

**Proposed fix options:**
1. [Option A] - [tradeoffs]
2. [Option B] - [tradeoffs]

**Files to modify:**
- [file1 - what needs to change]
- [file2 - what needs to change]

**Affected project:** [current project name]
**Framework version:** [from manifest]
```

### Step 4: Auto-Append to HLV Backlog

**Read HLV path from:** `~/.claude/system-config.json` → `hlv_path`

**Append to:** `[HLV_PATH]/docs/framework-backlog.md`

```markdown
---

## [DATE] - Issue from [PROJECT_NAME]

**Priority:** [high/medium/low]
**Reported from:** [current project folder name]
**Framework version:** [version from manifest]

### Summary
[One-line summary]

### Full Handoff
[Complete handoff content from Step 3]

### Conversation Excerpts
[Key quotes from the conversation that provide context]

---
```

### Step 5: Display Confirmation

```
═══════════════════════════════════════════════════════════════
                FRAMEWORK ISSUE LOGGED
═══════════════════════════════════════════════════════════════

Issue: [summary]
Priority: [priority]
Logged to: High Level Vibing/docs/framework-backlog.md

✓ Issue automatically appended to HLV backlog
  (No copying required!)

NEXT STEPS:
1. Continue your work - the issue is safely logged
2. When you switch to HLV, run /pre-flight-check to see backlog
3. Fix issues in HLV, then /wrapup to commit

═══════════════════════════════════════════════════════════════
```

---

## Quick Mode

For simple issues without conversation scanning:

```
/system-upgrade-push high: The /wrapup command should check for uncommitted changes first
```

Format: `/system-upgrade-push [priority]: [description]`

This creates a simpler backlog entry:

```markdown
---

## 2025-12-27 - Quick Issue from Ads Manager Plus

**Priority:** High
**Reported from:** Ads Manager Plus

### Summary
The /wrapup command should check for uncommitted changes first

---
```

---

## Example Interaction

### Full Mode (with context scanning)

```
User: /system-upgrade-push

Claude: I'll analyze our conversation to create a comprehensive handoff.

        Scanning conversation for context...

        ISSUE DETECTED:
        - You were running /system-upgrade-pull in Ads Manager Plus
        - It overwrote your project's settings.json
        - Your MCP permissions (mcp__meta-ads-local__*) were replaced

        What priority should this be?
        - High (blocking work)
        - Medium (should fix soon)
        - Low (nice to have)

User: High

Claude: ═══════════════════════════════════════════════════════════════
                    FRAMEWORK ISSUE LOGGED
        ═══════════════════════════════════════════════════════════════

        Issue: /system-upgrade-pull overwrites project MCP settings
        Priority: High
        Logged to: High Level Vibing/docs/framework-backlog.md

        ✓ Issue automatically appended to HLV backlog

        When you switch to High Level Vibing:
        - Run /pre-flight-check to see the backlog
        - The issue will be ready for you to fix

        ═══════════════════════════════════════════════════════════════
```

### Quick Mode

```
User: /system-upgrade-push medium: The cheat-sheet should include skill filtering docs

Claude: ✓ Logged to High Level Vibing backlog

        Issue: The cheat-sheet should include skill filtering docs
        Priority: Medium
        Source: Creative Hub

        When you next work on High Level Vibing:
        - Run /pre-flight-check to see backlog items
```

---

## Push vs Pull

| Command | Direction | Purpose |
|---------|-----------|---------|
| `/system-upgrade-pull` | HLV → Project | Get updates (commands, skills, rules) |
| `/system-upgrade-push` | Project → HLV | Send issues (text only, auto-logged) |

Think of High Level Vibing as the central repository:
- **Pull** = download updates from HLV
- **Push** = upload issues to HLV backlog

---

## Error Handling

**HLV not accessible:**
```
⚠️ HLV not found at [path]

Check ~/.claude/system-config.json → hlv_path

Issue NOT logged. Save this somewhere:
[Shows the handoff content for manual logging later]
```

**Backlog file missing:**
```
Creating docs/framework-backlog.md in HLV...
✓ Backlog file created
✓ Issue logged
```

---

## Related Commands

- `/system-upgrade-pull` - Pull framework updates into your project
- `/wrapup` - Complete session (auto-syncs commands/skills to HLV)
- `/pre-flight-check` - Start a work session (shows backlog in HLV)
- `/handoff` - Create handoff for continuing work in new chat (same project)

---

## Migration Note

> **Note:** This command was previously named `/system-note`. The old name still works but is deprecated.
>
> **v2.0 change:** The handoff is now automatically appended to HLV's backlog.
> You no longer need to copy/paste anything. Just run the command and continue working.

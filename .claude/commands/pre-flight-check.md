# /pre-flight-check - Work Session Startup

Initialize a work session by verifying project state, assigning a worker ID, and claiming the next available feature from the build order. Run this at the START of any development session.

## Usage

```
/pre-flight-check                           # Claim next available from build order
/pre-flight-check [feature-id]              # Claim specific feature
/pre-flight-check --list                    # List queue status without claiming
```

**Examples:**
```
/pre-flight-check                           # Auto-claim next available feature
/pre-flight-check F-003                     # Claim specific feature F-003
/pre-flight-check --list                    # View queue without claiming
```

## Why This Command Exists

When working with parallel chats (multiple Claude Code sessions on the same project), each session needs to:
1. **Pull from a shared queue** - Automatically claim the next available feature
2. **Respect dependencies** - Only claim features whose dependencies are complete
3. **Avoid conflicts** - Workers stay in their lanes with clear file ownership
4. **Have consistent identification** - Worker IDs in all logs for traceability

This command reads the build order queue and claims work automatically.

## Process

### Step 0: Verify Project Structure

Before anything else, ensure the project has the required structure.

**Check git repository:**
```bash
git status
```

If "not a git repository":
```
⚠️ No git repository found

This project doesn't have git initialized.
Initializing now...

git init
git add .
git commit -m "chore: initialize git repository

🤖 Generated with Claude Code"

✓ Git repository initialized
```

**Check required files:**
```
Checking project structure...
✓ .claude/framework-manifest.json
✓ .claude/settings.json
✓ CHEAT-SHEET.md (or will be created by /system-upgrade-pull)
```

**Check workflow log:**
If `docs/workflow-development-log.md` doesn't exist:
```
⚠️ docs/workflow-development-log.md - MISSING

Creating workflow log...
```

Create with template:
```markdown
# Workflow Development Log

> Project: [Project Name from folder]
> Created: [timestamp]
> Framework: High Level Vibing

---

## Sessions

[Sessions will be logged here by /wrapup]
```

### Step 1: Git Sync (Get Latest)

**CRITICAL:** Before reading any state, sync with the remote to get changes from other workers:

```bash
git pull origin main
```

**Why this matters:**
- Other workers may have completed features
- Build order status may have changed
- Prevents claiming already-claimed features
- Prevents stale dependency information

**If pull fails (conflicts):**
```
Git pull failed - conflicts detected

Conflicts in:
- docs/build-order.md

This usually means another worker modified the build order.
Resolve conflicts manually, then run /pre-flight-check again.
```

### Step 1.5: Check Framework Version

Check if the framework is outdated:

1. Read local `.claude/framework-manifest.json` for current version
2. Read source framework manifest (from `source` path)
3. Compare versions

**If outdated:**
```
Framework updates available

Current: 1.4.0
Latest:  1.5.0

Run /system-upgrade-pull to get updates.
```

**If current:**
```
Framework up to date (v1.5.0)
```

This check runs silently if versions match - only prompts when updates are available.

### Step 2: Assign Worker ID

Check if `.claude/worker-id` exists in the project:

**If exists:** Read and use that ID (session continuity)

**If not exists:**
1. Check workflow log for existing worker IDs (Chat-A, Chat-B, etc.)
2. Assign next available letter
3. Write to `.claude/worker-id`

```
Worker ID: Chat-A (new session)
```

### Step 3: Read Build Order Queue

Read `docs/build-order.md` to understand the work queue:

```
Build Order Status:
+-----+-------+---------------------+-------------+--------+--------------+
|  #  |  ID   | Feature             | Status      | Worker | Dependencies |
+-----+-------+---------------------+-------------+--------+--------------+
|  1  | F-001 | User Authentication | completed   | Chat-A | none         |
|  2  | F-003 | Product Catalog     | in-progress | Chat-B | none         |
|  3  | F-002 | User Profile        | pending     | -      | F-001        |
|  4  | F-004 | Shopping Cart       | pending     | -      | F-003        |
|  5  | F-005 | Dashboard           | pending     | -      | F-001        |
+-----+-------+---------------------+-------------+--------+--------------+

Available to Claim (pending + dependencies met):
- F-002 User Profile (deps: F-001 completed)
- F-005 Dashboard (deps: F-001 completed)

Blocked (dependencies not complete):
- F-004 Shopping Cart (waiting on: F-003)
```

### Step 4: Read Additional Context

Gather supporting context from:

1. **SRS Document** - `docs/srs/SRS-*.md`
   - Feature details and acceptance criteria
   - Technical requirements

2. **Workflow Log** - `docs/workflow-development-log.md`
   - Recent sessions and decisions
   - Problems encountered and solutions

3. **Skills** - `.claude/skills/`
   - Available technology guidance

### Step 5: Claim Next Available Feature

**Auto-claim (no feature specified):**
Claim the first available feature from the queue (pending + dependencies complete):

```
Claiming Feature...

Next available: F-002 (User Profile)
Dependencies: F-001 completed (completed by Chat-A)

Claim F-002? [Y/n]
```

**Specific claim (feature specified):**
```
/pre-flight-check F-005

Checking F-005 (Dashboard)...
Status: pending
Dependencies: F-001 completed (completed)

F-005 is available. Claiming...
```

**If feature is not available:**
```
F-003 is not available

Current Status: in-progress
Claimed By: Chat-B
Since: 30 minutes ago

Options:
1. Choose a different feature
2. Wait for Chat-B to complete F-003
3. View available features: F-002, F-005
```

**If dependencies not met:**
```
F-004 dependencies not complete

F-004 (Shopping Cart) depends on:
- F-003 (Product Catalog) - in-progress by Chat-B

Wait for F-003 to complete, then claim F-004.

Available now:
- F-002 User Profile
- F-005 Dashboard
```

### Step 6: Update Build Order

Mark the claimed feature as `in-progress` in `docs/build-order.md`:

**Before:**
```markdown
| 3 | F-002 | User Profile | pending | - | F-001 | - |
```

**After:**
```markdown
| 3 | F-002 | User Profile | in-progress | Chat-C | F-001 | 2025-12-23 14:30 |
```

### Step 7: Git Push (Announce Claim)

**CRITICAL:** After claiming, push to remote so other workers know:

```bash
git add docs/build-order.md .claude/worker-id
git commit -m "chore: Chat-C claims F-003 (Product Catalog)"
git push origin main
```

**Why this matters:**
- Other workers will see this feature is now in-progress
- Prevents two workers from claiming the same feature
- Creates audit trail of who's working on what

**If push fails (someone else pushed first):**
```
Git push failed - remote has changes

Another worker pushed changes while you were claiming.
Running: git pull --rebase && git push

If rebase has conflicts, resolve them manually.
```

### Step 8: Determine File Ownership

Based on feature assignment, define file boundaries:

```
File Ownership for F-003 (Product Catalog):

OWNED (you can create/modify):
  - src/features/catalog/*
  - src/components/catalog/*
  - tests/features/catalog/*
  - docs/features/F-003-*.md

SHARED (coordinate before modifying):
  - src/lib/api.ts
  - src/types/index.ts
  - database migrations

OFF-LIMITS (do not touch):
  - src/features/auth/* (Chat-A)
  - src/features/dashboard/* (Chat-B)
```

### Step 9: Display Session Summary

```
===============================================================
                    SESSION INITIALIZED
===============================================================

Worker ID:     Chat-C
Project:       [Project Name]
Session Start: [Timestamp]

ASSIGNED FEATURES:
+--------+---------------------+------------+--------------+
| ID     | Name                | Status     | Dependencies |
+--------+---------------------+------------+--------------+
| F-003  | Product Catalog     | Not Started| None         |
| F-004  | Shopping Cart       | Not Started| F-003        |
+--------+---------------------+------------+--------------+

FILE OWNERSHIP:
- src/features/catalog/*     YOURS
- src/features/cart/*        YOURS
- src/components/catalog/*   YOURS
- src/components/cart/*      YOURS
- tests/features/catalog/*   YOURS

ACTIVE WORKERS:
- Chat-A: F-001, F-002 (in progress)
- Chat-B: F-005 (in progress)

SKILLS LOADED:
- next-js
- supabase
- tailwind-css

===============================================================
Ready to begin. Run /initial-setup-step6-project-start F-003
===============================================================
```

### Step 10: Log Session Start

Append to workflow log:

```markdown
### [Timestamp] - Chat-C - Session Started

**Worker:** Chat-C
**Feature Claimed:** F-003 (Product Catalog)
**File Ownership:** src/features/catalog/*
**Build Order:** #3 of 6
**Session Type:** Parallel worker (from build queue)
```

## Feature Detection

If no features are specified, analyze available work:

```
AVAILABLE FEATURES:

Ready to Start (no blockers):
- F-003 Product Catalog
- F-006 User Settings
- F-007 Notifications

Blocked (waiting on dependencies):
- F-004 Shopping Cart -> needs F-003
- F-008 Checkout -> needs F-003, F-004

In Progress (claimed by other workers):
- F-001 User Auth -> Chat-A
- F-002 Profile -> Chat-A
- F-005 Dashboard -> Chat-B

Completed:
- (none yet)

Which feature(s) would you like to work on?
```

## Conflict Resolution

**If a conflict is unavoidable (shared utility needed):**

```
SHARED FILE MODIFICATION NEEDED

You need to modify: src/lib/utils.ts
Currently owned by: Chat-A (for F-001)

Options:
1. WAIT - Let Chat-A finish and commit first
2. COORDINATE - Create your utility in a separate file for now
3. REQUEST - Add a note in workflow log asking Chat-A to create the shared utility

Recommendation: Option 2 (create src/lib/catalog-utils.ts for now, merge later)
```

## Error Handling

**If SRS not found:**
```
No SRS document found in docs/srs/

Options:
1. Run /initial-setup-step1-srs-creation to create one
2. Point to existing SRS: /pre-flight-check --srs path/to/srs.md
```

**If workflow log not found:**
```
Creating new workflow log at docs/workflow-development-log.md
This appears to be the first work session for this project.
Worker ID assigned: Chat-A
```

**If project structure incomplete:**
```
Project structure incomplete

Missing:
- .claude/skills/ (no skills generated)
- CLAUDE.md (no project memory)

Recommendation: Run /initial-setup-step4-last-checkpoint first
```

## Quality Checklist

Before completing initialization:
- [ ] Git repository verified (initialized if missing)
- [ ] Workflow log verified (created if missing)
- [ ] Framework version checked
- [ ] Worker ID assigned and saved
- [ ] Project state fully read
- [ ] Conflicts checked against workflow log
- [ ] File ownership boundaries defined
- [ ] Session logged to workflow log
- [ ] Ready message displayed

## Related Commands

- `/initial-setup-step5-build-order` - Generate the build order queue
- `/initial-setup-step6-project-start` - Begin implementing claimed feature
- `/wrapup` - Mark complete, commit, and update log
- `/handoff` - Create handoff to continue in new chat

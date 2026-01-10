# /handoff - Create Handoff Document

Generate a handoff document and starter prompt to continue work in a fresh Claude Code chat. Use this when you want a "fresh brain" to continue working on a problem.

## Usage

```
/handoff                    # Create handoff for current work
/handoff --feature F-001    # Handoff specific feature
/handoff --reason "stuck"   # Include reason for handoff
```

**Examples:**
```
/handoff                                    # Standard handoff
/handoff --reason "need fresh perspective"  # Explain why
/handoff --feature F-003 --feature F-004    # Multiple features
```

## Why This Command Exists

Sometimes you need to continue work in a new chat:
- The current conversation is getting long/confused
- You're stuck and want a "fresh brain" approach
- Context window is getting full
- You want to reset and try a different approach

This command captures everything needed so the next chat can pick up seamlessly.

## Process

### Step 1: Read Current Context

Gather from the current session:

1. **Worker ID** - From `.claude/worker-id`
2. **Assigned Features** - From workflow log or conversation
3. **Files Modified** - Scan git status or conversation history
4. **Decisions Made** - Key choices from conversation
5. **Current Blockers** - Any issues preventing progress

### Step 2: Scan Conversation

Analyze the current conversation for:

**Work Completed:**
- Files created or modified
- Functions/components implemented
- Tests written
- Problems solved

**Work Remaining:**
- Incomplete tasks
- TODOs mentioned
- Features not started

**Blockers/Issues:**
- Errors encountered
- Decisions needed
- External dependencies

**Key Decisions:**
- Architecture choices
- Implementation approaches
- Trade-offs made

### Step 3: Generate Handoff Document

Create `docs/handoffs/handoff-[timestamp].md`:

```markdown
# Handoff: [Feature Name(s)]

**Generated:** [Timestamp]
**From Worker:** Chat-A
**Reason:** [User-provided or "Continuing work in fresh context"]

---

## Context

[Brief description of what this work is about, extracted from SRS]

## Session Summary

**Duration:** ~[X] messages / [Y] minutes
**Features:** F-001 (User Authentication), F-002 (Profile Management)

## Completed This Session

- [x] Created `src/features/auth/login.tsx` - Login component with form validation
- [x] Added `src/lib/auth.ts` - Authentication utility functions
- [x] Configured Supabase auth in `src/lib/supabase.ts`
- [x] Fixed type errors in user context

## Remaining Work

- [ ] Implement password reset flow
- [ ] Add email verification
- [ ] Create protected route wrapper
- [ ] Write tests for auth utilities

## Current State

**Files Modified:**
```
M  src/features/auth/login.tsx
M  src/lib/auth.ts
A  src/lib/supabase.ts
M  src/types/user.ts
```

**Tests:** Not yet written
**Build:** Passing
**Blockers:** None

## Key Decisions Made

1. **Using Supabase Auth** - Chose over custom JWT because SRS specifies Supabase
2. **Form validation with Zod** - Matches patterns in existing skills
3. **Session storage** - Using Supabase session management, not custom cookies

## Notes for Next Session

- The login component is working but needs error handling polish
- Consider extracting form components to shared folder
- Password reset will need email templates in Supabase dashboard

---

## Starter Prompt

Copy everything below into a new Claude Code chat:

---

I'm continuing work on the [Project Name] project. Here's my context:

**Previous Worker:** Chat-A
**Features:** F-001 (User Authentication), F-002 (Profile Management)

**What's Done:**
- Login component at `src/features/auth/login.tsx`
- Auth utilities at `src/lib/auth.ts`
- Supabase config at `src/lib/supabase.ts`

**What's Left:**
1. Password reset flow
2. Email verification
3. Protected route wrapper
4. Tests

**Key Decisions:**
- Using Supabase Auth (not custom)
- Zod for form validation
- Supabase session management

Please run `/pre-flight-check F-001 F-002` to continue this work, then help me implement the password reset flow next.

---
```

### Step 4: Log the Handoff

Append to workflow log:

```markdown
### [Timestamp] - Chat-A - Handoff Created

**Worker:** Chat-A
**Reason:** [reason]
**Features Handed Off:** F-001, F-002
**Handoff Document:** docs/handoffs/handoff-2025-12-23-1430.md
**Status at Handoff:** Login complete, password reset pending
```

### Step 5: Display Summary

```markdown
═══════════════════════════════════════════════════════════════
                    HANDOFF CREATED
═══════════════════════════════════════════════════════════════

Document: docs/handoffs/handoff-2025-12-23-1430.md

SUMMARY:
├── Completed: 4 tasks
├── Remaining: 4 tasks
├── Files Modified: 4
└── Blockers: None

NEXT STEPS:
1. Open the handoff document
2. Copy the "Starter Prompt" section
3. Open a new Claude Code chat
4. Paste the prompt
5. The new chat will run /initiate-system automatically

═══════════════════════════════════════════════════════════════
```

## Handoff Reasons

Common reasons (auto-detected or user-provided):

| Reason | When to Use |
|--------|-------------|
| `fresh-perspective` | Stuck on a problem, want new approach |
| `context-full` | Conversation getting too long |
| `session-end` | Ending work session, will continue later |
| `blocked` | Waiting on external dependency |
| `scope-change` | Requirements changed mid-work |

## Quality Checklist

Before completing handoff:
- [ ] All completed work captured
- [ ] Remaining tasks listed
- [ ] File changes documented
- [ ] Key decisions recorded
- [ ] Blockers noted
- [ ] Starter prompt is complete and actionable
- [ ] Handoff logged to workflow log

## Error Handling

**If no work detected:**
```
⚠️ No significant work detected in this session

This session appears to be:
- Just starting (no files modified)
- Research/discussion only

Create handoff anyway? [Y/n]
```

**If uncommitted changes:**
```
⚠️ Uncommitted Changes Detected

Files with uncommitted changes:
- src/features/auth/login.tsx
- src/lib/auth.ts

Recommendation: Run /wrapup first to commit changes, then /handoff

Or create handoff with uncommitted changes noted? [Y/n]
```

**If no worker ID:**
```
No worker ID found. This session wasn't initialized with /pre-flight-check.

Assigning temporary ID: Chat-X (handoff session)
```

## Handoff vs Wrapup

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/handoff` | Continue in new chat | Stuck, need fresh context |
| `/wrapup` | Finish session | Done for now, committing work |

You can use both: `/wrapup` to commit, then `/handoff` to create continuation prompt.

## Related Commands

- `/pre-flight-check` - What the next chat runs first
- `/wrapup` - Commit changes before handoff (also captures progress)
- `/system-upgrade-push` - Push framework issues to High Level Vibing

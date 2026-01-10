# /wrapup - Complete Session and Ship

The single command to end your session. Does everything: logs your work, runs tests, handles versioning, captures lessons, and commits.

## Usage

```
/wrapup                     # Full ceremony (default)
/wrapup --skip-test         # Skip tests (for doc-only changes)
/wrapup --force             # Commit even if tests fail
/wrapup --no-lessons        # Skip lessons learned prompt
/wrapup --no-commit         # Log only, skip git operations
/wrapup --partial           # WIP commit, keep feature in-progress
```

## Why One Command?

Before, you had to run three commands: `/update-log` → `/test-protocol` → `/wrapup`

Now it's just `/wrapup`. Everything happens automatically in the right order.

---

## Process

### Step 1: Scan Conversation

Actively scan the current conversation for:

**Decisions Made** (look for: "decided", "chose", "will do", "let's go with")
- What was decided and why
- Alternatives considered

**Files Modified** (look for: Edit, Write, Bash tool calls)
- Created, edited, renamed, deleted

**Problems Encountered** (look for: "issue", "problem", "error", "failed")
- What went wrong
- Error messages

**Solutions Applied** (look for: "fixed", "resolved", "solution")
- How problems were solved

**Commands Executed**
- Which slash commands were run

---

### Step 1.5: Check for Uncommitted Changes

Run git status to detect ALL pending changes, not just from current conversation:

```bash
git status --short
```

**If uncommitted changes exist:**
- List ALL pending files (includes work from previous sessions)
- Add these to the "Files Modified" list from Step 1
- Proceed with full wrapup process

**Why this matters:**
Multi-session features accumulate uncommitted changes. Without this check,
deciding to skip commit (e.g., due to unrelated test failures) loses that work.

**CRITICAL:** If git status shows changes but Step 1 found none in conversation,
this indicates accumulated work from previous sessions. Do NOT skip the commit.

---

### Step 2: Run Tests

**Unless `--skip-test` flag is provided:**

```bash
node ~/.claude/scripts/test-protocol.mjs
```

Read `.test-protocol-result.json` for results.

**Display test results with prominent banner:**

If PASS:
```
═══════════════════════════════════════════════════════════════
                    ✓ TEST PROTOCOL: PASS
═══════════════════════════════════════════════════════════════
```

If FAIL:
```
═══════════════════════════════════════════════════════════════
                    ⚠️ TEST PROTOCOL: FAIL
═══════════════════════════════════════════════════════════════
Failures:
- [list each failure]

Verdict: [RELATED / UNRELATED to this session's changes]
Action: [MUST FIX / PROCEED WITH CALLOUT]
═══════════════════════════════════════════════════════════════
```

**If tests PASS:** Continue to next step.

**If tests FAIL:**
```
⚠️ Tests failed. Logging session but skipping commit.
  ✓ Workflow log updated
  ⊘ Git commit skipped

Fix tests and run /wrapup again.
To commit anyway: /wrapup --force
```

If `--force` flag: Continue despite failures.

**If tests fail but are UNRELATED to your changes:**

Sometimes tests/lint fail for pre-existing issues unrelated to the current session's work (e.g., you modified MCP servers but lint fails in a Next.js project). In this case:

**BEFORE concluding failures are "unrelated", check Step 1.5 results:**
1. Does `git status` show uncommitted changes?
2. If YES → proceed with commit even if tests failed for unrelated reasons
3. Only skip commit if BOTH: no conversation changes AND no git status changes

**Then explicitly acknowledge the failure** with a clear callout:
```
⚠️ TESTS FAILED - but proceeding because:
   • Failure in: [where it failed]
   • Our changes: [what we actually modified]
   • Verdict: Unrelated, pre-existing issue
```

2. **Continue with wrapup** - don't use `--force` flag, just proceed normally since the failure isn't blocking.

3. **Document the pre-existing issue** in the workflow log so it can be fixed later.

This transparency ensures the user knows you saw the failure and made a conscious decision, not that you missed it.

---

### Step 3: Secret Scan

Scan staged files for accidentally committed secrets:

| Pattern | Example | Risk |
|---------|---------|------|
| API Keys | `sk-proj-...`, `AKIA...` | High |
| Private Keys | `-----BEGIN PRIVATE KEY-----` | Critical |
| Tokens | `ghp_...`, `sk-ant-...` | High |
| Passwords | `password = "..."` | High |
| .env files | Should be in .gitignore | Medium |

**If secrets found:** Stop and warn. Do not proceed until resolved.

---

### Step 3.5: Verify Git Repository

```bash
git status
```

If "not a git repository":
```
⚠️ No git repository found

Creating git repository for this project...

git init
git add .
git commit -m "chore: initialize git repository

🤖 Generated with Claude Code"

✓ Git initialized. Continuing with wrapup...
```

---

### Step 4: Git Sync

```bash
git pull origin main
```

Get changes from other workers before committing. If conflicts, stop and resolve manually.

---

### Step 5: Sync Commands/Skills to HLV (Auto)

**Check for new or modified files in:**
- `.claude/commands/` (slash commands, excluding `project/` subfolder)
- `.claude/skills/` (tech skills, excluding `project/` subfolder)

**Read HLV path from:** `~/.claude/system-config.json` → `hlv_path`

**If running IN HLV itself:**
- Skip "sync to HLV" (already there)
- Just sync to `~/.claude/commands/` for immediate availability

**If running in a PROJECT (not HLV):**

1. **Detect changes:**
   - List all `.md` files in `.claude/commands/` (excluding `project/` subfolder)
   - List all files in `.claude/skills/` (excluding `project/` subfolder)
   - Compare with HLV versions

2. **For each new/modified file:**
   - Copy to HLV at the same relative path
   - Copy commands to `~/.claude/commands/` for immediate availability

3. **Show sync results:**
```
═══════════════════════════════════════════════════════════════
                    SYNCED TO HLV
═══════════════════════════════════════════════════════════════

Commands synced:
  ✓ FB-campaign-analysis.md (new)
  ✓ custom-report.md (updated)

Skills synced:
  ✓ meta-ads/meta-ads - SKILL.md (new)

───────────────────────────────────────────────────────────────
Other projects can pull these with /system-upgrade-pull
═══════════════════════════════════════════════════════════════
```

4. **If nothing to sync:**
   - Show: "No new commands or skills to sync"
   - Continue to next step

**Protected paths (never synced):**
- `.claude/commands/project/` - Project-specific commands stay local
- `.claude/skills/project/` - Project-specific skills stay local

**If HLV not accessible:**
```
⚠️ HLV not accessible at [path]
Continuing with local commit only.
Run /wrapup again when HLV is available.
```

---

### Step 6: Lessons Learned (Optional)

**Unless `--no-lessons` flag:**

```
Notable problem/solution to document? [y/N]:
```

**If yes:** Call the wrapup script to create lesson entry:

```bash
node ~/.claude/scripts/wrapup.mjs \
  --area "<area>" \
  --title "<title>" \
  --summary "<summary>" \
  --problem "<problem>" \
  --fix "<fix>" \
  --tags "<tags>"
```

Creates: `docs/lessons-learned/YYYY-MM-DD__area__title.md`

**If no:** Skip lessons, proceed to next step.

---

### Step 6.5: Ensure Workflow Log Exists

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

```

Then continue to append the session entry.

---

### Step 7: Update Workflow Log

Append to `docs/workflow-development-log.md`:

```markdown
### [Timestamp] - Worker-ID - Session Complete

**Status:** Completed (or Partial if --partial)

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| ... | ... | ... |

**Files Modified:**
- Created: ...
- Edited: ...

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| ... | ... |

**Commands Run:**
- /pre-flight-check
- /wrapup
```

---

### Step 8: Update Build Order

**Unless `--partial` flag:**

Mark claimed features as completed in `docs/build-order.md`:

```markdown
| F-001 | User Auth | completed | Worker-A | 2025-12-24 |
```

**If `--partial`:** Keep feature as `in-progress`.

---

### Step 9: Git Commit and Push

**Unless `--no-commit` flag:**

```bash
git add -A
git commit -m "<type>(<feature>): <description>

- Change 1
- Change 2

Worker: <worker-id>
Closes: <feature-id>

🤖 Generated with Claude Code"

git push origin main
```

**Commit types:** feat, fix, refactor, docs, test, chore

---

### Step 10: Display Summary

```
═══════════════════════════════════════════════════════════════
                    SESSION COMPLETE
═══════════════════════════════════════════════════════════════

Worker: Chat-A
Feature: F-001 (User Authentication)
Status: completed

TESTS:
└── ✅ All passed

SECRET SCAN:
└── ✅ No secrets detected

LOG UPDATED:
├── Decisions: 3 documented
├── Files: 5 tracked
└── Problems/Solutions: 1 recorded

GIT:
├── Commit: abc1234
└── Pushed to origin/main

═══════════════════════════════════════════════════════════════
```

---

## Flag Reference

| Flag | What it does |
|------|--------------|
| `--skip-test` | Skip test-protocol step. Use for doc-only changes. |
| `--force` | Commit even if tests fail. Use with caution. |
| `--no-lessons` | Skip "Notable problem/solution?" prompt. |
| `--no-commit` | Log only, skip git. Like the old `/update-log`. |
| `--partial` | Keep feature in-progress, commit as WIP. |

---

## Common Scenarios

### Normal feature completion
```
/wrapup
```
Runs tests, logs, commits, pushes. Done.

### Doc-only change
```
/wrapup --skip-test
```
No tests needed for markdown changes.

### Tests failing but need to save progress
```
/wrapup --force
```
Commits anyway. Fix tests in next session.

### Just want to log, not commit yet
```
/wrapup --no-commit
```
Updates log but skips git. Rarely needed.

### Feature not done, but ending session
```
/wrapup --partial
```
Commits as WIP, feature stays claimed.

---

## Error Handling

**No changes to commit:**
```
No changes detected. Nothing to commit.
Log updated with session notes.
```

**Git push fails:**
```
⚠️ Push failed - remote has changes.
Running: git pull --rebase && git push
```

**Build order not found:**
```
⚠️ No build order at docs/build-order.md
Skipping build order update.
```

---

## Related Commands

- `/test-protocol` - Run tests without committing (for iteration)
- `/pre-flight-check` - Start a work session
- `/handoff` - Create handoff for fresh chat continuation
- `/system-upgrade-push` - Push framework issues to High Level Vibing

# /cheat-sheet - Command Quick Reference

Display a quick reference for all workflow commands.

## Usage

```
/cheat-sheet              # Show full reference
/cheat-sheet setup        # Show only setup commands
/cheat-sheet work         # Show only work session commands
```

---

## Process

Display the following reference:

```
═══════════════════════════════════════════════════════════════
              CLAUDE WORKFLOW COMMANDS - CHEAT SHEET
═══════════════════════════════════════════════════════════════

SETUP PHASE (run once per project, in order)
─────────────────────────────────────────────────────────────────
/initial-setup-step1-srs-creation     Create SRS from your idea
/initial-setup-step2-srs-analyze      Validate SRS (12 quality gates)
/initial-setup-step3-skills-creation  Generate tech skills
/initial-setup-step4-last-checkpoint  Final check, create structure
/initial-setup-step5-build-order      Generate work queue
/initial-setup-step6-project-start    Begin claimed feature

WORK SESSION (use during development)
─────────────────────────────────────────────────────────────────
/initiate-system          git pull → claim feature → git push
/update-log               Capture progress to workflow log
/handoff                  Create handoff to continue in new chat
/test-protocol            Build and test before committing
/wrapup                   git pull → mark complete → git push

MAINTENANCE (as needed)
─────────────────────────────────────────────────────────────────
/system-upgrade           Upgrade workflow commands from git
/skill-sync               Sync shared skills from mothership
/skill-refresh            Update skills as project evolves
/cheat-sheet              Show this reference

═══════════════════════════════════════════════════════════════

TYPICAL WORKFLOWS
─────────────────────────────────────────────────────────────────

New Project:
  step1 → step2 → step3 → step4 → step5 → step6

Work Session:
  /initiate-system → /step6 → work → /update-log → /wrapup

Fresh Brain (continue in new chat):
  /handoff → [new chat] → /initiate-system

Parallel Development (multiple chats):
  Chat-A: /initiate-system → claims F-001 → work → /wrapup
  Chat-B: /initiate-system → claims F-003 → work → /wrapup
  Chat-C: /initiate-system → claims F-002 → work → /wrapup
  (Each chat auto-claims next available from queue)

═══════════════════════════════════════════════════════════════

GIT SYNC (keeps parallel workers in sync)
─────────────────────────────────────────────────────────────────

/initiate-system does:
  1. git pull          ← Get latest from other workers
  2. Read build order  ← See current queue state
  3. Claim feature     ← Mark as in-progress
  4. git push          ← Tell others about claim

/wrapup does:
  1. git pull          ← Get latest changes
  2. Update log        ← Capture session decisions
  3. Mark complete     ← Update build order
  4. git commit        ← Save all work
  5. git push          ← Release feature for dependents

═══════════════════════════════════════════════════════════════

QUICK TIPS
─────────────────────────────────────────────────────────────────
• Run /initiate-system at the START of every work session
• Git sync happens automatically - no manual pull/push needed
• Features are auto-claimed from the build queue
• Run /update-log frequently to capture progress
• Use /handoff when stuck or context is getting long
• /wrapup marks feature complete so others can claim dependents
• Check docs/build-order.md for queue status

═══════════════════════════════════════════════════════════════
```

## Filtered Views

### If `--setup` or `setup` argument:

```
SETUP PHASE COMMANDS
─────────────────────────────────────────────────────────────────

1. /initial-setup-step1-srs-creation
   Create SRS from your idea
   → Interactive brainstorming, 5 stages
   → Output: docs/srs/SRS-[Name].md

2. /initial-setup-step2-srs-analyze
   Validate SRS with 12 quality gates
   → 4 blocking gates must pass
   → Output: docs/srs/analysis-report.md

3. /initial-setup-step3-skills-creation
   Generate technology skills
   → Creates skills for each tech in SRS
   → Output: .claude/skills/

4. /initial-setup-step4-last-checkpoint
   Final verification before building
   → Creates project structure
   → Output: CLAUDE.md, folders, configs

5. /initial-setup-step5-build-order
   Generate sequenced work queue
   → Sorts features by dependencies
   → Output: docs/build-order.md

6. /initial-setup-step6-project-start [feature]
   Begin implementing a feature
   → Loads context, creates checklist
   → Use after /initiate-system claims feature
```

### If `--work` or `work` argument:

```
WORK SESSION COMMANDS
─────────────────────────────────────────────────────────────────

/initiate-system [feature]
   Run at START of any work session
   → git pull (sync with other workers)
   → Assigns worker ID (Chat-A, Chat-B, etc.)
   → Claims next available from build queue
   → git push (announce claim)
   → Defines file ownership

/initial-setup-step6-project-start [feature]
   Begin implementing claimed feature
   → Loads context from SRS
   → Creates implementation checklist
   → Generates test stubs

/update-log
   Capture progress to workflow log
   → Scans conversation for decisions, changes
   → Includes worker ID in log entry
   → Run frequently!

/handoff
   Create handoff to continue in new chat
   → Generates starter prompt for new chat
   → Documents what's done and remaining
   → Use when stuck or need fresh perspective

/test-protocol
   Build and test before committing
   → Runs build, tests, linting
   → Reports any failures

/wrapup
   Mark complete, commit, update log
   → git pull (sync with other workers)
   → Updates workflow log with session summary
   → Marks feature as completed in build order
   → git commit + push (release for dependents)
```

## Related

All commands are installed to `~/.claude/commands/`

Full documentation: See individual command files or README.md

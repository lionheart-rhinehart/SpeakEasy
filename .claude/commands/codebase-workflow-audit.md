# /codebase-workflow-audit - Technical Consistency Audit

Audit the High Level Vibing workflow system for consistency issues, broken references, and documentation drift.

> **Note:** This is one of two audit commands:
> - `/codebase-workflow-audit` - Technical/structural consistency (this command)
> - `/customer-journey-workflow-audit` - User experience validation (requires fresh session)

## IMPORTANT: Run with YOLO Mode

This audit requires reading many files. To avoid permission prompts, run Claude Code with:

```bash
claude --dangerously-skip-permissions
```

Then run `/codebase-workflow-audit` in that session.

## What This Audits

### 1. Framework Manifest Accuracy
- Read `.claude/framework-manifest.json`
- Verify every file in `syncable_files` actually exists
- Verify every file in `template_files` actually exists
- Check checksums are not "pending" (should be computed)

### 2. Command Documentation Consistency
- Read `CHEAT-SHEET.md` and verify step numbering matches actual commands
- Read `START HERE/README.md` and check for deprecated command references
- Read `START HERE/INSIDERS-IMPLEMENTATION-GUIDE.md` and verify:
  - Step numbering is correct (steps 1-6)
  - No deprecated commands (/sync-framework should be /skill-sync)
  - Test protocol description is accurate
  - File locations are correct

### 3. Command Files Cross-Reference
- Read each command in `.claude/commands/` or user commands location
- Verify commands reference correct step numbers
- Check for deprecated command mentions

### 4. Skill File Naming Consistency
- Check `.claude/skills/` folders
- Verify naming convention is consistent:
  - next-js uses `next.js - *.md`
  - supabase uses `supabase - *.md`
  - tailwind-css uses `tailwind-css - *.md`
- Flag any files not following the `[technology] - [type].md` pattern

### 5. Protected Paths Verification
- Verify `protected_paths` in manifest are valid patterns
- Check that protected paths are not accidentally in syncable_files

### 6. DO NOT Copy List Validation
- Read `/new-project` command
- Verify files/folders in DO NOT copy list actually exist
- Flag any references to non-existent paths

### 7. Sync Architecture Validation (v2.0+)
- Verify `~/.claude/system-config.json` exists and points to HLV
- Check HLV commands match `~/.claude/commands/` (should be in sync)
- Verify no orphaned project-local commands (check recent projects)
- Confirm `/wrapup` Step 5 has sync logic (not just version bumping)
- Check deprecated commands have proper notices (/skills-push, /skills-pull)
- Validate `sync_architecture` section exists in framework-manifest.json

## Audit Workflow

### Phase 1: Read All Configuration Files
1. Read `.claude/framework-manifest.json`
2. Read `CHEAT-SHEET.md`
3. Read `START HERE/README.md`
4. Read `START HERE/INSIDERS-IMPLEMENTATION-GUIDE.md`
5. List all files in `.claude/skills/`
6. Read relevant command files

### Phase 2: Cross-Reference Analysis
Compare all sources and identify:
- Missing files (referenced but don't exist)
- Orphan files (exist but not referenced)
- Deprecated commands still mentioned
- Inconsistent step numbering
- Naming convention violations

### Phase 3: Generate Report

Output a structured report with severity levels:

```
CODEBASE WORKFLOW AUDIT REPORT
==============================

P0 - CRITICAL (Must Fix)
------------------------
[Issues that break functionality or cause user confusion]

P1 - WARNING (Should Fix)
-------------------------
[Issues that cause inconsistency but don't break anything]

P2 - NICE TO HAVE
-----------------
[Improvements for completeness]

SUMMARY
-------
Total Issues: X
P0 Critical: X
P1 Warning: X
P2 Nice to Have: X

RECOMMENDED ACTIONS
-------------------
1. [Action item]
2. [Action item]
```

## Severity Definitions

### P0 - CRITICAL
- Broken references (commands reference non-existent files)
- Wrong step numbers in documentation
- Deprecated commands still referenced
- Files in manifest that don't exist

### P1 - WARNING
- Checksums still "pending"
- Inconsistent naming conventions
- Non-existent files in DO NOT copy list
- Missing optional documentation

### P2 - NICE TO HAVE
- Missing templates (CLAUDE.md, .claude/rules/)
- Changelog not updated
- Version numbers out of sync

## Example Audit Output

```
CODEBASE WORKFLOW AUDIT REPORT
==============================

P0 - CRITICAL (Must Fix)
------------------------
1. CHEAT-SHEET.md: Step table shows 8 steps but step5-build-order missing
   - Line 17 goes from step4-last-checkpoint to step6-project-start
   - Fix: Add row for /initial-setup-step5-build-order

2. START HERE/README.md: Deprecated command reference
   - Line 34: /sync-framework → should be /skill-sync

3. INSIDERS-IMPLEMENTATION-GUIDE.md: Multiple issues
   - Line 53: References step5-project-start but should be step6
   - Line 74: /sync-framework → /skill-sync

P1 - WARNING (Should Fix)
-------------------------
1. framework-manifest.json: All checksums are "pending"
   - Consider computing actual checksums

2. skills/tailwind-css/: Inconsistent file naming
   - Uses SKILL.md instead of tailwind-css - SKILL.md

P2 - NICE TO HAVE
-----------------
1. No CLAUDE.md template in mothership
2. No .claude/rules/ folder structure

SUMMARY
-------
Total Issues: 7
P0 Critical: 3
P1 Warning: 2
P2 Nice to Have: 2
```

## After Fixing

After addressing issues:
1. Run `/codebase-workflow-audit` again to verify fixes
2. Run `/wrapup` to commit changes and auto-sync to HLV
3. Commands are automatically synced to `~/.claude/commands/` for immediate use

## Notes

- This audit is designed to catch documentation drift before it causes user confusion
- Run periodically after making changes to commands or documentation
- The audit is read-only and does not modify any files
- For user experience validation, use `/customer-journey-workflow-audit`

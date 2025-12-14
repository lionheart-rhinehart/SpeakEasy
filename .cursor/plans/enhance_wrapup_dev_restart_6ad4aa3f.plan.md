---
name: Enhance wrapup dev restart
overview: Add auto-restart of dev server after wrapup completes, and create a searchable JSON index of all lessons learned summaries for future reference.
todos:
  - id: add-dev-restart
    content: Add dev server detection and auto-restart to wrapup.mjs
    status: completed
  - id: add-json-index
    content: Create JSON index generation in wrapup.mjs and parse existing markdown files
    status: completed
  - id: add-search-command
    content: Add npm script for searching lessons learned (optional)
    status: completed
---

# Enhance Wrapup: Dev Server Restart + Searchable Summary Index

## Current State

The wrapup saves summaries in markdown files (like [`2025-12-14__devops__create-wrapup-sop-system.md`](lessons-learned/2025-12-14__devops__create-wrapup-sop-system.md)), but:

- No dev server restart after wrapup
- Summaries only in markdown (not searchable/queryable)

## Proposed Enhancements

### 1. Auto-Restart Dev Server

Add a final step to [`scripts/wrapup.mjs`](scripts/wrapup.mjs) that:

- Detects if `npm run tauri:dev` (or similar) was running before wrapup started
- Restarts it automatically after completion
- Shows a message: "Dev server restarted in background"

**Implementation approach:**

- Check for running process at start of wrapup (store PID)
- After git operations complete, restart the same command
- Use `spawn` with `detached: true` so it runs in background

**Flag to control:** `--no-restart` (opt-out if you don't want restart)

### 2. Searchable Summary Index

Create [`lessons-learned/index.json`](lessons-learned/index.json) that contains all lessons learned data in structured format:

```json
{
  "version": "1.0",
  "last_updated": "2025-12-14T17:21:44Z",
  "entries": [
    {
      "id": "2025-12-14__devops__create-wrapup-sop-system",
      "date": "2025-12-14",
      "area": "devops",
      "title": "create-wrapup-sop-system",
      "summary": "Created automated end-of-task workflow...",
      "tags": ["devops", "automation", "workflow"],
      "problem": "...",
      "fix": "...",
      "file": "2025-12-14__devops__create-wrapup-sop-system.md"
    }
  ]
}
```

**Benefits:**

- Search by area, tags, date range
- Export to other formats (CSV, etc.)
- Feed into AI tools for pattern analysis
- Quick lookups without opening files

**Implementation:**

- Update [`scripts/wrapup.mjs`](scripts/wrapup.mjs) to maintain this JSON file
- Add `updateLessonsIndex()` function to write both README.md and index.json
- Parse existing markdown files on first run to build initial index

### 3. Optional: Search Command

Add `npm run lessons:search "<query>"` that searches the JSON index:

```bash
npm run lessons:search "api key"
# Returns all entries mentioning "api key"
```

## Files to Modify

1. [`scripts/wrapup.mjs`](scripts/wrapup.mjs) - Add dev server detection/restart and JSON index generation
2. [`package.json`](package.json) - Add `lessons:search` script (optional)
3. [`lessons-learned/index.json`](lessons-learned/index.json) - New file (auto-generated)

## Example Usage After Changes

```bash
i'm# Normal wrapup (auto-restarts dev server)
npm run wrapup -- --area "frontend" --title "add-feature" --summary "Added new feature"

# Wrapup without dev server restart
npm run wrapup -- --no-restart --area "bugfix" --title "fix-bug" --summary "Fixed bug"

# Search lessons learned
npm run lessons:search "api key"
npm run lessons:search "bugfix"
```

## Questions for User

Do you want:

- Both enhancements (dev restart + JSON index)?
- Just dev restart?
- Just JSON index?
- Also add the search command?
# Auto-Diagnostic Reporting to Supabase

**Date:** 2026-03-13
**Area:** devops
**Tags:** diagnostics, supabase, telemetry, beta-testing, logging

## Summary

Added automatic error log reporting: on every app startup, WARN/ERROR entries from the local log file are uploaded to a `diagnostic_logs` table in Supabase. Developers can diagnose beta tester issues without asking users to manually find and send log files.

## Key Design Decisions

### 1. Cursor-Based Deduplication
**Decision:** Track byte offset in a cursor file to avoid re-sending already-reported log entries.
**Why:** Simple, file-based, no database state needed. If cursor file is corrupted or missing, defaults to 0 (re-reads entire log). Occasional duplicates are acceptable for 2-5 beta testers.

### 2. Filter for WARN/ERROR Only
**Decision:** Only upload lines containing `][WARN]` or `][ERROR]`, not the full log.
**Why:** Privacy (less data leaves the machine), payload size (50KB cap), and signal-to-noise ratio. INFO lines are noise for remote debugging.

### 3. Fire-and-Forget via tokio::spawn
**Decision:** Spawn the upload as a background task with 5-second delay, no `.await`.
**Why:** Startup must not be blocked by network calls. If Supabase is down, the app functions normally. The 5-second delay ensures startup errors (overlay failures, updater checks) get written to the log before we read it.

### 4. One Row Per Startup (Batched)
**Decision:** All WARN/ERROR lines from a session go into a single row's `log_entries` TEXT column.
**Why:** Simpler than one-row-per-error, keeps row count small, gives temporal context by grouping errors from the same session.

### 5. machine_id as the Join Key
**Decision:** No email column in diagnostic_logs. Use `machine_id` to JOIN with `activations` table.
**Why:** The activations table already maps machine_id → user_email. No need to duplicate data or add extra keychain reads to the diagnostics module.

## Implementation Pattern

The `diagnostics.rs` module follows `feedback.rs` exactly:
- Same Supabase URL + anon key constants
- Same reqwest POST pattern with apikey/Authorization headers
- Same `get_os_info()` function (copied, since it's private in feedback.rs)
- Same `env!("CARGO_PKG_VERSION")` for app version

**Reuse principle:** When adding a new Supabase-connected module, copy the pattern from `feedback.rs`. Don't invent new HTTP client configurations.

## Supabase MCP Tool

**Discovery:** The `supabase.apply_migration` MCP tool can run DDL migrations directly from Claude Code — no need to open the Supabase Dashboard SQL Editor. Use `mcp__lazy-mcp__execute_tool` with `tool_path: "supabase.apply_migration"` and pass `name` + `query` arguments.

## Edge Cases Handled

| Edge Case | Behavior |
|-----------|----------|
| Log file doesn't exist yet | Return early, no upload |
| Log rotated (file smaller than cursor) | Reset cursor to 0, re-read entire file |
| Cursor file missing/corrupted | Default to 0 |
| No WARN/ERROR lines | Advance cursor, skip HTTP request |
| Supabase down | log::warn, cursor NOT advanced (retry next startup) |
| Payload > 50KB | Truncate from beginning (keep most recent errors) |
| File locked by tauri-plugin-log | Windows allows concurrent read+write |

## References

- `src-tauri/src/diagnostics.rs` — Full module
- `src-tauri/src/feedback.rs` — Pattern template
- `supabase/migrations/003_diagnostic_logs.sql` — Table definition
- Supabase query to correlate: `SELECT d.*, a.user_email FROM diagnostic_logs d LEFT JOIN activations a ON d.machine_id = a.machine_id ORDER BY d.created_at DESC;`

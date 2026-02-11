# Test Protocol Command Resolution Issue

**Date:** 2026-02-11
**Area:** DevOps - Slash Commands
**Tags:** test-protocol, command-resolution, tauri, installer

## Summary

The `/test-protocol` slash command was running the generic user-level script (`~/.claude/scripts/test-protocol.mjs`) which only performs quality gates (lint, typecheck, build, cargo check). The project-level Tauri-specific script (`scripts/test-protocol.mjs`) — which builds the installer, kills the running app, installs silently, and launches for manual testing — was never connected to the command.

## Problem

Two test-protocol scripts exist by design (generic vs project-specific), created in the Dec 18 "split-wrapup-test-protocol" session. But the `.claude/commands/test-protocol.md` command file was never updated to reference the project-level script. It still pointed to `node ~/.claude/scripts/test-protocol.mjs`. The HLV sync process may have also overwritten the project command with the generic version.

Result: Running `/test-protocol` only ran quality gates. The user expected the full build-install-launch workflow and had to manually run `npm run tauri build` separately.

## Solution

Updated `.claude/commands/test-protocol.md` to run `npm run test-protocol` (the project-level script) instead of `node ~/.claude/scripts/test-protocol.mjs`. Updated the documentation to reflect the full Tauri workflow and correct flags (`--skip-gates`, `--skip-rust`, `--no-restart`).

## Prevention

- When creating project-specific overrides of user-level scripts, always update the corresponding command file
- After HLV syncs (`/wrapup` Step 5), verify project-level command files weren't overwritten by generic versions
- The project-level command should NOT be synced to HLV since it's Tauri-specific

## References

- `.claude/commands/test-protocol.md` — the command definition (updated)
- `scripts/test-protocol.mjs` — the project-level Tauri script (535 lines, created Dec 18)
- `~/.claude/scripts/test-protocol.mjs` — the generic user-level script (299 lines)
- `lessons-learned/2025-12-18__devops__split-wrapup-test-protocol.md` — original split documentation

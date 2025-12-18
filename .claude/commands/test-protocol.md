---
description: Build, install, and launch the app for manual testing
---

# Test Protocol

You are running the test protocol to prepare a build for manual testing.

## What This Does

1. Runs preflight checks (node, npm, rust, git)
2. Runs quality gates (lint, typecheck, build, cargo check)
3. Builds the release installer (npm run tauri build)
4. Kills any running SpeakEasy instances
5. Runs the NSIS installer silently
6. Launches the installed application
7. Restarts the dev server (if it was running)

All steps are recorded to `.test-protocol-result.json` for wrapup to incorporate.

## Run the Command

**IMPORTANT:** First ensure you are in the project root directory, then execute:

```bash
npm run test-protocol
```

**Flags (use when appropriate):**
- `--skip-gates`: Skip lint/typecheck/build (use for quick iteration when you know code is clean)
- `--skip-rust`: Skip Rust cargo check
- `--no-restart`: Don't restart dev server after install

## After Running

Tell the user:
- Whether test-protocol succeeded or failed
- The installer that was built (from build_info in state file)
- That the app is now running and ready for manual testing
- They should run `/wrapup` when testing is complete and ready to commit

## Examples

Standard run:
```bash
npm run test-protocol
```

Quick iteration (skip quality gates):
```bash
npm run test-protocol -- --skip-gates
```

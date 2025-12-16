# fix-duplicate-process-single-instance

**Date**: 2025-12-16
**Area**: bugfix
**Tags**: bugfix

## Summary
Implemented single-instance enforcement for SpeakEasy using Tauri's single-instance plugin, preventing duplicate app launches from autostart or manual launches.

## Problem
Two SpeakEasy.exe processes appeared due to autostart and manual launch, causing duplicate app instances and resource waste.

## Fix
Integrated tauri-plugin-single-instance, handled --minimized flag for system tray autostart, and tested all launch scenarios to verify only one process remains at any time.

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 README.md                      |  37 ++++
 lessons-learned/index.json     |  21 ++-
 src-tauri/Cargo.lock           | 420 +++++++++++++++++++++++++++++++++++++++++
 src-tauri/Cargo.toml           |   1 +
 src-tauri/src/audio.rs         |  53 +++---
 src-tauri/src/clipboard.rs     |  26 ++-
 src-tauri/src/commands.rs      | 227 ++++++++++++++--------
 src-tauri/src/config.rs        | 161 ++++++++++------
 src-tauri/src/lib.rs           |  28 +++
 src-tauri/src/llm.rs           | 197 +++++++++++++------
 src-tauri/src/secrets.rs       |  72 +++++--
 src-tauri/src/transcription.rs | 161 ++++++++++++----
 12 files changed, 1130 insertions(+), 274 deletions(-)

Untracked files:
.cursor/plans/status-bar-window-v2_b942462f.plan.md
.github/workflows/process-count-test.yml
DUPLICATE_PROCESS_FIX_SUMMARY.md
bug-analysis/critical/08-duplicate-process-autostart-conflict.md
bug-analysis/critical/08-duplicate-process-verification.md
lessons-learned/2025-12-16__fix__duplicate-process-single-instance.md


```

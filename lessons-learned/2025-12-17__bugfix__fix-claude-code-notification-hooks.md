# fix-claude-code-notification-hooks

**Date**: 2025-12-17
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed Claude Code notification sounds by changing invalid Notification hook to valid PermissionRequest and Stop hooks

## Problem
User had configured a Notification hook which is not a valid Claude Code hook event type so no sounds played

## Fix
Changed hook event type from Notification to PermissionRequest and Stop which are valid hook events

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 lessons-learned/README.md  |   4 +-
 lessons-learned/index.json |  30 ++++++-
 src-tauri/src/commands.rs  |  15 ++++
 src-tauri/src/config.rs    | 156 +++++++++++++++++++++++++++++++++++++
 src-tauri/src/lib.rs       |   3 +
 src/stores/appStore.ts     | 189 +++++++++++++++++++++++++++++++++++++++++----
 src/types/index.ts         |  38 +++++++++
 7 files changed, 419 insertions(+), 16 deletions(-)

Untracked files:
lessons-learned/2025-12-17__bugfix__fix-claude-code-notification-hooks.md
lessons-learned/2025-12-17__feature__file-based-settings-persistence.md


```

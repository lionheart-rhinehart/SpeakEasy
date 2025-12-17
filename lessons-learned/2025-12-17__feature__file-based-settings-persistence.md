# file-based-settings-persistence

**Date**: 2025-12-17
**Area**: feature
**Tags**: feature

## Summary
Moved all user settings (hotkeys, webhook actions, preferences) from localStorage to file-based config.json to survive app reinstalls

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 src-tauri/src/commands.rs |  15 ++++
 src-tauri/src/config.rs   | 156 ++++++++++++++++++++++++++++++++++++++
 src-tauri/src/lib.rs      |   3 +
 src/stores/appStore.ts    | 189 ++++++++++++++++++++++++++++++++++++++++++----
 src/types/index.ts        |  38 ++++++++++
 5 files changed, 388 insertions(+), 13 deletions(-)

Untracked files:
nul


```

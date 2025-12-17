# unify-prompt-action-dropdown

**Date**: 2025-12-17
**Area**: feature
**Tags**: feature

## Summary
Unified prompt actions into the Hotkey Actions dropdown and increased window sizes for better usability

## Problem
Prompt Actions were in a separate hidden section requiring scrolling, and windows were too small

## Fix
Added PROMPT as an action type in the existing dropdown alongside POST/GET/URL/Smart URL, removed the separate section, and increased main window to 500x650 and settings modal to max-w-xl

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 src-tauri/src/config.rs          |   4 +-
 src-tauri/tauri.conf.json        |   8 +-
 src/App.tsx                      | 100 +++++++++++++++
 src/components/SettingsPanel.tsx | 254 +++++----------------------------------
 src/stores/appStore.ts           |   2 +
 src/types/index.ts               |   8 +-
 6 files changed, 145 insertions(+), 231 deletions(-)


```

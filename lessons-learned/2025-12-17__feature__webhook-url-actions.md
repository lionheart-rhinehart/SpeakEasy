# webhook-url-actions

**Date**: 2025-12-17
**Area**: feature
**Tags**: feature

## Summary
Extended Webhook Actions to support URL and SMART_URL modes that open URLs in Chrome or perform Google searches from highlighted text

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 src-tauri/Cargo.lock             |   1 +
 src-tauri/Cargo.toml             |   3 +
 src-tauri/src/commands.rs        | 122 ++++++++++++++++++++++
 src-tauri/src/lib.rs             |   2 +
 src/App.tsx                      | 211 ++++++++++++++++++++++++++++++++++++---
 src/components/SettingsPanel.tsx |  90 +++++++++++------
 src/types/index.ts               |  10 +-
 7 files changed, 393 insertions(+), 46 deletions(-)

Untracked files:
src/components/Toast.tsx


```

# fix-profile-chooser-topmost

**Date**: 2025-12-18
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed Chrome profile chooser appearing behind other windows by applying Win32 topmost subclass to main window while modal is open

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json |  6 ++++-
 src-tauri/src/commands.rs   | 55 +++++++++++++++++++++++++++++++++++++++++++++
 src-tauri/src/lib.rs        |  2 ++
 src/App.tsx                 | 35 ++++++++++++++++++++---------
 4 files changed, 87 insertions(+), 11 deletions(-)


```

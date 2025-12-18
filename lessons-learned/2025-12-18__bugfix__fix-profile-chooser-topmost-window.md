# fix-profile-chooser-topmost-window

**Date**: 2025-12-18
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed Profile Chooser appearing behind other windows by creating it as a separate Tauri window with Win32 topmost subclass, following the same pattern as the working recording overlay

## Problem
Profile Chooser modal was inside main window and Windows Focus Stealing Prevention blocked it from appearing on top of other applications

## Fix
Created profile-chooser as independent Tauri window with alwaysOnTop and Win32 subclass applied at startup, same architecture as recording overlay

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json |   3 +-
 src-tauri/src/commands.rs   | 117 ++++++++++++++++++++++++++++++
 src-tauri/src/lib.rs        |  52 ++++++++++++++
 src-tauri/tauri.conf.json   |  14 ++++
 src/App.tsx                 | 168 +++++++++++++++++++++-----------------------
 vite.config.ts              |   3 +-
 6 files changed, 269 insertions(+), 88 deletions(-)

Untracked files:
profile-chooser.html
src/components/ProfileChooserWindow.tsx
src/profileChooser.tsx


```

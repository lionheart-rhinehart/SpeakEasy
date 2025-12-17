# fix-overlay-zorder-subclassing

**Date**: 2025-12-17
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed recording overlay z-order issue using Windows window subclassing to intercept WM_WINDOWPOSCHANGING and force HWND_TOPMOST

## Problem
Recording overlay window disappeared behind other windows despite alwaysOnTop setting - previous fix attempts using SetWindowPos were overridden by other apps

## Fix
Implemented window subclassing via SetWindowSubclass to intercept WM_WINDOWPOSCHANGING messages and force HWND_TOPMOST before Windows processes z-order changes - this prevents other apps from overriding the topmost status

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json |  4 +++-
 src-tauri/Cargo.lock        |  1 +
 src-tauri/Cargo.toml        | 12 ++++++++++--
 src-tauri/src/commands.rs   | 13 +++++++++++++
 src-tauri/src/lib.rs        | 19 ++++++++++++++++++-
 5 files changed, 45 insertions(+), 4 deletions(-)

Untracked files:
src-tauri/src/window_topmost.rs


```

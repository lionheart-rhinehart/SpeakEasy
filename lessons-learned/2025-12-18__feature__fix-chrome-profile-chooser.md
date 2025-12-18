# fix-chrome-profile-chooser

**Date**: 2025-12-18
**Area**: feature
**Tags**: feature

## Summary
Fixed Chrome profile chooser modal not appearing and added number key shortcuts (1-9) for instant profile selection

## Problem
Profile chooser modal never appeared despite profiles being found - window.show() exception caught by wrong try-catch block caused fallthrough to open URL without modal

## Fix
Separated try-catch blocks so window errors don't mask profile errors, set React state before window operations, increased z-index to 9999

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json            |  10 ++-
 src-tauri/src/commands.rs              | 110 ++++++++++++++++++++++++++++++---
 src-tauri/src/lib.rs                   |   1 +
 src/App.tsx                            |  62 ++++++++++++-------
 src/components/ProfileChooserModal.tsx |  24 ++++++-
 src/stores/appStore.ts                 |   4 ++
 6 files changed, 177 insertions(+), 34 deletions(-)

Untracked files:
nul


```

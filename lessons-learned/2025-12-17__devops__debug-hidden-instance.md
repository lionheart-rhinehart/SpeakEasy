# debug-hidden-instance

**Date**: 2025-12-17
**Area**: devops
**Tags**: devops

## Summary
Debugged why new URL action types were not visible - killed hidden SpeakEasy instance from previous build that was blocking dev server startup

## Problem
Dev server kept exiting immediately with code 0 due to single-instance plugin detecting existing process

## Fix
Used taskkill to terminate hidden speakeasy.exe process running in system tray

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Untracked files:
.cursor/plans/webhookhotkey_urlactions_v2_79ad8bd8.plan.md


```

# fix-wrapup-slash-command

**Date**: 2025-12-15
**Area**: devops
**Tags**: devops

## Summary
Fixed wrapup slash command by moving it from .cursor/prompts to .cursor/commands

## Problem
Slash command /wrapup was not recognized by Cursor

## Fix
Moved wrapup.md to correct directory .cursor/commands/ where Cursor reads slash commands

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .cursor/prompts/wrapup.prompt       | 51 -------------------------------------
 README.md                           | 19 ++++++++++++++
 lessons-learned/README.md           |  3 ++-
 lessons-learned/index.json          | 17 +++++++++++--
 scripts/wrapup.mjs                  | 19 +++++++++-----
 src-tauri/src/commands.rs           | 50 ++++++++++++++++++++++++++++++------
 src-tauri/src/lib.rs                | 38 +++++++++++++++++++++++++++
 src/App.tsx                         | 16 ++++++++++--
 src/components/RecordingOverlay.tsx | 27 ++++++++++++++++++++
 9 files changed, 170 insertions(+), 70 deletions(-)

Untracked files:
.cursor/commands/wrapup.md


```

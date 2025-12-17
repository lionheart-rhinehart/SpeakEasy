# prompt-actions-hotkey-llm

**Date**: 2025-12-17
**Area**: feature
**Tags**: feature

## Summary
Added Prompt Actions feature for hotkey-triggered LLM transforms with stored prompts, bypassing webhooks and voice

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json      |   4 +-
 src-tauri/src/config.rs          |  16 +++
 src/App.tsx                      | 154 +++++++++++++++++++++++++--
 src/components/SettingsPanel.tsx | 220 ++++++++++++++++++++++++++++++++++++++-
 src/stores/appStore.ts           |  29 +++++-
 src/types/index.ts               |  22 ++++
 6 files changed, 432 insertions(+), 13 deletions(-)


```

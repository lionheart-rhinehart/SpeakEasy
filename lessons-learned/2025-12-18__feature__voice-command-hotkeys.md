# voice-command-hotkeys

**Date**: 2025-12-18
**Area**: feature
**Tags**: feature

## Summary
Added custom hotkey input component and voice command execution that speaks action names to trigger them immediately

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json      |  10 +-
 src-tauri/src/config.rs          |  17 ++
 src/App.tsx                      | 327 ++++++++++++++++++++++++++++++++++++++-
 src/components/MainWindow.tsx    |  22 +++
 src/components/SettingsPanel.tsx |  74 +++++++--
 src/stores/appStore.ts           |  47 ++++++
 src/types/index.ts               |  41 +++++
 7 files changed, 523 insertions(+), 15 deletions(-)

Untracked files:
nul
src/components/HotkeyInput.tsx
src/components/VoiceCommandButton.tsx
src/components/VoiceCommandModal.tsx
src/utils/fuzzyMatch.ts
src/utils/hotkeyValidation.ts


```

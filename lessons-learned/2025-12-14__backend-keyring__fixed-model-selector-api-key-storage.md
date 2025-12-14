# Fixed Model Selector API Key Storage

**Date**: 2025-12-14
**Area**: backend-keyring
**Tags**: backend-keyring

## Summary
Model selector wasn't working because API keys weren't persisting. Root cause: keyring crate missing windows-native feature flag in Cargo.toml. Also fixed silent error swallowing in get_api_key_status and added comprehensive logging. Added UI improvements: clear labels separating Whisper vs Transform keys, auto-refresh on dropdown focus with 30s cache, and better error messages.

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Staged changes:
 .claude/settings.json                              |   11 +
 .claude/settings.local.json                        |   38 +
 .claudeignore                                      |    9 +
 .cursor/commands/wrapup.md                         |    0
 .../bug_analysis_documentation_7189607e.plan.md    |  202 +
 .../create_wrapup_slash_command_52702428.plan.md   |   69 +
 .cursor/prompts/wrapup.prompt                      |    0
 .gitignore                                         |   32 +
 .temp-openai-key.md                                |    1 +
 New Text Document.txt                              |    0
 SpeakEasy_1.0.0_x64-setup - Shortcut.lnk           |  Bin 0 -> 1968 bytes
 TRANSFORM_FEATURE_PLAN.md                          |  222 +
 bug-analysis/README.md                             |  234 +
 .../01-language-parameter-inconsistency.md         |  322 +
 .../critical/02-fetchmodels-infinite-loop-risk.md  |  503 ++
 bug-analysis/low/05-unnecessary-usememo.md         |  319 +
 bug-analysis/low/06-clipboard-error-handling.md    |  514 ++
 .../low/07-recording-indicator-memory-leak.md      |  696 +++
 .../medium/03-ai-transform-cleanup-missing.md      |  474 ++
 .../medium/04-recording-overlay-race-condition.md  |  598 ++
 dev.bat                                            |    3 +
 eslint.config.js                                   |   35 +
 index.html                                         |   13 +
 .../2025-12-14-build-and-autostart-lessons.md      |   19 +
 ...eyring__fixed-model-selector-api-key-storage.md |  100 +
 .../2025-12-14__devops__add-wrapup-sop.md          |   16 +
 ...2025-12-14__devops__create-wrapup-sop-system.md |   99 +
 lessons-learned/README.md                          |   20 +
 lessons-learned/_template.md                       |   41 +
 overlay.html                                       |   23 +
 package-lock.json                                  | 4467 ++++++++++++++
 package.json                                       |   42 +
 plan/README.md                                     |    4 +
 plan/fix_tauri_build_cargo_error.md                |   40 +
 postcss.config.js                                  |    6 +
 public/speakeasy.svg                               |   21 +
 scripts/generate-icons.cjs                         |   96 +
 scripts/wrapup.mjs                                 |  837 +++
 speakeasy-srs.md                                   | 1661 +++++
 src-tauri/Cargo.lock                               | 6377 ++++++++++++++++++++
 src-tauri/Cargo.toml                               |   79 +
 src-tauri/build.rs                                 |    3 +
 src-tauri/capabilities/default.json                |   15 +
 src-tauri/gen/schemas/acl-manifests.json           |    1 +
 src-tauri/gen/schemas/capabilities.json            |    1 +
 src-tauri/gen/schemas/desktop-schema.json          | 2672 ++++++++
 src-tauri/gen/schemas/windows-schema.json          | 2672 ++++++++
 src-tauri/icons/128x128.png                        |  Bin 0 -> 4158 bytes
 src-tauri/icons/128x128@2x.png                     |  Bin 0 -> 4158 bytes
 src-tauri/icons/32x32.png                          |  Bin 0 -> 4158 bytes
 src-tauri/icons/icon.ico                           |  Bin 0 -> 4158 bytes
 src-tauri/icons/icon.png                           |  Bin 0 -> 4158 bytes
 src-tauri/resources/.gitkeep                       |    1 +
 src-tauri/src/audio.rs                             |  503 ++
 src-tauri/src/clipboard.rs                         |  453 ++
 src-tauri/src/commands.rs                          | 1053 ++++
 src-tauri/src/config.rs                            |  651 ++
 src-tauri/src/hotkeys.rs                           |  147 +
 src-tauri/src/lib.rs                               |  140 +
 src-tauri/src/llm.rs                               |  562 ++
 src-tauri/src/main.rs                              |    7 +
 src-tauri/src/secrets.rs                           |  229 +
 src-tauri/src/state.rs                             |   63 +
 src-tauri/src/transcription.rs                     |  642 ++
 src-tauri/tauri.conf.json                          |   71 +
 src/App.tsx                                        |  565 ++
 src/components/HistoryPanel.tsx                    |  135 +
 src/components/MainWindow.tsx                      |  263 +
 src/components/RecordingButton.tsx                 |  140 +
 src/components/RecordingIndicator.tsx              |   78 +
 src/components/RecordingOverlay.tsx                |  136 +
 src/components/SettingsPanel.tsx                   | 1165 ++++
 src/components/StatusIndicator.tsx                 |   88 +
 src/main.tsx                                       |   10 +
 src/overlay.tsx                                    |   10 +
 src/stores/appStore.ts                             |  240 +
 src/styles/index.css                               |   56 +
 src/types/index.ts                                 |  113 +
 tailwind.config.js                                 |   46 +
 tsconfig.json                                      |   25 +
 tsconfig.node.json                                 |   11 +
 vite.config.ts                                     |   42 +
 wrapup.bat                                         |    7 +
 83 files changed, 31259 insertions(+)


```

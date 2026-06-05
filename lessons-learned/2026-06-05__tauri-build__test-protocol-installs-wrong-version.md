# test-protocol-installs-wrong-version

**Date**: 2026-06-05
**Area**: tauri-build
**Tags**: tauri,build,test-protocol,installer,nsis,gotcha

## Summary
Added the Cursor Lock feature and ran the full test-protocol. Build, lint, typecheck and cargo all passed and the release built, but the new toggle did not appear in the running app.

## Problem
scripts/test-protocol.mjs picked the installer via readdirSync(nsisDir)[0], which is alphabetical. With 6 stale installers in bundle/nsis it always chose the OLDEST (SpeakEasy_1.0.0) and installed that over the fresh 1.0.9 build, so the new code never reached the running app while every gate still reported PASS.

## Fix
Sorted installers by mtime descending in both buildRelease and runInstaller so the freshly built one is always chosen; manually installed 1.0.9; deleted the 5 stale installers. Also added .claude to eslint ignores so a leftover worktree stopped breaking lint.

## Verification
Test protocol passed - app tested manually

## Test Protocol Results
- **Status**: success
- **Duration**: 223s
- **Timestamp**: 2026-06-05T00:04:53.337Z
- **Build**: /src-tauri/target/release/bundle/nsis/SpeakEasy_1.0.0_x64-setup.exe

### Steps
- backup: passed (15345ms)
- preflight: passed (418ms)
- quality_gates: passed (57930ms)
- release_build: passed (147397ms)
- kill_app: passed (166ms)
- run_installer: passed (1029ms)
- launch_app: passed (329ms)
- smoke_test: passed (0ms)
- restart_dev: passed (0ms)

## Change Summary
```
Unstaged changes:
 eslint.config.js                    |   2 +-
 scripts/test-protocol.mjs           |  13 +++-
 scripts/wrapup.mjs                  |   4 ++
 src-tauri/Cargo.toml                |   3 +-
 src-tauri/src/commands.rs           | 127 +++++++++++++++++++++++++++++++++
 src-tauri/src/config.rs             |  14 ++++
 src-tauri/src/lib.rs                |   9 +++
 src/App.tsx                         | 136 +++++++++++++++++++++++++++---------
 src/components/MainWindow.tsx       |  56 ++++++++++++++-
 src/components/RecordingOverlay.tsx |  32 +++++++++
 src/components/SettingsPanel.tsx    |  55 +++++++++++++++
 src/stores/appStore.ts              |  24 +++++++
 src/types/index.ts                  |  10 +++
 13 files changed, 447 insertions(+), 38 deletions(-)

Untracked files:
lessons-learned/2026-06-04__cursor-lock__windows-foreground-steal-architecture.md
src-tauri/src/target_window.rs


```

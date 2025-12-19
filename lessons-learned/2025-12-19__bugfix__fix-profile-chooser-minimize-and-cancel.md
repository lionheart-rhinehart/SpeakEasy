# fix-profile-chooser-minimize-and-cancel

**Date**: 2025-12-19
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed profile chooser not appearing when minimized and cancel button leaving app in loading state

## Problem
Profile chooser failed to show when window minimized; clicking cancel left spinner running because recordingState was not reset

## Fix
Added window.unminimize() call, 100ms timing delay for Windows message queue, and setRecordingState(idle) in cleanup useEffect

## Verification
Test protocol passed - app tested manually

## Test Protocol Results
- **Status**: success
- **Duration**: 84s
- **Timestamp**: 2025-12-19T21:13:58.227Z
- **Build**: /src-tauri/target/release/bundle/nsis/SpeakEasy_1.0.0_x64-setup.exe

### Steps
- preflight: passed (433ms)
- quality_gates: passed (0ms)
- release_build: passed (79806ms)
- kill_app: passed (153ms)
- run_installer: passed (1643ms)
- launch_app: passed (1588ms)
- restart_dev: passed (8ms)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json |  7 ++++++-
 src-tauri/src/commands.rs   |  6 ++++++
 src/App.tsx                 | 31 +++++++++++++++++++++++++++----
 3 files changed, 39 insertions(+), 5 deletions(-)


```

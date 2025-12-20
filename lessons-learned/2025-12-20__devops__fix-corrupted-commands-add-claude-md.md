# fix-corrupted-commands-add-claude-md

**Date**: 2025-12-20
**Area**: devops
**Tags**: devops

## Summary
Fixed corrupted .claude/commands folder and created CLAUDE.md with enforceable git safety rules

## Problem
Filesystem corruption of .claude/commands caused by ad-hoc git commands, plus safety rules in SOP docs were not being read by Claude

## Fix
Used chkdsk to repair filesystem corruption on reboot, recreated command files, and created CLAUDE.md which Claude reads at session start

## Verification
Test protocol passed - app tested manually

## Test Protocol Results
- **Status**: success
- **Duration**: 98s
- **Timestamp**: 2025-12-20T17:42:53.327Z
- **Build**: /src-tauri/target/release/bundle/nsis/SpeakEasy_1.0.0_x64-setup.exe

### Steps
- backup: passed (5135ms)
- preflight: passed (259ms)
- quality_gates: passed (32501ms)
- release_build: passed (56588ms)
- kill_app: passed (79ms)
- run_installer: passed (1500ms)
- launch_app: passed (1885ms)
- restart_dev: passed (4ms)

## Change Summary
```
Staged changes:
 .claude/settings.local.json        | 51 +---------------------
 .cursor/prompts/wrapup.prompt      | 51 ++++++++++++++++++++++
 src/components/StatusIndicator.tsx | 88 ++++++++++++++++++++++++++++++++++++++
 3 files changed, 140 insertions(+), 50 deletions(-)

Unstaged changes:
 .claude/settings.local.json        |  16 +++-
 .cursor/prompts/wrapup.prompt      |  51 ------------
 .gitignore                         |   6 ++
 SOP-docs/test-protocol-SOP.md      |  37 ++++++++-
 SOP-docs/wrapup-SOP.md             |  53 +++++++++++--
 scripts/test-protocol.mjs          | 155 ++++++++++++++++++++++++++++++++++++-
 scripts/wrapup.mjs                 | 130 +++++++++++++++++++++++++++++++
 src/components/StatusIndicator.tsx |  88 ---------------------
 8 files changed, 385 insertions(+), 151 deletions(-)

Untracked files:
.env.production
CLAUDE.md
beta-site-package.json.tmp


```

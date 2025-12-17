# chrome-profile-chooser-for-url-hotkeys

**Date**: 2025-12-17
**Area**: feature
**Tags**: feature

## Summary
Added Chrome profile chooser for URL hotkeys - when enabled, shows modal to pick which Chrome profile (Work/Personal/etc) to open the URL in

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.json              |  22 ++--
 .claude/settings.local.json        |   4 +-
 lessons-learned/README.md          |   3 +-
 lessons-learned/index.json         |  17 ++-
 src-tauri/src/commands.rs          | 212 +++++++++++++++++++++++++------------
 src-tauri/src/lib.rs               |  26 +----
 src/App.tsx                        | 124 ++++++++++++++++++----
 src/components/MainWindow.tsx      |   3 -
 src/components/SettingsPanel.tsx   |  36 +++----
 src/components/StatusBarWindow.tsx |  54 ----------
 src/components/StatusIndicator.tsx |  88 ---------------
 src/statusbar.tsx                  |  10 --
 src/stores/appStore.ts             |   1 -
 src/types/index.ts                 |  10 +-
 statusbar.html                     |  23 ----
 vite.config.ts                     |   1 -
 16 files changed, 303 insertions(+), 331 deletions(-)

Untracked files:
.claude/commands/wrapup.md
.cursor/plans/gmail_hotkey_chromeprofiles_89f3613a.plan.md
.cursor/plans/webhookhotkey_urlactions_v2_79ad8bd8.plan.md
lessons-learned/2025-12-17__devops__debug-hidden-instance.md
src/components/ProfileChooserModal.tsx


```

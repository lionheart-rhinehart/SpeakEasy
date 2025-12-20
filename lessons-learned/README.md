# Lessons Learned Index

This directory contains lessons learned from development sessions.
Updated: 2025-12-20T18:25:58.465Z

## Entries

| Date | Area | Title |
|------|------|-------|
| 2025-12-20 | frontend | [settings panel ux improvements](2025-12-20__frontend__settings-panel-ux-improvements.md) |
| 2025-12-20 | frontend | [defer settings api calls](2025-12-20__frontend__defer-settings-api-calls.md) |
| 2025-12-20 | feature | [beta readiness licensing updates docs](2025-12-20__feature__beta-readiness-licensing-updates-docs.md) |
| 2025-12-20 | feature | [beta readiness license updates docs](2025-12-20__feature__beta-readiness-license-updates-docs.md) |
| 2025-12-20 | devops | [fix corrupted commands add claude md](2025-12-20__devops__fix-corrupted-commands-add-claude-md.md) |
| 2025-12-19 | frontend | [settings ui cleanup collapsible sections](2025-12-19__frontend__settings-ui-cleanup-collapsible-sections.md) |
| 2025-12-19 | bugfix | [fix profile chooser minimize and cancel](2025-12-19__bugfix__fix-profile-chooser-minimize-and-cancel.md) |
| 2025-12-18 | feature | [voice command hotkeys](2025-12-18__feature__voice-command-hotkeys.md) |
| 2025-12-18 | feature | [fix chrome profile chooser](2025-12-18__feature__fix-chrome-profile-chooser.md) |
| 2025-12-18 | docs | [macos port plan](2025-12-18__docs__macos-port-plan.md) |
| 2025-12-18 | devops | [split wrapup test protocol](2025-12-18__devops__split-wrapup-test-protocol.md) |
| 2025-12-18 | devops | [optimize wrapup workflow](2025-12-18__devops__optimize-wrapup-workflow.md) |
| 2025-12-18 | devops | [nsis delete old shortcut](2025-12-18__devops__nsis-delete-old-shortcut.md) |
| 2025-12-18 | bugfix | [fix voice command fuzzy match](2025-12-18__bugfix__fix-voice-command-fuzzy-match.md) |
| 2025-12-18 | bugfix | [fix profile chooser topmost](2025-12-18__bugfix__fix-profile-chooser-topmost.md) |
| 2025-12-18 | bugfix | [fix profile chooser topmost window](2025-12-18__bugfix__fix-profile-chooser-topmost-window.md) |
| 2025-12-17 | feature | [webhook url actions](2025-12-17__feature__webhook-url-actions.md) |
| 2025-12-17 | feature | [unify prompt action dropdown](2025-12-17__feature__unify-prompt-action-dropdown.md) |
| 2025-12-17 | feature | [prompt actions hotkey llm](2025-12-17__feature__prompt-actions-hotkey-llm.md) |
| 2025-12-17 | feature | [file based settings persistence](2025-12-17__feature__file-based-settings-persistence.md) |
| 2025-12-17 | feature | [chrome profile chooser for url hotkeys](2025-12-17__feature__chrome-profile-chooser-for-url-hotkeys.md) |
| 2025-12-17 | devops | [debug hidden instance](2025-12-17__devops__debug-hidden-instance.md) |
| 2025-12-17 | bugfix | [fix profile chooser zorder](2025-12-17__bugfix__fix-profile-chooser-zorder.md) |
| 2025-12-17 | bugfix | [fix overlay zorder subclassing](2025-12-17__bugfix__fix-overlay-zorder-subclassing.md) |
| 2025-12-17 | bugfix | [fix claude code notification hooks](2025-12-17__bugfix__fix-claude-code-notification-hooks.md) |
| 2025-12-16 | fix | [duplicate process single instance](2025-12-16__fix__duplicate-process-single-instance.md) |
| 2025-12-16 | feature | [implement always on top status bar](2025-12-16__feature__implement-always-on-top-status-bar.md) |
| 2025-12-16 | bugfix | [fix duplicate process single instance](2025-12-16__bugfix__fix-duplicate-process-single-instance.md) |
| 2025-12-15 | devops | [fix wrapup slash command](2025-12-15__devops__fix-wrapup-slash-command.md) |
| 2025-12-15 | devops | [enhance wrapup auto restart search](2025-12-15__devops__enhance-wrapup-auto-restart-search.md) |
| 2025-12-14 | devops | [create wrapup sop system](2025-12-14__devops__create-wrapup-sop-system.md) |
| 2025-12-14 | devops | [add wrapup sop](2025-12-14__devops__add-wrapup-sop.md) |
| 2025-12-14 | devops | [add strict rust checking](2025-12-14__devops__add-strict-rust-checking.md) |
| 2025-12-14 | devops | [add dev restart and json index](2025-12-14__devops__add-dev-restart-and-json-index.md) |
| 2025-12-14 | backend-keyring | [fixed model selector api key storage](2025-12-14__backend-keyring__fixed-model-selector-api-key-storage.md) |
| 2025-12-14 | backend-keyring | [fixed model selector api key storage and git setup](2025-12-14__backend-keyring__fixed-model-selector-api-key-storage-and-git-setup.md) |
| - | - | [2025-12-14-build-and-autostart-lessons.md](2025-12-14-build-and-autostart-lessons.md) |

## How to add entries

Run `npm run wrapup` at the end of each task to automatically generate entries.

Or manually create files following the naming convention:
`YYYY-MM-DD__area__short-title.md`

## Search

To search lessons learned programmatically, use the [`index.json`](index.json) file or run:
```
npm run lessons:search "<query>"
```

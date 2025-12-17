# Lessons Learned Index

This directory contains lessons learned from development sessions.
Updated: 2025-12-17T18:21:56.034Z

## Entries

| Date | Area | Title |
|------|------|-------|
| 2025-12-17 | feature | [webhook url actions](2025-12-17__feature__webhook-url-actions.md) |
| 2025-12-17 | feature | [file based settings persistence](2025-12-17__feature__file-based-settings-persistence.md) |
| 2025-12-17 | feature | [chrome profile chooser for url hotkeys](2025-12-17__feature__chrome-profile-chooser-for-url-hotkeys.md) |
| 2025-12-17 | devops | [debug hidden instance](2025-12-17__devops__debug-hidden-instance.md) |
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

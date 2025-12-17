# fix-profile-chooser-zorder

**Date**: 2025-12-17
**Area**: bugfix
**Tags**: bugfix

## Summary
Fixed Chrome profile chooser modal appearing behind other windows by bringing main window to foreground when showing the modal

## Verification
Quality gates passed (lint, typecheck, build)

## Change Summary
```
Unstaged changes:
 .claude/settings.local.json | 3 ++-
 src/App.tsx                 | 7 +++++++
 2 files changed, 9 insertions(+), 1 deletion(-)

Untracked files:
nul


```

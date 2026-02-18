# Workflow Development Log

> Project: SpeakEasy
> Created: 2026-02-11
> Framework: High Level Vibing

---

## Current Status

**Last Updated:** 2026-02-18

### Active Work
| Item | Status | Notes |
|------|--------|-------|
| (none) | | |

### Recently Completed
- 2026-02-18: Fixed AI Transform silent error handling — errors now show toast notifications
- 2026-02-18: Fixed BUG-003 early release cleanup — quick-tap no longer gets stuck
- 2026-02-18: Fixed Vite multi-page build — extracted inline CSS from HTML entry points
- 2026-02-11: Connected /test-protocol command to project-level Tauri build/install/launch script
- 2026-02-11: Fixed hotkey actions edit form accessibility and list scrolling (5 interacting bugs)

### Blockers
- None

---

## Sessions

### 2026-02-18 - Session Complete

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Add showToast to all AI Transform error paths | App used showToast in 30+ places but AI Transform handler had none — all errors were console-only | 2026-02-18 |
| Extract inline CSS to shared file | Vite html-inline-proxy can't handle inline styles in multi-page builds | 2026-02-18 |
| Fix BUG-003 while in the handler | Already editing the same useEffect, minimal extra risk | 2026-02-18 |

**Files Modified:**
- Edited: `src/App.tsx` (AI Transform error handling, BUG-003 cleanup, useEffect deps)
- Edited: `overlay.html` (extracted inline CSS)
- Edited: `voice-review.html` (extracted inline CSS)
- Edited: `profile-chooser.html` (extracted inline CSS)
- Created: `src/styles/transparent-window.css` (shared transparent window base styles)
- Created: `lessons-learned/2026-02-18__bugfix__fix-ai-transform-silent-errors-and-vite-build.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| AI Transform errors only logged to console, user saw nothing | Added showToast with error-type-specific messages + history entries |
| Early release (<300ms) left app stuck in recording mode (BUG-003) | Added state cleanup (reset refs, hide overlay, set idle) before early return |
| Vite production build failed on html-inline-proxy | Extracted inline `<style>` to external `transparent-window.css` |

**Commands Run:**
- /test-protocol (PASS)
- /wrapup

### 2026-02-11 - Session Complete

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Clear isAddingWebhook on edit click | State conflict silently blocked edit form rendering | 2026-02-11 |
| max-h-[320px] for hotkey list | Shows ~4-5 items before scroll, balances visibility and space | 2026-02-11 |
| Conditional overflow-hidden via isAnimating timer | Preserves collapse animation while enabling inner scroll when expanded | 2026-02-11 |

**Files Modified:**
- Edited: `src/components/SettingsPanel.tsx` (state fixes, scrollable list, scrollIntoView)
- Edited: `src/components/CollapsibleSection.tsx` (conditional overflow-hidden)
- Created: `docs/lessons-learned/2026-02-11__frontend__hotkey-edit-state-and-scroll-bugs.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Edit button didn't clear isAddingWebhook, silently blocking edit form | Added setIsAddingWebhook(false) to edit onClick |
| No auto-scroll to edit form when opened | Added editFormRef + useEffect with scrollIntoView |
| Hotkey list grew unbounded | Added max-h-[320px] overflow-y-auto |
| CollapsibleSection overflow-hidden blocked inner scroll | Made overflow-hidden conditional (only during 300ms animation) |
| Helper functions had incomplete state clearing | Added full state resets to updateWebhookAction and deleteWebhookAction |

**Commands Run:**
- /test-protocol (PASS)
- /wrapup

### 2026-02-11 - Session 2 Complete

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Point command to `npm run test-protocol` | Project-level script has full Tauri build/install/launch; generic one only has quality gates | 2026-02-11 |

**Files Modified:**
- Edited: `.claude/commands/test-protocol.md` (rewrote to reference project-level Tauri script)
- Created: `docs/lessons-learned/2026-02-11__devops__test-protocol-command-resolution.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| /test-protocol ran generic quality gates instead of Tauri build/install/launch | Updated command to run `npm run test-protocol` (project-level script) |

**Commands Run:**
- /unlock-commands
- /lock-all
- /wrapup

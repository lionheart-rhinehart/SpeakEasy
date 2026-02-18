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
- 2026-02-18: Bulletproof admin license persistence — triple redundancy (state + marker + keychain)
- 2026-02-18: Toast on hotkey registration failure — all 3 hotkeys now show errors visibly
- 2026-02-18: Added coding rules to CLAUDE.md — error visibility, offline-first, change verification
- 2026-02-18: Added smoke test checklist to test-protocol — manual verification step after install
- 2026-02-18: Fixed AI Transform silent error handling — errors now show toast notifications

### Blockers
- None

---

## Sessions

### 2026-02-18 - Session Complete (License + Guardrails)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Triple redundancy for admin status | Single point of failure (state file) kept getting wiped by re-activation | 2026-02-18 |
| Toast on hotkey registration failure | Same silent-error bug class as AI Transform — grep'd codebase for pattern | 2026-02-18 |
| Add coding rules to CLAUDE.md | Codify "no silent errors" rule to prevent recurrence | 2026-02-18 |
| Add smoke test checklist to test-protocol | Make manual verification explicit and visible in pipeline | 2026-02-18 |

**Files Modified:**
- Edited: `src-tauri/src/license.rs` (admin marker file, preserve admin in activate_license, triple-check in validate_license)
- Edited: `src/App.tsx` (showToast on 3 hotkey registration catch blocks, voice command useEffect deps)
- Edited: `CLAUDE.md` (coding rules section)
- Edited: `scripts/test-protocol.mjs` (smoke test checklist step)
- Created: `lessons-learned/2026-02-18__devops__bulletproof-admin-license-and-process-guardrails.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| `activate_license()` hardcoded `is_admin: false` — wiped admin on re-activation | Read existing state + marker file before creating new state |
| Admin status had single point of failure (state file) | Added `.admin` marker file + keychain check as redundant sources |
| All 3 hotkey registrations silently swallowed failures | Added showToast to all 3 catch blocks |
| ESLint caught missing dependency after adding toast | Added `showToast` to voice command useEffect dependency array |

**Commands Run:**
- /test-protocol (PASS — all 9 steps including new smoke test)
- /wrapup

---

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

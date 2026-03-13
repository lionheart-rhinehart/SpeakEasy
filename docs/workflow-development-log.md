# Workflow Development Log

> Project: SpeakEasy
> Created: 2026-02-11
> Framework: High Level Vibing

---

## Current Status

**Last Updated:** 2026-03-13

### Active Work
| Item | Status | Notes |
|------|--------|-------|
| Send Ivan v1.0.1 installer | Next | From GitHub Release (not local build) |

### Recently Completed
- 2026-03-13: Fixed CI — added frontend build step to Single Instance Process Test workflow
- 2026-03-13: Tagged v1.0.2 and pushed — ships diagnostics via auto-update
- 2026-03-13: Auto-diagnostic reporting — WARN/ERROR logs auto-upload to Supabase on startup
- 2026-03-13: Added file logging (tauri-plugin-log) — logs to %LOCALAPPDATA%\com.speakeasy.app\logs\
- 2026-03-13: Enabled auto-updates — signing keys, pubkey, GitHub Secrets configured
- 2026-03-13: Fixed update error visibility — timeout + toast on failure
- 2026-03-13: Bumped version to 1.0.1 across all config files

### Blockers
- None

---

## Sessions

### 2026-03-13 - Session Complete (CI Fix: Single Instance Process Test)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Add `npm run build` before `cargo build` in CI | Tauri's `generate_context!()` macro requires frontend dist at compile time | 2026-03-13 |

**Files Modified:**
- Edited: `.github/workflows/process-count-test.yml`
- Created: `docs/lessons-learned/2026-03-13__devops__tauri-ci-missing-frontend-build.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Single Instance Process Test failing on every push — `frontendDist "../dist"` path doesn't exist | Added `npm run build` step before `cargo build` in workflow |

---

### 2026-03-13 - Session Complete (Auto-Diagnostic Reporting)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Auto-report errors to Supabase (Option B) | Better than manual log collection, uses existing Supabase infra | 2026-03-13 |
| Cursor-based deduplication | Simple file-based tracking, no DB state needed | 2026-03-13 |
| Filter ][WARN]/][ERROR] only | Privacy + payload size + signal-to-noise | 2026-03-13 |
| Fire-and-forget tokio::spawn with 5s delay | Non-blocking startup, captures startup errors | 2026-03-13 |

**Files Modified:**
- Created: `src-tauri/src/diagnostics.rs`, `supabase/migrations/003_diagnostic_logs.sql`
- Edited: `src-tauri/src/lib.rs`, `src-tauri/src/commands.rs`, `.gitignore`
- Supabase: Applied migration via MCP tool (diagnostic_logs table + RLS)

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Supabase MCP rejected `project_id` param | Omit it — the MCP server infers the project automatically |

---

### 2026-03-13 - Session Complete (Auto-Updates + File Logging)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Replace env_logger with tauri-plugin-log | env_logger only writes to stderr, invisible on Windows GUI apps — need disk logs for remote debugging | 2026-03-13 |
| Keep Tauri instead of converting to web app | Global hotkeys not possible in web apps — core feature requirement | 2026-03-13 |
| Register log plugin FIRST in builder chain | Captures all startup logs including single-instance and autostart init | 2026-03-13 |
| v1.0.1 is last manual install | v1.0.0 has empty pubkey, can't verify signed updates — bootstrap cost | 2026-03-13 |

**Files Modified:**
- Edited: `src-tauri/Cargo.toml` (swap env_logger→tauri-plugin-log, version bump)
- Edited: `src-tauri/src/main.rs` (remove env_logger::init())
- Edited: `src-tauri/src/lib.rs` (add tauri-plugin-log as first plugin, startup log)
- Edited: `src-tauri/tauri.conf.json` (set updater pubkey, version bump)
- Edited: `package.json` (version bump)
- Edited: `src/App.tsx` (update handler timeout + error toast)
- Auto-generated: `src-tauri/Cargo.lock`, `src-tauri/gen/schemas/*`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Double-logger panic (env_logger + tauri-plugin-log both call set_boxed_logger) | Remove env_logger entirely — only one logger backend allowed |
| Log file 0 bytes after 8s — old single-instance process intercepting launches | Kill old process with PowerShell Stop-Process before launching new build |
| Beta tester can't auto-update from v1.0.0 (empty pubkey) | Accept one-time manual install of v1.0.1 which has the pubkey |

---

### 2026-03-11 - Session Complete (Voice Command Hotkey Race Condition Fix)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Read volatile state from `useAppStore.getState()` instead of closures | Prevents callback recreation between press/release, stopping hotkey re-registration race | 2026-03-11 |
| Added ref safety layer for hotkey callbacks | Belt-and-suspenders: even if callbacks change, hotkey handler always uses latest via refs | 2026-03-11 |
| Switched voice command to toggle mode (press-to-start, press-to-stop) | More reliable than press-and-hold — eliminates dependency on Released events which can be unreliable on Windows | 2026-03-11 |
| Added 120s globalBusy timeout | Safety net to auto-recover from any stuck state without requiring app restart | 2026-03-11 |

**Files Modified:**
- Edited: `src/App.tsx` (stabilized callbacks, ref safety layer, toggle mode, early release cleanup, globalBusy timeout)

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Voice command hotkey broke after Windows update — Released event lost between Press/Release due to hotkey re-registration | Stabilized callback deps by reading from store + ref safety layer to decouple hotkey lifecycle from callback changes |
| Early release (<200ms) left globalBusy stuck forever | Added full cleanup including Rust-side stop_recording in early release path |
| Manual voice command button had same stale closure issue | Applied same ref + store read pattern |
| No recovery from stuck globalBusy state | Added 120s timeout that auto-resets when not actively recording |
| Windows sends spurious immediate Released events for some hotkey combos | Switched to toggle mode — press once to start, press again to stop |

**Commands Run:**
- /test-protocol (3 runs: lint fix, quality gates, full build+install+launch)
- /wrapup

---

### 2026-02-19 - Session Complete (Clipboard Contamination + Stuck Spinner Fix)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Per-hotkey `requiresSelection` toggle instead of system-wide | Some hotkeys need selected text, others run standalone | 2026-02-19 |
| Stale clipboard detection (before/after compare) in frontend | Backend `get_selected_text` exists but frontend approach is more transparent | 2026-02-19 |
| Explicit `setRecordingState("idle")` on all error paths | `addTranscription()` side effect only covers success paths | 2026-02-19 |
| 90s frontend timeout on LLM calls | Backend 60s timeout may not propagate; frontend waited forever | 2026-02-19 |
| Click-to-cancel on RecordingButton during processing | Previously disabled with no recovery — required app restart | 2026-02-19 |

**Files Modified:**
- Edited: `src/types/index.ts` (added `requiresSelection` to 4 interfaces)
- Edited: `src-tauri/src/config.rs` (added `requires_selection` to 2 Rust structs)
- Edited: `src/stores/appStore.ts` (updated 4 converter functions)
- Edited: `src-tauri/src/llm.rs` (empty inputText handling in 3 providers)
- Edited: `src/App.tsx` (stale detection, standalone mode, 7 state resets, timeout, execution guard, voice cancel fix)
- Edited: `src/components/RecordingButton.tsx` (click-to-cancel recovery when processing)
- Edited: `src/components/SettingsPanel.tsx` (requiresSelection checkbox in both form variants)
- Created: `docs/lessons-learned/2026-02-19__frontend__clipboard-contamination-and-stuck-spinner.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Old transcription text contaminates prompt action output | Stale clipboard detection (before/after) + per-hotkey requiresSelection toggle |
| 6+ error paths leave recordingState stuck at "processing" | Added explicit setRecordingState("idle") to all error/cancel paths |
| No recovery when spinner gets stuck | RecordingButton now clickable during processing (X icon, click to cancel) |
| Rapid hotkey presses cause parallel prompt execution | Added promptActionBusy ref guard |
| handleVoiceCommandCancel missing state resets | Added globalBusy, voiceCommandListening, recordingState, hide_recording_overlay resets |
| LLM backend produces confusing format with empty inputText | Conditional: empty inputText sends instruction only, not "Text to transform:\n\n\n\n" |

**Commands Run:**
- /test-protocol --skip-backup (PASS — lint, typecheck, build, rust check)
- /wrapup

### 2026-02-18 - Session Complete (Hotkey Stability + o3-mini Fix)

**Status:** Completed

**Decisions:**
| Decision | Rationale | Date |
|----------|-----------|------|
| Fix dev server detection with WMIC command-line matching | Broad `node.exe` check always true due to Claude Code/script processes | 2026-02-18 |
| Kill dev server in killRunningApp | Prevents hotkey conflicts between installed app and dev server | 2026-02-18 |
| Conditional OpenAI body for reasoning models | o3-mini requires `max_completion_tokens` instead of `max_tokens` | 2026-02-18 |
| Add toasts to recording start catch blocks | Same silent-error bug class found in third location | 2026-02-18 |

**Files Modified:**
- Edited: `scripts/test-protocol.mjs` (WMIC-based dev server detection, dev server kill in killRunningApp)
- Edited: `src-tauri/src/llm.rs` (conditional body for reasoning models — o1*, o3*)
- Edited: `src/App.tsx` (toasts + state reset for recording start failures)
- Created: `lessons-learned/2026-02-18__devops__phantom-dev-server-and-silent-recording-failures.md`

**Problems & Solutions:**
| Problem | Solution |
|---------|----------|
| Hotkeys intermittently fail ~3 min after rebuild | Test-protocol falsely detected node.exe → always spawned dev server → hotkey conflicts |
| OpenAI o3-mini rejects `max_tokens` parameter | Detect reasoning model prefix (o1*, o3*), use `max_completion_tokens`, omit `temperature` |
| Recording start failures invisible to user | Added showToast + state reset to catch blocks at lines 294 and 498 |

**Commands Run:**
- /test-protocol --skip-backup --no-restart (PASS — all 9 steps, no dev server spawned)
- /wrapup

---

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

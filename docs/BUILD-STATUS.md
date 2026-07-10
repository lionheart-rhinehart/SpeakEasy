# SpeakEasy — Build Status (cross-chat ledger)

> **This is the single source of truth for "what's done" across chats.** The per-session `.active-plan.<session_id>.json` is a within-chat foreman only (git-ignored, session-scoped) — it is NOT this. **Every chat: read this file first, update it last, then commit/push.**
>
> Source: `docs/MASTER-PLAN.md` §12 (checklist) + §13 (execution model). Status = `todo` | `in-progress` | `blocked` | `done`.
>
> _Seeded 2026-07-08._

## Execution model (from §13)
**Mode: serial CORE + parallel side-tracks.**
- **`feature/core`** (ONE serial chat — owns the god-files `App.tsx`/`llm.rs`/`commands.rs`/`secrets.rs`/`config.rs`/`appStore.ts`/`types`): Track A structural foundation → Track B providers.
- **`feature/license`** (parallel): license schema + updater channel (Track C).
- **`feature/brand`** (parallel): brand-library scaffolding (Track D) — pauses only for the final `getAllActions()` wiring until CORE lands.
- **Phase 0** (independent, start now): signing enrollment + legal docs.

**Rules:** honor the `Depends on` column as law; mark an item `in-progress` with your branch before starting so a parallel chat doesn't grab it; never edit a god-file from two chats at once; commit/push at every chat boundary.

## Ledger

| id | Track / branch | Status | Evidence | Chat-date |
|----|----------------|--------|----------|-----------|
| **S0a** Decision Log | Step 0 | **done** | `docs/DECISION-LOG.md` written (D1–D11, from the real conversation) | 2026-07-08 |
| **S0b** Master plan → repo | Step 0 | **done** | `docs/MASTER-PLAN.md` written | 2026-07-08 |
| **S0c** Build-status ledger | Step 0 | **done** | this file | 2026-07-08 |
| **P0-sign** Azure Trusted Signing enrollment | Phase 0 (indep.) | todo | | |
| **P0-legal** EULA + privacy policy | Phase 0 (indep.) | todo | | |
| **P0-clip** Fix webhook clipboard-guard bug (App.tsx:1266-1289) | Phase 0 → `feature/core` | **done (code)** | Ported before-snapshot + 150ms + `=== clipboardBefore` guard into WEBHOOK branch (App.tsx:1266-1291) AND the identical-bug SMART_URL branch (App.tsx:1061-1081); `npm run typecheck` clean. Runtime "no POST fires" is owner manual smoke (§8) on the now-running build. Release build+install+launch ✓ (test-protocol exit 0, SpeakEasy_1.0.9). | 2026-07-10 |
| **P0-bugs** Re-verify Dec-2025 7-bug list | Phase 0 | todo | | |
| **P0-logscrub** No doc bodies / keys in logs (audit) | Phase 0 | todo | | |
| **P1-action** Unified `Action{kind}` + per-kind executor | A / `feature/core` | **done (code)** | New `Action{kind}` type (types/index.ts) + mappers (src/utils/actions.ts); single `executeAction()` dispatch replaces shape-sniffing at all 3 voice sites; unified reg loop; `getAllActions()`→`Action[]`. Persistence stays 2-array (collapse deferred to P1-migrate per deps). typecheck+lint+`cargo check --all-targets` clean. **Release build+install+launch ✓ (test-protocol exit 0)** — app boots, no white-screen from the hook-graph rewrite. | 2026-07-10 |
| **P1-action-voice** Voice matcher intact post-refactor | A / `feature/core` | in-progress | `getAllActions()` returns mains + all enabled unified actions (code-verified); app boots ✓. Spoken-command match+execute is owner manual smoke on the running build. | 2026-07-10 |
| **P1-provfield** Per-action `provider`/`model` fields | A / `feature/core` | **done (schema+routing)** | Optional `provider`/`model` added to `WebhookAction`+`PromptAction` (TS), `File*` interfaces, Rust `config.rs` structs (additive `#[serde(default)]` → round-trip-safe, no two-sided drop), all 4 convert fns, both mappers. Fallback routing wired at both LLM sites (App.tsx executePromptAction + webhook PROMPT branch): `action.provider ?? global`, `action.model ?? global`. typecheck+lint+`npm run build`+`cargo check` clean. **Deferred to Track B:** the authoring UI (per-action provider dropdown belongs with `PROVIDER_INFO` / the provider selector added in P1-poe/P1-genesis; only meaningful once >1 provider). Runtime route-smoke needs that UI. Release build+install+launch ✓ (test-protocol exit 0). | 2026-07-10 |
| **P1-migrate** `SETTINGS_SCHEMA_VERSION`→3 + forward migration | A / `feature/core` | todo | dep: P1-action, P1-provfield | |
| **P1-migrate-rust** Rust load preserves old action shape | A / `feature/core` | todo | | |
| **P1-txfactor** Widen `llm::transform()` for optional 2nd key | B / `feature/core` | todo | | |
| **P1-poe** Add Poe provider (single key) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis** Add Genesis provider (two-key, model=slug) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis-long** Long Genesis gen doesn't time out (SSE, ~300s) | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-genesis-busy** Genesis concurrency → "still working" toast, not 429 | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-license** License schema (platform-neutral machine_id, license, activations) | C / `feature/license` | todo | | |
| **P1-license-compat** Existing beta activation still validates | C / `feature/license` | todo | dep: P1-license | |
| **P1-updater** Version-channel updater + entitlement | C / `feature/license` | todo | dep: P1-license | |
| **P1-updater-repoint** Repoint updater to versioned channel IN v1 build | C / `feature/license` | todo | dep: P1-license | |
| **P1-ingest** Brand ingestion spike (webview file input + FileReader) | D / `feature/brand` | todo | | |
| **P1-store** Brand storage commands (list/save/load/delete_brand_doc) | D / `feature/brand` | todo | dep: P1-ingest | |
| **P1-paste0** Zero-key brand paste (click/hotkey) | D / `feature/brand` (wiring waits on P1-action) | todo | dep: P1-store | |
| **P1-pastevoice** Voice brand paste | D / `feature/brand` (wiring waits on P1-action) | todo | dep: P1-store | |
| **P1-installer** Signed installer (no SmartScreen block) | Phase 1 | todo | dep: P0-sign | |
| **P1-license-issue** Issue a manual founding-five license | Phase 1 | todo | dep: P1-license | |

## UNRESOLVED (verify before relying on)
- **Poe `GET /models`** shape — verify at P1-poe; fallback = curated list.
- **Poe private org bots** — verify a member's own key can call the org's bots by handle *before* marketing "connect your Poe."
- **Mac runtime testing** — no test machine chosen; blocks Phase 4 only.

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
| **P0-clip** Fix webhook clipboard-guard bug (App.tsx:1266-1289) | Phase 0 → `feature/core` | todo | | |
| **P0-bugs** Re-verify Dec-2025 7-bug list | Phase 0 | todo | | |
| **P0-logscrub** No doc bodies / keys in logs (audit) | Phase 0 | todo | | |
| **P1-action** Unified `Action{kind}` + per-kind executor | A / `feature/core` | todo | | |
| **P1-action-voice** Voice matcher intact post-refactor | A / `feature/core` | todo | dep: P1-action | |
| **P1-provfield** Per-action `provider`/`model` fields | A / `feature/core` | todo | dep: P1-action | |
| **P1-migrate** `SETTINGS_SCHEMA_VERSION`→3 + forward migration | A / `feature/core` | todo | dep: P1-action, P1-provfield | |
| **P1-migrate-rust** Rust load preserves old action shape | A / `feature/core` | todo | | |
| **P1-txfactor** Widen `llm::transform()` for optional 2nd key | B / `feature/core` | todo | | |
| **P1-poe** Add Poe provider (single key) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis** Add Genesis provider (two-key, model=slug) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis-long** Long Genesis gen doesn't time out (SSE, ~300s) | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-genesis-busy** Genesis concurrency → "still working" toast, not 429 | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-license** License schema (platform-neutral machine_id, license, activations) | C / `feature/license` | **done (code); Supabase apply owner-gated** | `license.rs`: platform-neutral `resolve_platform_machine_id()` seam (keeps `win-<hash>` byte-identical) + `version_entitlement`/`tier`/`trial_expires_at` on `LicenseState`, read from the licenses row on activate+validate; `get_version_entitlement()` accessor. Schema migration `supabase/migrations/004_license_entitlement_schema.sql` (additive `ADD COLUMN IF NOT EXISTS`, `version_entitlement NOT NULL DEFAULT '1'` backfill). `cargo test license` = **7 passed** (warm cache, into main target). Robust to migration ordering: license lookups use `select=*`, so activation/validation work whether or not 004 is applied (columns absent → default to v1). **FOLLOW-UP (owner, non-blocking):** apply 004 in Supabase SQL Editor to enable granting >v1 entitlement + recording tier/trial — MCP auth unavailable this session so it isn't applied yet; the app functions correctly without it (everyone treated as v1). | 2026-07-10 |
| **P1-license-compat** Existing beta activation still validates | C / `feature/license` | **done** | Migration is additive-only + backfills existing rows to `'1'` (no lockout). Tests: `test_legacy_license_state_deserializes` (pre-entitlement `license.json` loads, entitlement→"1"), `test_machine_id_platform_prefix_compat` (`win-` prefix stable across the provider refactor), roundtrip — all green in the 7-pass run. Live "beta activation validates green" is owner smoke after 004 is applied. | 2026-07-10 |
| **P1-updater** Version-channel updater + entitlement | C / `feature/license` | **done (code); runtime smoke pending release** | Runtime gate = channel separation (see P1-updater-repoint); entitlement recorded via `version_entitlement` (schema + `LicenseState` + `get_version_entitlement()`), refreshed from server on validate. Architecture + legacy-client migration trap logged as **DECISION-LOG D12**. "v2 `latest.json` doesn't prompt a v1 client" follows from the channel design; a live updater smoke needs a built installer + release (owner). | 2026-07-10 |
| **P1-updater-repoint** Repoint updater to versioned channel IN v1 build | C / `feature/license` | **done** | `tauri.conf.json` endpoint → `…/releases/download/updater-v1/latest.json` (contains version segment, no bare `latest`). `release.yml` now also publishes the manifest to a stable `updater-v${MAJOR}` channel release (`gh release create --latest=false` + `--clobber` upload) so the new endpoint resolves instead of 404ing. | 2026-07-10 |
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

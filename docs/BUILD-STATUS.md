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
| **P1-migrate** `SETTINGS_SCHEMA_VERSION`→3 + forward migration | A / `feature/core` | **done** | `SETTINGS_SCHEMA_VERSION` 2→3 (types/index.ts); persisted schema collapses the two legacy arrays into ONE unified `actions[]` at the persistence boundary — pure collapse/expand fns in `src/utils/actions.ts` (`arraysToFileActions`/`fileActionsToArrays`; `method` presence = webhook-vs-prompt origin), wired into appStore `convertSettingsTo{Snake,Camel}Case` (save writes `actions[]`; load expands `actions[]` OR falls back to legacy arrays for old v2 configs → next save rewrites unified). In-memory two-array model kept (P1-action's split) → App.tsx/SettingsPanel/hotkeyValidation untouched. v2→v3 branch added in `migrateSettings()`. **Added vitest** (`npm test`); `src/utils/actions.migrate.test.ts` = **6/6 pass**, incl. a run against the OWNER'S REAL config: **"migrated 46 actions (46 webhook + 0 prompt) with zero loss"** (identical count + ids). typecheck+lint clean. | 2026-07-14 |
| **P1-migrate-rust** Rust load preserves old action shape | A / `feature/core` | **done** | Added `Action` struct + `#[serde(default)] actions: Vec<Action>` to `config.rs` UserSettings; kept `webhook_actions`/`prompt_actions` `#[serde(default)]` (superset reader → old configs never default-dropped) with `skip_serializing_if="Vec::is_empty"` so migrated configs collapse to just `actions[]` on disk. All `Action` fields `#[serde(default)]` so a partial entry can't fail the whole parse (which would wipe ALL settings via `unwrap_or_default`). `cargo test config` = **17 passed** incl. new `test_legacy_v2_config_preserves_all_actions` (3 webhook + 1 prompt survive), `test_v3_config_reads_unified_actions`, `test_v3_save_omits_empty_legacy_arrays`. No Rust logic reads the legacy arrays (pass-through only) so emptying them on v3 is safe. | 2026-07-14 |
| **P1-txfactor** Widen `llm::transform()` for optional 2nd key | B / `feature/core` | **done** | Widened `transform()` (llm.rs:186) + all 3 arms to take `api_key_2: Option<&str>` (existing arms `_api_key_2`, unused — threaded as the seam for two-key Genesis); caller `transform_with_llm` (commands.rs) passes `None`. Byte-identical arm bodies → provably no behavior change. `cargo check --all-targets` exit 0, no source warnings. Live OpenRouter transform is an owner smoke (needs live key); behavior unchanged by construction. | 2026-07-14 |
| **P1-poe** Add Poe provider (single key) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis** Add Genesis provider (two-key, model=slug) | B / `feature/core` | todo | dep: P1-txfactor | |
| **P1-genesis-long** Long Genesis gen doesn't time out (SSE, ~300s) | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-genesis-busy** Genesis concurrency → "still working" toast, not 429 | B / `feature/core` | todo | dep: P1-genesis | |
| **P1-license** License schema (platform-neutral machine_id, license, activations) | C / `feature/license` | **done (code); Supabase apply owner-gated** | `license.rs`: platform-neutral `resolve_platform_machine_id()` seam (keeps `win-<hash>` byte-identical) + `version_entitlement`/`tier`/`trial_expires_at` on `LicenseState`, read from the licenses row on activate+validate; `get_version_entitlement()` accessor. Schema migration `supabase/migrations/004_license_entitlement_schema.sql` (additive `ADD COLUMN IF NOT EXISTS`, `version_entitlement NOT NULL DEFAULT '1'` backfill). `cargo test license` = **7 passed** (warm cache, into main target). Robust to migration ordering: license lookups use `select=*`. **Migration 004 APPLIED + VERIFIED on live DB (2026-07-14)** via Supabase Management API (`api.supabase.com/v1/projects/bzhxcinrsgcnmktouqdw/database/query`, PAT from `~/.claude/secrets/`): the 3 columns exist (`version_entitlement TEXT NOT NULL DEFAULT '1'`, `tier`, `trial_expires_at`); backfill `total=1,v1=1,null_ent=0,beta_tier=1` (no lockout); the anon-key probe that returned HTTP 400 pre-apply now returns **HTTP 200** with `version_entitlement:"1"`. | 2026-07-10 |
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

# CORE-thread Handoff — 2026-07-10

> ## ⛔ THE PLAN IS ALREADY BUILT. DO NOT RE-PLAN.
> `docs/MASTER-PLAN.md`, `docs/DECISION-LOG.md` (D1–D12), and the `docs/BUILD-STATUS.md`
> §12 checklist are the **finished contract** — committed, decided, and mid-execution. Your
> job is pure **execution**, not planning:
> - **Do NOT** recreate the plan, re-run any "plan mode," re-derive decisions, or re-open
>   anything already in the Decision Log. If a decision looks wrong, read its D-entry first;
>   only then raise it — don't silently change it (MASTER-PLAN §13, rule 4).
> - **DO** read the files below, find the next unblocked `todo` item in the ledger
>   (`P1-migrate`), mark it `in-progress`, build it, mark it `done` with evidence, repeat.
> - Read order (standing ritual): `docs/BUILD-STATUS.md` → `docs/MASTER-PLAN.md` (§5, §11,
>   §12) → `docs/DECISION-LOG.md` → **this doc** (the delta + gotchas since the plan was written).
>
> This handoff is a *supplement* to the plan, not a substitute — it exists so you don't
> re-derive what the last session already nailed down.

## 1. Where things stand (on `master`, verified)

**Landed + merged to master:**
- **Track A foundation (this chat, PR #4):** `P0-clip` (webhook + SMART_URL clipboard guard), `P1-action` (unified `Action{kind}`), `P1-provfield` (per-action provider/model schema+routing). All: typecheck + lint + `cargo check` + full `test-protocol` (release build + install + launch) green.
- **Track C (parallel `feature/license` chat, PR #3):** `P1-license`, `P1-license-compat`, `P1-updater`, `P1-updater-repoint`. `cargo test license` = **7 passed** (re-verified). DECISION-LOG **D12** added.

**Both tracks' BUILD-STATUS updates coexist on master** (git auto-merged different rows — no clobber).

## 2. Your starting point: `P1-migrate` (deps now satisfied)

`P1-action` + `P1-provfield` are `done`, so `P1-migrate` + `P1-migrate-rust` are unblocked and are the **first** thing to do. Critical context this session locked in:

- **Persistence is STILL two-array.** `P1-action` deliberately did NOT collapse the persisted schema — it added a *runtime* normalization layer (`src/utils/actions.ts` maps `webhookActions[]` + `promptActions[]` → unified `Action[]`; consumed by `getAllActions()`, the registration loop, and `executeAction()`). The persisted collapse into one `actions[]` array is **your job in P1-migrate.**
- **The two-sided Rust serde trap (P1-migrate-rust) is REAL and unmitigated yet.** `src-tauri/src/config.rs` structs load with `#[serde(default)]`, which silently drops unknown fields. If you change the persisted shape, keep the OLD action fields optional on the Rust side during the migration window (or migrate Rust-side) or the owner's 40+ actions get default-dropped on the Rust load *before* TS `migrateSettings` runs.
- **Test against the owner's REAL `config.json`** for identical action count before/after. **No JS test runner exists** (no vitest) — you'll need to add one (vitest fits vite) or write a Node assertion script. `SETTINGS_SCHEMA_VERSION` is currently **2** (`src/types/index.ts`) with `migrateSettings()` in `src/stores/appStore.ts:356`; bump → 3, add the v2→v3 forward migration there.
- Additive optional fields already added this session (safe pattern to mirror): `provider`/`model` on `WebhookAction`/`PromptAction` (TS), `File*` interfaces, and `config.rs` (`#[serde(default)] Option<String>`), all 4 convert fns, both mappers.

## 3. Then Track B providers: `P1-txfactor` → `P1-poe` → `P1-genesis`

Re-verified anchors (MASTER-PLAN §5a is accurate):
- **`P1-txfactor` first (pure refactor):** `src-tauri/src/llm.rs` `transform()` is a clean 3-arm `&str` match at **line 186**, single `api_key` param. Widen the signature to thread an optional 2nd key through all arms as `None`, verify no behavior change (`cargo check` + a real OpenRouter call). `transform_openrouter` (~line 198) is the clone template for custom base URL + headers; reuse `parse_openai_response`.
- **`P1-poe` (single key):** `secrets.rs` `TransformProvider` enum + `credential_key`/`from_str`/`as_str`/`get_all_api_key_statuses`; `llm.rs` dispatch arm; `commands.rs` `fetch_provider_models` + `fetch_poe_models`; `types/index.ts` `TransformProvider` union (~line 30, currently `"openrouter" | "openai" | "anthropic"`); `SettingsPanel.tsx` `PROVIDER_INFO`. **UNRESOLVED:** whether Poe exposes `GET /models` — verify; fallback = curated list. Also verify a member's own Poe key can call the org's private bots BEFORE marketing it.
- **`P1-genesis` (two-key, MUST stream):** base `https://gas.copycoders.ai/api/v1/chat/completions`, headers `Authorization: Bearer <gen_>` + `X-Provider-Key: <provider_key>`, `model` = bot slug. **Do NOT reuse the 60s non-streaming path** — raise timeout to ~300s AND accumulate the SSE stream (`stream:true`), or long jobs die with `Timeout` (`P1-genesis-long`). **Serialize calls per key** — a 2nd concurrent call returns `429 connection_limit_error`; show a "still working" toast, not a raw 429 (`P1-genesis-busy`). Genesis needs a 2nd keyring slot (keyring is one-secret-per-username) — new pattern, no template. `GET /models` needs only the `gen_` key.

## 4. Deferred sliver you own (finish where Track B touches SettingsPanel)

- **`P1-provfield` authoring UI:** schema + fallback routing shipped, but there's **no UI to set a per-action provider/model** and the "test action routes correctly" acceptance was never runtime-demonstrated. Build the per-action provider/model dropdown in `SettingsPanel.tsx` alongside the `PROVIDER_INFO` work in P1-poe/P1-genesis (it only makes sense once >1 provider exists). The `Action.provider`/`model` fields + `action.provider ?? global` routing at both LLM sites already exist.

## 5. Owner-gated runtime steps (NOT code — flag to Cody, don't try to automate)

- **Apply Supabase migration `004`** in the SQL Editor to enable granting >v1 entitlement + recording tier/trial. App works without it (everyone = v1). (MCP auth for Supabase is unavailable in-session.)
- **Behavioral smokes on the installed build** (plan §8, cannot be done autonomously): voice-command match+execute (`P1-action-voice`), webhook-with-nothing-selected → **no POST** (`P0-clip`), per-action override routes to the override provider (`P1-provfield`).
- **Updater channel live smoke** needs a real release cut; honor the **D12 field-client migration trap** (ship the repointed v1 build and let field beta clients migrate onto it BEFORE cutting any v2).

## 6. Rituals / guardrails

- Branch **fresh `feature/core` from `master`** (this session's local `feature/core` is stale — it predates Track C's PR #3). Read `BUILD-STATUS.md` first, update it last, commit/push at the chat boundary (`/full-deploy-light`).
- **God-files owned by CORE, never edit from two chats at once:** `App.tsx`, `llm.rs`, `commands.rs`, `secrets.rs`, `config.rs`, `stores/appStore.ts`, `types/index.ts`.
- **Honor `Depends on` as law.** Mark each item `in-progress` (+ branch) before starting.
- **No secrets/doc-bodies in logs** (`P0-logscrub` is still open) — new provider code must never log key values.

## 7. Also-open, unowned (not blocking you, but don't let them vanish)

Phase 0: `P0-sign` (Azure Trusted Signing — external latency, start early), `P0-legal` (EULA + privacy), `P0-bugs` (Dec-2025 7-bug re-verify), `P0-logscrub`. Track D (brand) is `todo` and its `getAllActions()` wiring is now unblocked by `P1-action`.

## 8. Key file:line anchors (re-verified this session — save yourself the grep)

- `App.tsx`: `executeAction()` dispatch ~1350 · unified registration loop ~1420 · `getAllActions()` ~1592 · provider-fallback transform sites in `executePromptAction` and the webhook PROMPT branch (both `action.provider ?? currentSettings.transformProvider`).
- `src/utils/actions.ts`: `webhookToAction`/`promptToAction`/`getAllUnifiedActions`/`getEnabledUnifiedActions`.
- `types/index.ts`: `Action`/`ActionKind`, `VoiceCommandMatch.action: Action | MainHotkeyAction`, `SETTINGS_SCHEMA_VERSION = 2`.
- `stores/appStore.ts`: 4 convert fns (~73–123), `migrateSettings()` ~356, defaults ~325.
- The voice-review window (`components/VoiceReviewPanel.tsx`) reads only `match.action.name` — safe across the shape change.

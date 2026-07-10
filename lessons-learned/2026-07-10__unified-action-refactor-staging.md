---
title: Unified Action refactor — stage runtime-unify before persist-collapse; kill shape-dispatch
date: 2026-07-10
branch: feature/core
---

# Context

CORE-thread session executing the master plan's Track A structural foundation on
`feature/core`. Shipped three items: **P0-clip** (webhook clipboard-guard bug),
**P1-action** (unified `Action{kind}` refactor), **P1-provfield** (per-action
`provider`/`model`). These lessons are the non-obvious bits worth remembering for
P1-migrate and Track B (providers), and for any future action-model work.

## 1. Stage the action-model change: unify at RUNTIME first, collapse PERSISTENCE later

The plan sequences `P1-action → P1-provfield → P1-migrate`. The temptation is to
do the "real" unification in one shot: one persisted `actions[]` array, new Rust
structs, migrate the owner's 40+ actions. **Don't.** The dependency graph is
telling you to split it:

- **P1-action** introduces the unified `Action{kind}` type + `executeAction()`
  dispatch + unified `getAllActions()`/registration **as a normalized in-memory
  layer over the UNCHANGED two-array persisted schema** (`webhookActions` +
  `promptActions`). Mappers (`src/utils/actions.ts`) convert the two persisted
  shapes → one `Action`. Persistence, `SettingsPanel`, `MainWindow`,
  `hotkeyValidation`, and the Rust structs are **untouched**.
- **P1-migrate** does the persisted collapse (single `actions[]`, schema v3, Rust
  compat) — tested ONCE against the owner's real `config.json` for zero loss.

Why this ordering is load-bearing: **the Rust `config.rs` structs deserialize
with `#[serde(default)]`, which silently drops unknown fields.** If P1-action had
changed the persisted shape to a single `actions[]`, the next Rust `load_user_settings`
would not recognize it and would **default-drop the owner's 40 actions BEFORE the
TS `migrateSettings` ever runs.** Keeping persistence two-array in P1-action
sidesteps that entirely; P1-migrate handles it deliberately with the two-sided
compat (keep old fields optional during the migration window).

**Rule:** when a refactor touches a type that is BOTH persisted (Rust serde) and
used at runtime, separate "change the runtime shape" from "change the on-disk
shape" into different steps. The runtime step is safe and reversible; the on-disk
step needs the real-config zero-loss test.

## 2. Additive optional fields are serde-safe; that's how P1-provfield stayed low-risk

P1-provfield added `provider`/`model` to the persisted action structs. Because
they're `Option<String>` with `#[serde(default)]` on the Rust side (and optional
on the TS side), they **round-trip safely**: old configs without them load fine
(→ `None`), and — crucially — because the struct now KNOWS the fields, saving
won't drop them. Additive optional fields do NOT trigger the two-sided drop from
lesson #1. Shape *changes* do.

## 3. Kill object-shape dispatch — it's silent-failure bait

The old voice-command dispatch sniffed object shape at 3 sites:
`if ("method" in action) → webhook; else if ("prompt" in action) → prompt`. This
worked only by accident of ordering (a `WebhookAction{method:"PROMPT"}` ALSO has
a `prompt` field). Adding a new action kind (brand-paste) to this is exactly how
you silently break voice matching. The fix: one discriminated `Action{kind}` +
one `executeAction(action)` with a `kind` switch. New kinds get an explicit arm;
nothing sniffs shape. The `matchVoiceCommand` fuzzy matcher only ever read
`action.name`, so it was already shape-agnostic — the fragility was 100% in the
dispatch sites.

**Conservative variant that worked:** `executeAction` routes legacy kinds back
to the PROVEN executors (`executeWebhookAction`/`executePromptAction`) by
re-fetching the original typed action by id (ids are unique across both arrays).
This gave the clean `kind` dispatch + extension slot WITHOUT rewriting ~600 lines
of hard-won executor logic (profile chooser, SSE, clipboard guards, busy guards).
Don't rewrite working god-file logic just to satisfy the letter of "per-kind
executor" — the structural win is the single dispatch entry point.

## 4. TS gotcha: `&&` compound conditions don't narrow the `else`

`if ("type" in action && action.type === "main") {...} else { useAsAction(action) }`
does NOT narrow `action` to the non-main type in the `else` — TS can't prove the
negation of a compound `A && B`. Since `MainHotkeyAction` is the ONLY union member
with a `type` field, `if ("type" in action)` alone is a clean discriminant and
narrows both branches. Dropping the redundant `&& action.type === "main"` fixed
three `TS2345` errors.

## 5. P0-clip: the plan named one branch; the identical bug lived in two

The plan flagged the missing stale-clipboard guard only in the WEBHOOK (POST/GET)
branch (App.tsx:1266). The **SMART_URL** branch (App.tsx:1061) had the byte-for-byte
same defect (50ms, no before-snapshot, empty-only check). Fixed both. Lesson:
when you find a copy-selection guard bug, `grep simulate_copy` and check EVERY
call site — the same pattern was copy-pasted. (AI-Transform at line ~582 also
lacks a before-snapshot but feeds a different voice-record flow; the plan treats
it as the working reference, so it was left alone and flagged, not silently
changed.)

## 6. Verification discipline that paid off

Every item: `npm run typecheck` + `npm run lint` + `npm run build` (vite) +
`cargo check`, then the full `node scripts/test-protocol.mjs` (release build +
install + launch) at the milestone. The release build+boot is the ONLY thing that
catches a hook-dependency-graph regression (render loop / white-screen) that all
the compile checks miss. The behavioral matrix (voice-match-executes,
webhook-nothing-selected → no POST) remains owner-driven manual smoke per plan §8
— compile-green + boots-clean is NOT the same as behaviorally-verified, and the
ledger says so honestly.

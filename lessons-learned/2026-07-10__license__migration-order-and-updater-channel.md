---
title: License schema changes — migration-order robustness, updater channel gating, and parallel-track isolation
date: 2026-07-10
branch: feature/license
---

Three durable lessons from the Track C (license/updater) side-track.

## 1. PostgREST `select=<explicit columns>` hard-fails when a column isn't migrated yet — use `select=*`

The license lookup originally selected explicit columns. When I added the new
entitlement columns to the `select=` list, I created a **deploy-order landmine**:
if a build carrying that code runs *before* the Supabase migration adds the
columns, PostgREST returns **HTTP 400 "column ... does not exist"**. The code's
`if !response.status().is_success() { return Err(...) }` then turns that into a
hard error → **every activation and validation breaks** until the migration is
applied. Code-ship and migration-apply become tightly coupled, and slipping the
order bricks the app.

**Fix:** query `select=*` and read new fields defensively
(`row["version_entitlement"].as_str().map(...).unwrap_or_else(default)`).
PostgREST simply omits absent columns, so the same binary works whether or not
the migration has been applied (missing column → default value). The migration
becomes an *enhancement* (unlocks setting non-default values), not a *prerequisite*.

**Why:** decouples a client binary already in the field from a server-side schema
change you can't deploy atomically with it.

**How to apply:** any time you add a column and read it from PostgREST in shipped
client code, prefer `select=*` + defensive reads over naming the new column in
`select=`. Never let an additive migration be a hard dependency of an already-built client.

## 2. The Tauri updater gate is the *endpoint*, not the license — channel-separate, and mind field-installed clients

`tauri-plugin-updater` blindly fetches the configured endpoint and offers whatever
version that manifest advertises. It does **not** consult the license. So a
`version_entitlement` field on the license is *not* a runtime gate by itself — the
only thing that actually stops a paid v2 auto-pushing to v1 owners is pointing v1
clients at a **version-pinned channel** (`releases/download/updater-v1/latest.json`)
and publishing v2 to a separate channel. `version_entitlement` is the *recorded
entitlement* (for checkout/v2 + a future frontend cross-check), not the transport gate.

**The trap (see DECISION-LOG D12):** the repoint only affects **new** builds.
Clients already installed in the field have the *old* endpoint compiled in, so you
must (a) ship the repointed build and let field clients auto-update onto it via the
old endpoint *before* cutting any v2, and (b) not mark a v2 release as GitHub
"Latest" until field clients have migrated. This is why the plan says *repoint now,
not later*.

**How to apply:** for GitHub-releases auto-update, don't rely on `releases/latest`
(it auto-follows the newest release). Publish the manifest to a stable
`updater-v<MAJOR>` tag (`gh release create --latest=false` + `--clobber` upload)
and point clients there.

## 3. Parallel tracks on shared god-files → isolate with a git worktree, never switch the shared checkout's branch

The CORE thread had **uncommitted** edits to a god-file (`App.tsx`) in the main
checkout. Switching that checkout to my branch (or stashing — which is forbidden
here anyway) would have disturbed its work. A dedicated `git worktree add -b
feature/license` from the clean committed HEAD gave an isolated tree; CORE's
uncommitted WIP stayed untouched in the main directory.

Bonus: to typecheck fast in a fresh worktree (no warm Rust target), point
`CARGO_TARGET_DIR` at the main checkout's warm `target/` — reused 2213 dep
artifacts, ~3–4 min vs a 10+ min cold build. Only safe because the other track had
no pending *Rust* changes.

**How to apply:** when a parallel chat shares a checkout that has uncommitted work,
make a worktree instead of changing branches; reuse the sibling's `CARGO_TARGET_DIR`
for a warm incremental build when the sibling hasn't changed the compiled language's sources.

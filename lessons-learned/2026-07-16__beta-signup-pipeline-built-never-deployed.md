# Beta signup pipeline: fully built in the repo, but never actually turned on

**Date:** 2026-07-16
**Branch:** docs/signing

## What happened

Started from "let me test the license activation screen," which turned out to be the
wrong end of the problem. The real need was **how a new user gets onboarded** (signup →
license key → activation). The activation *mechanism* already worked; what was broken was
everything *before* it. Investigating that surfaced a stack of latent problems — every one
of them a case of "code exists in the repo, but the thing was never wired up / deployed."

## The findings (each was a real, separate break)

1. **Two different Vercel projects, and the good name points at the wrong one.**
   - `speakeasy-beta.vercel.app` = an **orphaned Flutter/Dart app** (loads `flutter_bootstrap.js`/
     `main.dart.js`, `#/splash` hash route, phone+birthdate+country onboarding). Not SpeakEasy code —
     this repo has *never* contained Flutter (verified across all git history). It also **serves its
     `/assets/.env` publicly** (HTTP 200) — a possible secret leak.
   - `speak-easy-swart.vercel.app` = the **real** Next.js `beta-site/` (name+email → "Join the Beta").
   - Cause: `*.vercel.app` names are globally unique + first-come. The Flutter project claimed
     `speakeasy-beta` first, so the real site got the auto-suffixed `-swart` URL. Everyone was looking
     at the dead Flutter squatter.

2. **The signup Edge Function was never deployed.** `supabase/functions/register-beta-tester/` exists
   in the repo, but only `receive-diagnostics` was deployed. The browser POST to
   `/functions/v1/register-beta-tester` hit a 404 with no CORS → **"Failed to fetch."** Repo ≠ deployed.

3. **Pool RPCs broken/missing.** `get_available_license()` (defined in migration 001) was **absent**
   from the live DB, and `generate_licenses()` had a **uuid-vs-text bug** (`gen_random_uuid()::TEXT`
   into a `uuid` column → ERROR 42804) so it minted **zero** keys. Migration 001 was only partially
   applied. Fixed + captured in **migration 005**.

4. **Empty license pool.** Only 1 license existed (the dev key). Minted 50; **reserved the dev key**
   out of the assignable pool (set `assigned_to_email='dev-reserved@...'`, kept `is_active=true` so
   existing activations still validate) so a real signup can't be handed the admin/dev key.

5. **`RESEND_API_KEY` set in the wrong service.** It was in **Vercel** env vars, but the email is sent
   by the **Supabase Edge Function** (Vercel just forwards the signup to Supabase). The function reads
   `RESEND_API_KEY` from *Supabase* secrets, which didn't have it. Moving the same key into Supabase
   Edge Function secrets fixed it.

## The fixes applied

- Created missing / fixed pool RPCs (migration 005); minted a 50-key pool; reserved the dev key.
- Deployed `register-beta-tester` + `resend-license-key` as public endpoints (`--no-verify-jwt`).
- Set Supabase Edge Function config: `FROM_EMAIL`/`ADMIN_EMAIL`=cody@genesissportsperformance.com,
  `DOWNLOAD_URL`=GitHub releases/latest. Owner set `RESEND_API_KEY` in Supabase (owner-only step).
- **Result:** signup at `speak-easy-swart.vercel.app` now works end-to-end — verified server-side
  (beta_signups row + license `33ab6dad-…` assigned to the owner's email, 0/2 activation slots, email
  sent).

## Lessons for next time

- **"It's in the repo" and "it's deployed" are different facts** — check deployment, not just code.
  This bit us four separate ways in one pipeline (function, RPCs, pool, env var).
- **Trace which service actually does the work before configuring it.** The email sender is the
  Supabase function, not the Vercel site — so the API key belongs in Supabase secrets, not Vercel.
- **A live URL is owned by whatever Vercel *project* holds that name (globally unique, first-come).**
  A wrong-looking site = a different project owns the name; the real app gets an auto-suffixed URL.
- **Migrations can be partially applied.** Don't assume a function/table exists just because its
  migration is in the repo — verify against the live DB (`pg_proc`, `information_schema`).
- **Ask "where did you put it?" early.** A lot of time was lost assuming a secret was missing when it
  was really just in the wrong service.
- **Guard shared/admin credentials.** The dev key was the oldest unassigned license, so the pool would
  have handed it to the first signup — reserved it out explicitly.

## Still open / follow-ups

- The orphaned Flutter `speakeasy-beta.vercel.app` (leaking `/assets/.env`) — identify/rotate/retire;
  decide whether to reclaim the name or put a clean custom domain on the real beta-site.
- Verify signup *activation* leg on an isolated profile/machine (the emailed key `33ab6dad-…` has 2
  open slots) — the owner's main box is admin-gated so it skips the activation screen.
- `DOWNLOAD_URL` points at unsigned installers (SmartScreen "run anyway") until the P0-sign cert lands.

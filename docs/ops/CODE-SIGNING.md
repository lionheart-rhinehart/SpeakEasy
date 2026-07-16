# SpeakEasy — Windows Code Signing Runbook (P0-sign)

> ## 🔴 THE ACTUAL ENROLLMENT SUBMISSION IS CODY'S PORTAL ACTION.
> This document **prepares and guides** that submission — it does not (and cannot) submit it. Azure
> identity validation requires signing into the Azure portal as the account/billing owner, selecting a
> billing account, and completing a **live mobile ID-verification** (photo of a government ID + selfie).
> No automated thread can do that. **Cody must click through §2 himself.** Everything else here — the
> resource setup, the post-cert CI wiring — is written so that once the certificate lands, P1-installer
> is turnkey.
>
> **Scope of this thread (P0-sign):** docs-only. The god-files and CI are owned by another chat right
> now, so the tauri.conf.json / release.yml changes in §4 are **proposed diffs, NOT applied.**
> P1-installer applies and tests them *after* the certificate exists.

---

## 0. TL;DR — what, why, when

- **What we're buying:** an OS **code-signing certificate** so Windows shows a real publisher name
  instead of "Unknown publisher," and SmartScreen stops hard-blocking the installer over time.
- **Service:** **Azure Artifact Signing** — this is the service formerly called **Azure Trusted
  Signing** (Microsoft renamed it; it reached General Availability in ~April 2026). Same service, same
  `Microsoft.CodeSigning` resource provider. You'll see *both* names in the portal/tooling during the
  transition. ([rebrand + GA](https://azure.microsoft.com/en-us/products/artifact-signing))
- **Cost:** **$9.99/month** (Basic tier) — the plan's "~$10/mo" assumption is **confirmed correct.**
  Includes identity validation, certificate lifecycle, and signing in one price.
  ([pricing](https://azure.microsoft.com/en-us/pricing/details/artifact-signing/))
- **EV certificate is NOT required — confirmed still true in 2026.** Since March 2024, EV certs no
  longer grant instant SmartScreen reputation; Microsoft treats OV/standard and EV **equally** now, and
  reputation builds organically by download volume. Azure Artifact Signing issues an OV-equivalent
  **Public Trust** cert, which is exactly what we need — do **not** pay a premium for an EV cert.
  ([EV PSA](https://www.todesktop.com/blog/posts/windows-apps-psa-ev-certs-do-not-grant-immediate-reputation-anymore))
- **⏱ The #1 launch trap is latency.** Identity validation takes **1–20 business days** and **cannot be
  expedited.** Everything else in Phase 0/1 can proceed in parallel while it runs. **So submit
  enrollment TODAY (§2) and let it bake.** This is the single most time-sensitive action in the whole
  build.

---

## 1. 🚀 DO THIS TODAY — the latency-critical action (front and center)

**Goal: get the identity-validation clock started this session.** It runs in the background for days;
starting it late is what blows the launch date. Concretely, Cody:

1. Sign in to the **[Azure portal](https://portal.azure.com/)** with the account that will own SpeakEasy's
   billing (see §2.0 — the billing account's legal name/address will end up **on the certificate**, so
   use the identity you want customers to see).
2. **Register the resource provider** (one-time, ~30 s): portal search → **Subscriptions** → pick your
   subscription → **Settings → Resource providers** → search `Microsoft.CodeSigning` → select it →
   **Register**. Wait for status **Registered**.
3. **Create the Artifact Signing account:** portal search → **"Artifact Signing Accounts"** → **Create**
   → Subscription = yours; Resource group = *Create new* `rg-speakeasy-signing`; Account name =
   `speakeasysign` (3–24 alphanumerics, globally unique, must start with a letter, no consecutive
   hyphens — pick another if taken); **Region = East US** (a US region; endpoint will be
   `https://eus.codesigning.azure.net`); **Pricing = Basic**. → **Review + Create** → **Go to resource**.
4. **Give yourself the verifier role:** on the account → **Access control (IAM)** → **Add role
   assignment** → role **"Artifact Signing Identity Verifier"** → assign to your own user. (Without it,
   the **New identity** button is greyed out.)
5. **Start identity validation** (this is the clock): on the account **Overview** (or **Objects →
   Identity validations**) → switch the type dropdown to **Individual** (see §2.2 for individual vs.
   organization) → **New Identity → Public** → select your **billing account** → the form
   auto-populates from billing (read-only) → **Create**. Status goes **In Progress**, then **Action
   Required**.
6. **Complete the live ID check:** click your name → the "Please complete your verification here" link →
   sign in with the **same email** you put on the request → **Get verified here through our trusted
   ID-verifiers** → follow the **AU10TIX** flow on your **phone** (scan QR, present a government photo
   ID, take a selfie), then add the Verified ID to **Microsoft Authenticator** and share it back. Status
   returns to **In Progress**, then eventually **Completed**.

**After step 6 you are DONE for today.** The certificate profile (§3) and the CI wiring (§4) can wait —
they take minutes once the validation clears. **Do not block on them; the validation days are the
bottleneck.**

> Have ready before you start (§2.1): a valid government photo ID whose **name + address exactly match
> your Azure billing account**, a phone with a camera + Microsoft Authenticator, and — if your ID has no
> address — a recent (≤3 months) utility bill or bank statement.

---

## 2. Azure Artifact Signing enrollment — full reference

### 2.0 Prerequisites

- An **Azure subscription** (any pay-as-you-go works) and a **Microsoft Entra tenant** (you get one with
  any Azure account).
- **The billing account identity is the certificate identity.** For individual validation the form is
  auto-filled **read-only** from your Azure **billing account** (legal name + address), and that's what
  appears on the cert (city/state/country show; street/email don't). **Before you start, confirm your
  billing account's legal name and address exactly match your government ID** — mismatches either fail
  validation or print the wrong publisher name. Fix it under *Cost Management + Billing → billing
  account* first if needed.

### 2.1 Documents & things to have ready

| Item | Requirement |
|---|---|
| Government photo ID | Passport, driver's license, or state ID. **Not** library/school/club cards. Name (and ideally address) must match the billing account. |
| Selfie / liveness | Done live in the AU10TIX mobile flow — no upload needed. |
| Address proof (only if ID lacks an address) | Recent utility bill (electric/water/gas/phone, ≤3 months) **or** bank/credit-card statement showing your address. |
| Image specs (if asked to upload supplemental docs) | Color, **≥200 DPI** (400 ideal), **30 KB–5 MB**, formats `.bmp/.jpg/.gif/.tif/.pdf`, one page per file, uncropped, unedited, no flash. Docs must be **issued within the last 12 months** (or expire ≥2 months out). **Only 3 upload attempts** — get them right. |
| Phone | Camera + **Microsoft Authenticator** installed (the Verified ID lands there). |

### 2.2 Individual vs. Organization — which to choose

| | **Individual Developer** | **Organization** |
|---|---|---|
| Cert subject (publisher shown to users) | Cody's **personal legal name** | The **legal business entity** name (e.g. an LLC) |
| Who's eligible | Individual developers in the **USA and Canada** only (Public Trust). Cody (US) qualifies. **Self-employed individuals no longer need the 3-years-of-history** that preview required. | Businesses in **USA, Canada, EU, UK**. Needs a registered legal entity + verifiable public records. |
| Proof | Personal gov ID + selfie (AU10TIX) | Entity legal name, **website**, primary + secondary email (a verification link is sent; expires in 7 days), business identifier, business address — plus an individual rep still does the personal ID check. |
| Processing | **1–20 business days**, cannot expedite | **1–20 business days** (longer if more docs requested), cannot expedite |

**Recommendation for the founding-five launch: enroll as an _Individual Developer_.** It's the fastest
path (no entity records to reconcile), Cody is US-based and eligible, and the installer will show his
legal name as publisher — fine for a 5-person feedback cohort. **If SpeakEasy should ship under a
business name** (an LLC, "Genesis…", etc.), choose **Organization** instead — but know it can add days
and requires the entity's public records to be current. This is a **Cody decision**; flagged in §6.
Switching later means a **new** identity validation + new cert profile, so decide before §3.

### 2.3 The enrollment steps (portal)

1. **Register `Microsoft.CodeSigning`** resource provider on the subscription (§1.2).
2. **Create the Artifact Signing account** — Basic tier, US region (§1.3). Naming: 3–24 alphanumerics,
   globally unique, starts with a letter, no consecutive hyphens, can't start with "one".
3. **Assign yourself "Artifact Signing Identity Verifier"** via the account's IAM (§1.4).
4. **Create the identity validation** (Individual→Public or Organization→Public) and **complete the
   Verified ID mobile flow** (§1.5–1.6). Status ends at **Completed**.
5. **Create the certificate profile** — see §3. *(Do this after validation is Completed.)*
6. **Create the CI service principal + signer role** — see §4.1. *(Do this when wiring CI, not before.)*

### 2.4 Status flow & what each means

`In Progress` → (Verified ID needed) `Action Required` → (you complete it) `In Progress` → `Completed`
(success) or `Failed` (must start a **new** request — you can't edit a submitted one). You're emailed on
every status change; you can also check the portal anytime.

Sources: [Quickstart: Set up Artifact
Signing](https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart) ·
[FAQ](https://learn.microsoft.com/en-us/azure/artifact-signing/faq).

---

## 3. Create the certificate profile (after validation = Completed)

On the Artifact Signing account → **Objects → Certificate profiles → Create** → type **Public Trust** →
Name `speakeasy-public-trust` (5–100 alphanumerics) → **Verified CN and O** = your completed identity
validation → leave **Program Type = None** → **Create**. Optionally tick *Include street address /
postal code* if you want them on the cert (not needed).

**Record these three values — P1-installer needs them for §4:**

| Value | Where to find it | Example |
|---|---|---|
| **Endpoint URI** | The account's region (§2.3 step 2) | `https://eus.codesigning.azure.net` |
| **Account name** | The Artifact Signing account name | `speakeasysign` |
| **Certificate profile name** | The profile you just made | `speakeasy-public-trust` |

---

## 4. Post-cert integration — PROPOSED (do NOT apply until the cert exists)

> **⚠️ Not applied by this thread.** These are the exact changes P1-installer should make **after** §3
> is done. `tauri.conf.json`, `.github/workflows/release.yml`, and all `.rs/.ts` files are owned by
> another chat right now.
>
> **Approach chosen: Tauri's `bundle.windows.signCommand`** (runs the Azure signer *during* the
> `tauri-action` build). This signs **both** the inner `SpeakEasy.exe` **and** the NSIS
> `…-setup.exe` in one pass. The post-build `azure/trusted-signing-action` alternative only signs the
> installer, leaving the inner binary unsigned — so we use `signCommand`.
> ([Tauri Windows signing](https://v2.tauri.app/distribute/sign/windows/))

### 4.0 ⛔ Do NOT disturb the updater config (Track C)

`tauri.conf.json` already contains a **`plugins.updater`** block (from Track C / D12): a `minisign`
`pubkey` and the versioned endpoint
`…/releases/download/updater-v1/latest.json`. **That is a completely separate signature** (minisign, for
update-integrity) from OS **code signing** (Authenticode, for SmartScreen). The changes below touch only
**`bundle.windows`** — **leave `plugins.updater` and the `release.yml` minisign steps exactly as they
are.** The two never interact: the updater still ships the `.nsis.zip` + `.sig`; that zip now just
happens to contain an Authenticode-signed installer. No conflict.

### 4.1 Azure side — one-time CI credential (do with §3)

Create an **App registration** (Microsoft Entra → App registrations → New) → note its **Application
(client) ID** and **Directory (tenant) ID** → **Certificates & secrets → New client secret** → copy the
secret **value**. Then on the **Artifact Signing account → IAM → Add role assignment** → role **"Artifact
Signing Certificate Profile Signer"** → assign to **the App registration** (the service principal), *not*
your user. (Assigning it to a user instead is the classic cause of a 403 at sign time.)

### 4.2 `tauri.conf.json` — proposed diff (bundle.windows only)

Fill `<REGION-ENDPOINT>`, `<ACCOUNT>`, `<PROFILE>` from §3.

```jsonc
// src-tauri/tauri.conf.json  →  bundle.windows
   "windows": {
     "certificateThumbprint": null,        // stays null — Azure signing is cloud, not a local cert store
     "digestAlgorithm": "sha256",
     "timestampUrl": "",
+    "signCommand": "artifact-signing-cli -e https://eus.codesigning.azure.net -a speakeasysign -c speakeasy-public-trust -d SpeakEasy %1",
     "nsis": {
       "installerHooks": "./windows/hooks.nsh"
     }
   }
```

Notes:
- `%1` is the file placeholder Tauri substitutes for each artifact it signs. `-d SpeakEasy` is the
  description shown in the UAC prompt.
- The endpoint/account/profile are **not secrets** (they're just resource names), so they live in
  `tauri.conf.json`. Only the three Azure **auth** creds are secrets (§4.3).
- **The signer CLI was renamed with the service:** `trusted-signing-cli` → **`artifact-signing-cli`**
  (`cargo install artifact-signing-cli`). If a pinned older toolchain still has `trusted-signing-cli`,
  the args are identical — swap the binary name.
- **Version caveat (verify at apply-time):** confirm the `signCommand` **string** form against the
  project's installed `@tauri-apps/cli` (`npx tauri --version`). Some 2.x builds accept an object form
  `"signCommand": { "cmd": "artifact-signing-cli", "args": ["-e", "…", "%1"] }`. Use whichever the
  installed CLI's schema accepts; the string form above is the documented v2 default.

### 4.3 `release.yml` — proposed diff (CI signing)

Because signing happens **inside** the existing "Build Tauri app" step (Tauri calls `signCommand` during
bundling), the CI change is small: **install the signer**, and **pass the three Azure creds** into that
step. Everything else — the whole minisign/`.nsis.zip`/updater-channel block — stays untouched.

```yaml
# .github/workflows/release.yml  →  job build-tauri, before "Build Tauri app"
      - name: Install Azure Artifact Signing CLI
        run: cargo install artifact-signing-cli    # consider caching; slow first run on windows-latest

      - name: Build Tauri app
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+         AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
+         AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
+         AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: ${{ matrix.args }}
```

`artifact-signing-cli` authenticates via the standard Azure env vars (`AZURE_TENANT_ID` /
`AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` → service-principal credential). No other step changes.

### 4.4 CI secrets to add (repo → Settings → Secrets and variables → Actions)

| Secret | Value (from §4.1) |
|---|---|
| `AZURE_TENANT_ID` | App registration's **Directory (tenant) ID** |
| `AZURE_CLIENT_ID` | App registration's **Application (client) ID** |
| `AZURE_CLIENT_SECRET` | The client **secret value** (rotate before expiry) |

*(Endpoint / account / profile are non-secret and live in `tauri.conf.json §4.2` — no secret needed.)*

---

## 5. Verification criterion (from §12 P1-installer)

**P1-installer is "done" when:** on a **clean Windows box** (a machine/VM that has never run SpeakEasy),
downloading and running the signed release installer produces **no SmartScreen "unknown publisher"
block** — i.e. the UAC/SmartScreen dialog shows **"SpeakEasy" / the verified publisher name**, not
"Unknown publisher," and there is no hard red "Windows protected your PC" wall that can't be dismissed.

Practical checks at apply-time:
1. **Publisher name present:** right-click the downloaded `…-setup.exe` → **Properties → Digital
   Signatures** → a valid signature from the verified subject (Cody's name or the org), timestamped.
2. **No unknown-publisher UAC:** launching it shows a **blue** UAC prompt naming the publisher, not the
   **yellow** "unknown publisher" one.
3. **SmartScreen realism:** brand-new certs still carry **little reputation**, so SmartScreen may show a
   soft **"More info → Run anyway"** prompt on the very first downloads until volume accrues — that is
   **expected and acceptable** (reputation builds organically, same for OV and EV since 2024). The bar
   for §12 is **no hard *unknown-publisher* block**, not zero SmartScreen interaction on day one.
   Tell the founding five they may see "More info → Run anyway" on the first install.

---

## 6. Owner decisions / gates (flag to Cody)

- **[SUBMIT] Enrollment is Cody's action** — §1/§2 require his portal login + live mobile ID check. **This
  is the latency-critical thing to do today.**
- **[DECIDE] Individual vs. Organization** (§2.2) — personal name vs. a business entity as the publisher.
  Recommendation: **Individual** for the founding-five (fastest); switch to Organization only if
  SpeakEasy must ship under a company name. Decide **before** creating the certificate profile (§3) —
  changing later means re-validating.
- **[VERIFY] Billing identity == government ID** (§2.0) — reconcile name/address first or validation
  fails / prints the wrong publisher.
- **[LATER] P1-installer applies §4** — after the cert profile exists; not this thread.

---

## Appendix — sources (fetched 2026-07-15)

- Azure Artifact Signing product & GA / rebrand — <https://azure.microsoft.com/en-us/products/artifact-signing>
- Pricing ($9.99/mo Basic) — <https://azure.microsoft.com/en-us/pricing/details/artifact-signing/>
- Quickstart (enrollment, identity validation, cert profile, regions/endpoints) — <https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart>
- Artifact Signing FAQ — <https://learn.microsoft.com/en-us/azure/artifact-signing/faq>
- Individual-developer sign-up (US/Canada, no 3-yr history) — <https://techcommunity.microsoft.com/blog/microsoft-security-blog/trusted-signing-is-now-open-for-individual-developers-to-sign-up-in-public-previ/4273554>
- EV no longer bypasses SmartScreen (Mar 2024) — <https://www.todesktop.com/blog/posts/windows-apps-psa-ev-certs-do-not-grant-immediate-reputation-anymore>
- SmartScreen reputation for developers — <https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation>
- Tauri v2 Windows signing (`signCommand`, `artifact-signing-cli`) — <https://v2.tauri.app/distribute/sign/windows/>

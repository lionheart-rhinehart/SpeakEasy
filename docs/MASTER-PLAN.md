# SpeakEasy — Master Plan

> The single source of truth for what SpeakEasy is, who we sell it to, how we price it, and the phased build to get from "works on my machine" to a $499 product launched to a 300-person peer group. Captures the full strategic context from the planning conversation so none of it is lost.

_Last updated: 2026-07-08_

> **Companion document:** the *why* behind every choice here — including the paths we rejected (a cloud/web app; a chat-client "cockpit") and the competitive intel — lives in the **Decision Log** (`docs/DECISION-LOG.md`), cited from this plan by decision ID (D1–D11, see §10). This plan is the *what/how*; the Decision Log is the *why*. When a decision here feels unobvious later, read its D-entry before reopening it.
>
> **Progress ledger:** `docs/BUILD-STATUS.md` is the cross-chat source of truth for what's done. Read it first, update it last (see §13).

---

## 1. Context — why this plan exists

SpeakEasy is a Windows-first **Tauri + React desktop app** for **voice-driven dictation and automation**. Press a hotkey, talk, and text is transcribed (OpenAI Whisper cloud API) and pasted into whatever app has focus. It also does "AI Transform" (grab selected text, speak an instruction, an LLM rewrites it, paste back) and voice-triggered actions (URL shortcuts, prompt actions). The core dictation/transform/action pipeline **already works today** (v1.0.9, in beta).

**Who we're selling to:** a ~300-person marketing peer group the owner belongs to (roughly 50/50 technical, technical share growing). ~100 of them already pay for the competitor **Wispr Flow** ($15/mo subscription). The group runs an AI-copywriting ecosystem built on **Claude Code** ("their agentic OS") plus a **"skill server" = Genesis Bots (OpenClaw)** and org-built **Poe bots**.

**The strategic insight that drives the product:** most of this group is "so far behind" they can't drive Claude Code / the agentic OS well. So SpeakEasy's moat is **NOT** out-teching their tools — it's being the **dead-simple, voice-first "easy button"** for people who bought into this world but can't operate the power tools. Simplicity *is* the product.

**How we got here (decisions already made in conversation):**
- **Killed:** turning SpeakEasy into a chat client / cockpit for the bots. They already have OpenClaw + an agentic OS; we'd be a worse, redundant version, and it'd bloat SpeakEasy into "the Kraken" (the owner's separate, advanced marketing system). Off-strategy.
- **Chosen flagship:** a **Brand Asset Library** — store brands, upload documents (research, testimonials, voice guides) per brand as text, then paste a chosen document into any focused textbox on command. Solves the real, repeated pain: hunting for the right research doc every time a bot asks. Works across **all** tools, including server-side bots that are blind to local files. Stays firmly in SpeakEasy's lane (hold text → trigger → paste).
- **Provider expansion:** wire **Poe** and **Genesis/CopyCoders** as AI providers (both OpenAI-compatible) so members use keys/subscriptions they already pay for.

**Intended outcome:** a Windows product a "far-behind" marketer can use in 30 seconds, launched founding-five-first at $149, built out on their feedback toward a $499 "voice command center," with Mac following on a waitlist.

---

## 2. Product vision & positioning

**Two pillars:**
1. **Voice everywhere** (built): hotkey → talk → transcribe → paste anywhere; AI Transform; voice-triggered URL/prompt actions; Cursor Lock (paste into a chosen window).
2. **Brand Asset Library** (new flagship): brands → uploaded docs stored as text → paste a chosen doc into any textbox by voice **or** click/hotkey.

**Proven daily value (the evidence base — cite D6):** the owner's real usage today is dictation + firing the same **URL shortcuts by voice dozens of times a day** (e.g. Gmail ~15×/day, standing Zoom/scheduling links) + custom prompt actions. The quick-launch/URL-shortcut workflow is a demonstrated everyday win, not a hypothesis — lead demos with it. The brand library extends that same "say it, it happens" muscle to research docs.

**The one-liner vs Wispr:** *"Wispr Flow types what you say. SpeakEasy does what you say."* Wispr is dictation-only, subscription, cloud-locked. SpeakEasy is voice **automation** + your own keys, **owned once**.

**Why it wins for THIS group specifically:** it makes the tools they already use faster (feeds bots/Claude Code/ChatGPT by voice and instant doc-recall) instead of competing with them; and it's usable by people who can't drive their agentic OS.

**Governance guardrail (repeat every phase):** the differentiator is **simplicity**. Every feature must pass *"could someone who's behind use this in 30 seconds?"* The moment it grows RAG/search/embeddings/pipeline-building, it's becoming the Kraken — stop.

---

## 3. Competitive landscape & pricing

### One-time / lifetime comps (verified 2026-07-08)
| Product | One-time price | What it is | Platform |
|---|---|---|---|
| Dragon Professional v16 | **$699.99** | Heavy dictation, no automation, stale | Windows |
| Superwhisper | **$249.99 lifetime** | Modern AI dictation, local models, no automation | Mac |
| MacWhisper | ~$69 lifetime | File transcription only | Mac |
| Wispr Flow | **none** — $15/mo | AI dictation | Mac/Win/iOS/Android |
| Keyboard Maestro / Alfred / BetterTouchTool | $25–$79 | Generic automation utilities | Mac |

No competitor sells SpeakEasy's dictation **+ automation** blend one-time → anchoring freedom. Dragon ($700) is the ceiling reference; Superwhisper ($250 lifetime) is the mid-anchor.

### Pricing decision (DECIDED)
- **Model:** BYOK (bring your own key), **one-time purchase, not subscription.** BYOK is a deliberate selling point — the user controls their own usage/spend and can connect keys/subscriptions they already pay for (Poe subscription points, OpenRouter, Anthropic, OpenAI).
- **Launch:** **$149, hard-capped at the first FIVE buyers**, positioned as feedback partners ("if you can't see the value at $149, move along"). Owner would prefer $199; chose $149 as the no-brainer filter for the founding five.
- **Target:** climb to **$499** once the automation/brand-library moat is real. Grandfather founders.
- **Updates model:** free patches/fixes within a major version; major versions (v2.0) are a discounted paid upgrade. Never charge for small patches (poisons the anti-subscription trust wedge).
- **Trial + refund:** 14-day full-feature trial (must include full automation, not gimped to dictation), then frictionless refund if not loved by end of first paid month.

### Honest positioning notes (don't overclaim)
- **Not offline.** Transcription uses cloud Whisper. Lead the cost story specifically vs Wispr (subscription); local-model tools (Superwhisper local mode, etc.) are $0 ongoing, so don't lean the whole pitch on "cheapest per use" — lead on ownership + automation + control.
- **Do NOT advertise Claude Code / MCP integration** — no such code exists. Advertise only what's real: dictation, AI Transform, URL/prompt actions, brand library, multi-provider BYOK.
- **The automation is real in code but was never end-to-end tested by the owner (cite D11).** Webhooks and prompt actions execute in code, but no real-endpoint e2e run has been done. It **must** be tested (Phase 1) before it becomes a headline sales claim — and the $499 price leans on it actually working. Treat "the automation works" as unverified until proven.
- Whisper is OpenAI's MIT-licensed open-source model; local whisper.cpp on Windows is a **roadmap** option that would add free/offline dictation and neutralize the offline concession (hardware-dependent quality). Not day-one.

---

## 4. The master build plan (phased)

Effort is calendar-rough for a solo builder. Each phase names what it unlocks and **what we are NOT building** (drift guard).

### Step 0 — Decision Log (do first, before any build)
Create **`docs/DECISION-LOG.md`** by going back through the **actual planning conversation turn-by-turn — NOT from memory** — and extracting each decision as a structured record (D1–D11, see §10): what we were solving, options weighed, what we chose, why, and what we rejected & why. This is the searchable "why" behind everything downstream. Building it from the real conversation (quoting real content) is a hard requirement so nothing is missed. **Also copy this master plan into the repo as `docs/MASTER-PLAN.md`** — it currently lives at `~/.claude/plans/…`, outside version control — so the plan and its Decision Log ship with the code and are searchable by future sessions. **And create `docs/BUILD-STATUS.md`** — the cross-chat live progress ledger (§13), seeded from the §12 checklist.

### Phase 0 — Start-now items (parallel, day 1) — external latency + correctness
Do these immediately because they either have long lead time or block correctness.
- **Code-signing enrollment — Azure Trusted Signing (~$10/mo).** Identity validation takes **days to weeks**. Starting late is the #1 launch trap. (EV certs are NOT needed — they no longer bypass SmartScreen as of 2024.) Note: the **updater is already signed** (minisign pubkey in `tauri.conf.json`) — that's separate from OS code-signing; auto-updates work today, we only lack the SmartScreen publisher signature.
- **Legal templates:** EULA (2-device grant, refund policy) + privacy policy (honest disclosure: audio → OpenAI Whisper; diagnostics → Supabase; brand docs stored locally in plaintext and leaving the machine only when pasted into a server-side tool; and that **BYOK provider keys transit third-party servers** — OpenAI, OpenRouter, Poe, and **Genesis/copycoders**, which receives your provider key via the `X-Provider-Key` header to run bots). ~0.5–1 day.
- **Bug bash / correctness:**
  - **Webhook clipboard guard bug (VERIFIED against code):** the POST/GET webhook branch at `src/App.tsx:1266-1289` does `simulate_copy` → 50ms → `get_clipboard_text` (line 1278) with **no `clipboardBefore` snapshot**, unlike the prompt path (App.tsx:1144-1161). The empty-check at line 1285 (`!selectedText || trim===""`) does NOT catch a *non-empty* stale clipboard — so triggering a webhook with nothing selected silently POSTs leftover clipboard text. Fix: port the snapshot-before/compare-after + 150ms settle from the prompt path into the webhook branch. **Must fix before charging for webhooks.**
  - Re-verify the **Dec-2025 7-bug list** (2 critical: language-param, fetchModels loop) — it's stale; some likely already fixed by recent commits. Fix what survives.

### Phase 1 — Founding Five @ $149 (~4–5 weeks)
**Goal:** ship a signed Windows build with the flagship real, to 5 hand-held feedback partners. **Licensing is MANUAL** — Stripe payment link/invoice + hand-issue a beta activation key (the system already supports beta keys + admin bypass). **Do NOT build checkout automation for 5 people** — that's a classic pre-launch time sink; defer to Phase 2/3.

**Built (structural foundation FIRST, then features):**
0. **Structural foundation — the §11 adopted spines, built BEFORE feature work (~1–1.5 wks):** (a) refactor the sprawling action types into one unified `Action{kind,…}` + per-kind executor (#3); (b) add optional per-action `provider`/`model` fields defaulting to the global setting (#2); (c) stand up the platform-neutral license schema — hashed per-OS `machine_id`, `license{tier,max_devices,version_entitlement,trial_expires_at}`, `activations` table (#1); (d) bump `SETTINGS_SCHEMA_VERSION`→3 with a forward migration that converts the owner's existing 40+ `WebhookAction`/`PromptAction` into the unified model, **tested against his real `config.json` for zero loss** (#4); (e) version-channel the updater + license-encoded entitlement so a v2 can't auto-push to v1 owners (#5). Brand-paste/Genesis then land on the right foundation instead of being retrofitted. **2am (atomic refactor):** the action-model change must update `getAllActions()` (App.tsx:1585), the per-action hotkey-registration effect (serialized via `actionRegLock`), the store's action slices, AND the three `transform_with_llm` invoke sites (App.tsx:712/886/1195) in **one pass** — miss `getAllActions()` and the voice matcher reads a stale/empty list, so voice commands silently stop matching (no error, just endless review windows).
1. **Brand Asset Library MVP (~2 wks):**
   - **Ingestion:** webview `<input type=file>` + `FileReader.readAsText` for **.txt/.md** (see §5 for why this over a plugin). Also allow paste-into-textarea.
   - **Storage:** a dedicated `brands.json` (lightweight metadata) + **one text file per document** in appdata, lazy-loaded at paste time. NOT localStorage (~5MB cap), NOT inside the monolithic `config.json` (rewritten on every settings save → clobber risk). `rusqlite` is available if scale later demands it.
   - **Voice + non-voice trigger:** a new action type where a brand doc becomes a named, matchable action whose execution is `pasteOutput(doc.text)`. **Ship a click/hotkey trigger in addition to voice** — see the onboarding wedge in §5.
   - **Management UI:** create brand → upload/paste docs → list/select. No existing screen to reuse.
2. **Providers (~1 wk), in the safe order (see §5):** refactor `transform()` once → add **Poe** (single key, easy) → add **Genesis/CopyCoders** (two-key, moderate).
3. **Signed installer** (from Phase 0 enrollment) + manual license issuance.

**Demo this phase enables:** say/click "paste testimonials" → the full doc drops into a Genesis bot *and* into ChatGPT; run AI Transform using the member's own Poe or Genesis key; dictate into Claude Code by voice.

**NOT building:** checkout automation, pdf/docx ingestion, onboarding wizard, brand doc search/RAG, Mac.

### Phase 2 — Harden & widen (~2–3 weeks)
**Goal:** fix what the five broke; open the door to strangers.
- Fix bugs/UX from founding-five feedback.
- **pdf/docx ingestion ONLY if demanded** — via a **Rust** parser crate (parse in Rust, not the webview).
- **Checkout automation:** Gumroad / Lemon Squeezy / Paddle wired to the Supabase `licenses` table (handles tax/VAT + auto-delivers a key).
- **Proof:** a stranger buys → auto-receives a license → self-installs a signed build.

**NOT building:** onboarding wizard yet (design it from real Phase 1 friction), Mac.

### Phase 3 — Climb to $499 (~3–4 weeks)
**Goal:** the full "voice command center" that justifies $499.
- **Onboarding wizard** — the 3-key BYOK setup (gen_ + provider + OpenAI-Whisper) is the **#1 refund risk**; design it *from* Phase 1 friction. "Clippy-style what-are-you-trying-to-do" guided setup.
- **Trial automation** — 14-day full-feature (grace-period infra exists; the trial flow differs — build it).
- **Positioning/marketing refresh** to the $499 anchor (the shipped $99 kit is superseded).
- **Optional:** Genesis-as-a-provider polish for the handful of one-shot/self-serve bots; richer brand management.

**NOT building:** pipeline/chain builder, embeddings/RAG, anything Kraken-shaped.

### Phase 4 — Mac (~2–3 days code, ~1–2 weeks testing/signing)
**Goal:** ship to the Mac waitlist collected at launch.
- Port is small (~150 lines Rust: Cmd+V/C paste, Chrome paths, window z-order, bundle/CI — the frontend is already platform-agnostic).
- **The blocker is TESTING, not building** — CI can compile the DMG but can't verify global hotkeys, Accessibility paste, mic, overlay. Needs a real Mac.
- **Apple Developer account ($99/yr)** required for Developer ID + notarization (Gatekeeper blocks unsigned).
- **De-risk:** recruit a Mac-owning founding-five member as the test partner (decision on buy-a-Mac-mini vs recruit vs cloud-Mac was deferred).

**NOT building:** iOS/Android, cross-device sync.

---

## 5. Technical reference (grounded in current code)

### 5a. Adding an AI provider (Poe, Genesis) — touches 6 files
**Rule: refactor once, then add.** `llm.rs` `transform()` (line ~186) is a clean 3-arm `&str` match. **First** widen its signature to thread an optional second key through all arms as `None` (pure refactor, verify no behavior change). **Then** add Poe (single key). **Then** Genesis (two-key). Adding providers before the refactor means doing the ripple twice.

1. **`src-tauri/src/secrets.rs`** — add enum variant(s) to `TransformProvider`; add arms to `credential_key`/`from_str`/`as_str`; append to `get_all_api_key_statuses`. **Genesis needs a SECOND keyring key** (keyring is one-secret-per-username) → new second-credential-key/slot pattern (new code, no existing template).
2. **`src-tauri/src/llm.rs`** — add dispatch arm; clone `transform_openrouter` (~line 198) for the custom base URL + headers; reuse `parse_openai_response`. Genesis base `https://gas.copycoders.ai/api/v1/chat/completions`, headers `Authorization: Bearer <gen_>` + `X-Provider-Key: <provider_key>`, `model` = bot slug. Poe base `https://api.poe.com/v1`, single `Authorization` header, `model` = bot handle. All **non-streaming** (existing pattern; use `stream:false`) — EXCEPT Genesis, which must stream (see 2am note below).
3. **`src-tauri/src/commands.rs`** — `fetch_provider_models` arm + `fetch_copycoders_models`/`fetch_poe_models` (clone `fetch_openrouter_models` which hits `/models`); in `transform_with_llm` (~line 1447) fetch both keys for Genesis and pass through; add a command/param to store the second key.
4. **`src-tauri/src/lib.rs`** — register any new commands in the `invoke_handler!`.
5. **`src/types/index.ts`** — add `"poe"` / `"copycoders"` to the `TransformProvider` union (~line 30). Dropdown auto-generates from this.
6. **`src/components/SettingsPanel.tsx`** — add `PROVIDER_INFO` entries (dropdown auto-updates); add placeholder/help-link branches; **add a second API-key input for Genesis** (no existing multi-key UI pattern — new).

No `App.tsx` change needed for keys (keys never cross the JS boundary; backend pulls from keyring) — but the action-model refactor does touch the transform call sites (§11 #3).

**Genesis API facts:** OpenAI-compatible; `GET /models` returns ~146 bots; `model` = **stable bot slug** (sidesteps the org's rotating share-link anti-theft); limits 1 concurrent stream/key + 60 req/min. `GET /models` needs only the `gen_` key (not the provider key), so `fetch_copycoders_models` sends one header. **UNRESOLVED:** whether **Poe** exposes an OpenAI-style `GET /models` list — verify during build; if not, ship a curated Poe model/bot list instead of a live fetch. **2am (verified against Genesis SKILL.md):** Genesis is **streaming-first** — its bundled helper streams, and its docs state non-streaming long generations hit proxy read-timeouts ("the server sends SSE heartbeats to prevent proxy timeouts"). So the Genesis provider must **NOT** reuse the 60s non-streaming `transform` path: raise its timeout to ~300s **and** accumulate the SSE stream (`stream:true`), or long copywriting jobs (full ad sets, VSLs) die with a `Timeout`. Also **serialize Genesis calls per key** — a 2nd concurrent call returns `429 connection_limit_error`; show a "still working" toast, not a raw 429. Note: most Genesis bots are **stateful/conversational** (need "ready" + questions + research docs), so they're a poor fit for one-shot voice-transform — the brand library (below) is the better integration for them; provider-mode suits the self-serve/one-shot bots only.

### 5b. Brand Asset Library — reuse vs new
**Reuse as-is:**
- **`pasteOutput()` (`src/App.tsx:138`)** takes any string and handles clipboard + Cursor Lock + foreground/locked-window paste → "paste chosen doc" is essentially already built. Rust `copy_to_clipboard`/`paste_text`/`paste_to_target` unchanged.
- **`matchVoiceCommand` (`src/utils/fuzzyMatch.ts`)** matches any `{name}`-bearing action (4-tier fuzzy).
- **`getAllActions()` (`src/App.tsx:1585`)** is the injection point; the record→transcribe→match→execute flow (`startVoiceCommandRecording` ~1663) + dispatch-by-shape (~1838–1844) extend with one new branch.
- Settings↔Rust-file persistence round-trip is the template for a brands store.

**Genuinely new:**
1. **Ingestion (the main gap):** app currently CANNOT read a local file. **Decision: webview `<input type=file>` + `FileReader.readAsText`** for v1 (txt/md). Rationale: zero new Rust surface, zero capabilities JSON, native OS picker, identical on Windows/Mac, sidesteps macOS hardened-runtime file-access entitlements in Phase 4, smaller signed bundle. Ingestion = copy text into storage and **discard the path** (we never need persistent path access, which is the only thing `tauri-plugin-fs` buys). pdf/docx later via a Rust parser (Phase 2, demand-driven). **Verify early (spike):** confirm the HTML file input actually opens a native picker in the installed WebView2 build and `FileReader` returns text; if it doesn't, fall back to a custom `#[tauri::command] read_file_text(path)` (trivial via `std::fs::read_to_string`) + `tauri-plugin-dialog` for the picker.
2. **Storage:** `brands.json` (metadata) + per-doc text file in appdata, lazy-loaded. Keep OUT of localStorage and OUT of `config.json`. **Read `brands.json` directly at action-assembly time** (hydrate in memory at startup + on change) — do NOT mirror brand metadata into settings/`config.json` (concurrent-write clobber). Because no fs plugin is adopted, brand persistence = **new custom Rust commands** — `list_brands`, `save_brand_doc`, `load_brand_doc`, `delete_brand_doc` — writing to `<config_dir>/SpeakEasy/brands/` (mirrors the existing `config.rs` file pattern). `rusqlite` (Cargo.toml:45) is on hand if doc volume later warrants it.
3. **New action type / dispatch branch** → execution is `pasteOutput(doc.text)`, injected into `getAllActions()`.
4. **Brand/document management UI** (new screen; the vestigial `vocabulary` feature shows the persist pattern but has no CRUD/UI to borrow).

### 5c. The onboarding wedge (important)
Pasting a brand doc is **pure local text — needs NO API key.** So expose a **click/hotkey trigger** (not just voice): a brand-new user gets the first "wow" with **zero keys entered**, then adds the Whisper key to unlock voice-triggering, then the LLM key for AI Transform. This **inverts the front-loaded 3-key wall** that is the #1 refund risk. Concrete Phase 1 requirement: ship the non-voice trigger. **Precision:** *voice*-triggering a brand paste still needs the OpenAI Whisper key (to transcribe the spoken command), so the genuinely zero-key first-run is specifically the **click/hotkey** trigger — that's the one that must ship, not just the voice path. (Minor 2am: brand paste overwrites the user's clipboard with the doc via `pasteOutput`→`copy_to_clipboard`; optionally save/restore their prior clipboard — low priority.)

### 5d. Voice-command namespace collision (design in Phase 1)
`getAllActions()` merges brand docs + URL + prompt actions into one fuzzy-match space; at scale, doc names collide. **Namespace brand paste under a verb** ("paste {doc}") or require brand context ("from Acme, paste testimonials"). Decide this in Phase 1, not after.

### 5e. Large documents, storage limits & UI home (the "how big can files be" question)
**Research docs are big** — typically 16–227 KB, some **multiple MB**. Same failure class as the recent history-quota bug (`fix(storage): cap history below localStorage quota`), so it's a decide-upfront item.
- **Storage limit on our side: effectively none.** Brand docs live as **real files on disk** in appdata (drive-limited, not browser-limited). localStorage's ~5 MB shared cap — the cause of the history bug — is deliberately avoided. A 2 MB doc is just a 2 MB file.
- **The downstream limit is verified much larger than feared.** All current frontier Claude models (Opus 4.8, Sonnet 5, Fable 5, Opus 4.6+/Sonnet 4.6) have a **1M-token context window (~4 MB of text)**; only Haiku 4.5 is smaller at 200K (~800 KB). Rough rule: **~250 tokens/KB** (~4 chars/token).
- **Verified against the real data (2026-07-08):** the Kraken's actual research docs are small — typically 15–30 KB, largest ~267 KB (~67k tokens) — and the Kraken **injects them WHOLE into the model, no chunking/truncation**, in its core engine (`resolveSingleDocument` "returns full content (no truncation)"; chunk/embed/RAG exists only for its separate large swipe-file subsystem). Every real doc fits whole in ONE paste: the ~267 KB max is ~7% of a 1M window and fits even in Haiku's 200K. The earlier context-limit worry was **overblown** for these files.
- **DECISION (LOCKED 2026-07-08): paste the whole doc — no waves, no splitting, no caps in v1.** Verified correct for the real files. The only residual edge (a multi-MB doc into a *small-window* target) still fits the 1M-context models realistically in use, and there are only "a couple" that big — accept it. Splitting/named-sections is explicitly OUT of scope for v1.
- **UI home:** the main window (550×750) is too small for a document manager. Build the Brand Library as a **dedicated, resizable view/window** (the app already spawns auxiliary windows), NOT crammed into the main window or the 1,695-line `SettingsPanel.tsx`. Sketch → rough build → iterate with the five.

---

## 6. Launch readiness (commercialization / distribution / legal)

| Tier | Item | Phase | Notes |
|---|---|---|---|
| 1 | Windows code signing | 0 (enroll) → 1 | Azure Trusted Signing ~$10/mo; enrollment latency is the trap |
| 1 | Manual licensing for the five | 1 | Stripe link/invoice + hand-issued beta key; system already supports it |
| 1 | Pin the price | done | $149 founding-five → $499 target |
| 2 | Checkout automation | 2 | Gumroad/Lemon Squeezy/Paddle → Supabase `licenses` |
| 2 | Webhook e2e test vs a real endpoint | 1–2 | Before webhooks are a headline claim |
| 0/2 | EULA + privacy policy | 0 | Cover local plaintext brand docs + cloud disclosures |
| 3 | Onboarding wizard | 3 | The 3-key BYOK setup = #1 refund risk |
| 3 | Trial automation (14-day) | 3 | Grace-period infra exists; trial flow differs |

---

## 7. Open decisions (to confirm as we execute)
- **Final $499 timing/number** and the founding→$499 grandfather mechanic.
- **Checkout vendor** (Gumroad vs Lemon Squeezy vs Paddle) — Phase 2.
- **pdf/docx ingestion** — build in Phase 2 only if the five demand it.
- **Voice namespace scheme** for brand paste (verb-prefixed vs brand-context).
- **Mac testing method** — buy a used Mac mini (~$450) vs recruit a Mac founding-five member vs cloud Mac (deferred).
- **Provider scope** — confirm both Poe and Genesis for Phase 1, or Poe first / Genesis Phase 2.
- **Local whisper.cpp** offline/zero-cost dictation — roadmap, revisit post-$499.

---

## 8. Verification (how we prove each phase works)
Use the project-local `/test-protocol` (`node scripts/test-protocol.mjs`) for the full lint → typecheck → build → Tauri release → install → launch loop before any commit. Then manual smoke per feature:
- **Providers:** in Settings, add Poe key → fetch models → run an AI Transform → confirm output pastes. Repeat for Genesis with both keys (`gen_` + provider); confirm a `400` if the second header is missing (proves the two-key path).
- **Brand library:** create a brand → upload a `.txt` and a `.md` → confirm stored → trigger paste by **click** (no keys set) into Notepad → then by **voice** into a Genesis bot textbox and into ChatGPT. Confirm Cursor Lock routes the paste to a chosen window.
- **Onboarding wedge:** fresh profile, no keys → click-paste a brand doc succeeds (proves the zero-key first-run).
- **Clipboard bug fix:** trigger a webhook/action with nothing selected → confirm it errors (does NOT send stale clipboard).
- **Signed installer:** download the release on a clean Windows box → confirm no "unknown publisher" SmartScreen block.
- **Mac (Phase 4):** on a real Mac — global hotkey registers, Accessibility paste works, mic captures, overlay stays on top, notarized DMG opens without Gatekeeper override.

---

## 9. Governance — "what we are NOT building" (anti-Kraken)
- Brand library = **paste-only**. No search, no embeddings, no RAG, no auto-chaining.
- Providers = **transform-only** (Genesis streams; the rest non-streaming). Not a chat client.
- No pipeline/workflow builder inside SpeakEasy.
- No Claude Code / MCP integration claims until (and unless) code exists.
- Every feature passes the 30-second-for-a-beginner test, or it doesn't ship.
- **No secrets or customer content in logs.** New brand/provider code must never log document bodies or API-key values — the diagnostics uploader (`diagnostics.rs`) ships WARN/ERROR lines + `crash.log` to Supabase, so a stray log line would exfiltrate a customer's docs or keys and break the privacy wedge. Audit + scrub before shipping.

---

## 10. Companion Decision Log (the *why*)

The reasoning, rejected paths, and competitive intel behind this plan live in **`docs/DECISION-LOG.md`** as structured decision records. This plan cites them by ID:

| ID | Decision | Core "why" |
|---|---|---|
| **D1** | Desktop app, not cloud/web | Browsers can't do global hotkeys, auto-paste into other apps, or selection capture — the core job. Even Wispr is native. |
| **D2** | No chat-client / bot "cockpit" | Redundant with the group's OpenClaw + Claude Code agentic OS; would drift into the Kraken. |
| **D3** | Brand Asset Library as flagship | Genesis bots are stateful (ready → questions → need docs), killing one-shot voice-transform; doc-injection is the in-lane win. |
| **D4** | BYOK one-time; $149 founding-five → $499 | Anti-Wispr "own it, your keys"; $149 as the founding-five filter, $499 as the moat-backed target. |
| **D5** | Competitive positioning & intel | Comps: Wispr (sub), Superwhisper ($250 lifetime, local), Dragon ($700), MacWhisper ($69); lead cost vs Wispr only. |
| **D6** | Value evidence = real daily usage | URL shortcuts (Gmail 15×/day, Zoom/schedule links) + dictation are proven wins, not hypotheses. |
| **D7** | Market & ambition | ~300-person group, ~100 already on Wispr; reclaim that spend, corner the niche. |
| **D8** | Provider strategy (Poe + Genesis) | Both OpenAI-compatible; stable slugs/handles beat rotating links; BYOK keys they already own. |
| **D9** | Local whisper.cpp roadmap | Open-source MIT model → offline + zero-cost dictation; neutralizes the one concession. Post-$499. |
| **D10** | Mac: small build, testing is the blocker | ~150 lines Rust; no Mac to test on; deferred behind a launch waitlist; Apple Dev $99/yr for notarization. |
| **D11** | Team-volume tiers (future) + automation-untested caution | Volume tiers deferred; automation coded but never e2e-tested — verify before charging/claiming. |

Living document — append new decisions and mark superseded ones rather than deleting.

---

## 11. Structural / load-bearing decisions to nail BEFORE building

These are hard-to-reverse once real customers exist. **All six recommended defaults below were ADOPTED by the owner on 2026-07-08** — they are the plan of record and must be built into the Phase 1 foundation (schema, action model, migration, updater channels), not retrofitted. Revisit only if implementation surfaces a real risk.

1. **License & activation architecture — the spine. [ADOPTED DEFAULT]** One schema (`license.rs` + Supabase) must serve: 2-device slots (with re-activation when MachineGuid changes on reinstall/new PC — the #1 refund driver), trial→paid conversion, and **platform-neutral machine identity so a Mac client works on a Windows-bought license**. Changing it post-launch = live-DB migration + locked-out buyers. *Default:* platform-abstracted hashed `machine_id` (per-OS provider); `license` row `{tier, max_devices, version_entitlement, trial_expires_at}`; `activations` table with device slots + self-service deactivate. **2am:** existing beta activations are already bound to the Windows `win-<hash>` MachineGuid format — the new scheme MUST keep that as the Windows provider's output and the `activations` migration MUST preserve existing rows, or current beta users lock out on their next validation. Design the schema NOW (backward-compatible); checkout/Mac implement later against it.
2. **Global vs. per-action provider/model/key. [ADOPTED DEFAULT]** Today `transformProvider`/`transformModel` are ONE global setting; the command-center vision is mixed (action A → Genesis MarioBot, action B → Poe GPT). Retrofitting per-action after building on the global assumption = action-model rip-out. *Default:* optional per-action `provider`/`model` fields, falling back to the global default; baked into the action schema from v1.
3. **Unified action model vs. more special-cased branches. [ADOPTED DEFAULT]** Actions are already a sprawling union (`WebhookAction{POST/GET/URL/SMART_URL/PROMPT}` + `PromptAction` + main hotkeys) run by a ~380-line switch (`executeWebhookAction`, App.tsx:955-1332); the clipboard bug lived in one branch. Adding brand-paste + Genesis as two more special cases deepens the sprawl. *Default:* refactor to one `Action` type with a discriminated `kind` + clean per-kind executor BEFORE adding the new kinds. This is also where the **voice-command namespace** is fixed — address docs as `(brand, type)`, not a flat colliding space.
4. **Config schema versioning & migration chain.** Own-it-forever + paid v2 means customers accumulate 40+ actions, brands, keys over years; a v1→v2 that loses data is catastrophic. **CORRECTION (verified): a version already exists — `SETTINGS_SCHEMA_VERSION = 2` (`src/types/index.ts:33`) + `migrateSettings`.** So this EXTENDS it, not invents it: bump to **3**, add forward migrations for the unified action model, the per-action provider fields, and the new brands store, and add a test that loads a real v1 and v2 config and migrates with **zero data loss**. **2am (two-sided migration):** the Rust `config.rs` structs load config.json with `#[serde(default)]`, which *silently defaults/drops unknown fields* — so a unified-action shape change would wipe the owner's 40 actions on the **Rust load**, BEFORE the TS `migrateSettings` ever runs. Keep the Rust action fields backward-compatible (old fields optional) during the migration window, or migrate Rust-side; test against his real pre-refactor config.json. Establish before the five.
5. **Updater version-channel vs. paid-v2 entitlement. [ADOPTED DEFAULT]** The updater blindly pulls `latest.json`; if v2 is a paid upgrade, it must NOT auto-push v2 to v1 owners (gives away the paid upgrade / breaks their license). Welded to #1. *Default:* version-channel the updater (v1.x patches on the v1 channel); license encodes `version_entitlement`; v2 is a separate purchase/download, not an auto-update. **2am:** the updater endpoint is hardcoded to `…/releases/latest/download/latest.json` (`tauri.conf.json`); the channel repoint (e.g. `v1/latest.json`) MUST ship **in the founding-five v1 build**, because any v2 later cut to bare `latest` auto-pushes the paid upgrade to every already-installed v1 client. Repoint now, not later.
6. **Transcription provider seam (decouple from transform).** Transcription is welded to OpenAI Whisper (`transcription.rs`); transform is already multi-provider. BYOK + local-Whisper/Groq roadmap (D9) needs transcription pluggable too. *Default:* define a `TranscriptionProvider` interface now (only OpenAI implemented) so Groq/local slot in without touching the record→transcribe path. Lowest urgency; cheap insurance.

**Coupling:** #1 ↔ #5 are one system (license entitlement drives the updater). #2 ↔ #3 are one system (per-action routing lives in the unified action model). #4 protects all of it across upgrades. Nail these four spines before Phase 1; #6 is a seam to define now and implement later.

---

## 12. Execution Checklist (Step 0 → Phase 0 → Phase 1)

Each row is a discrete, verifiable action. "Done when" is a real check, not a vibe. Live status lives in `docs/BUILD-STATUS.md`. Later phases (2–4) get their own checklist when reached.

| id | Step / action | Done when… | Depends on |
|----|---------------|------------|------------|
| **S0a** | Write `docs/DECISION-LOG.md` (D1–D11) from the actual conversation | File exists; contains 11 structured entries D1–D11, each with options/chosen/why/rejected | — |
| **S0b** | Copy master plan into repo as `docs/MASTER-PLAN.md` | File exists in repo and matches the plan | S0a |
| **P0-sign** | Start Azure Trusted Signing enrollment | Enrollment submitted; portal/email shows "pending/active" status | — |
| **P0-legal** | Draft EULA + privacy policy | `docs/legal/EULA.md` + `PRIVACY.md` exist; privacy names OpenAI/OpenRouter/Poe/Genesis-copycoders key transit + local plaintext brand docs | — |
| **P0-clip** | Fix webhook clipboard-guard bug (App.tsx:1266-1289) | Trigger a webhook action with **nothing selected** → toast "No text selected", **no POST** fires (verify via console/network log) | — |
| **P0-bugs** | Re-verify the Dec-2025 7-bug list | Each bug marked fixed / still-open with evidence; the 2 criticals fixed (`npm run lint`+`typecheck` clean) | — |
| **P1-action** | Refactor to unified `Action{kind}` + per-kind executor (#3) | `npm run typecheck` + `cargo check --all-targets` pass; existing actions still execute (manual smoke) | — |
| **P1-provfield** | Add optional per-action `provider`/`model` fields (#2) | Action schema carries the fields; unset → uses global default; a test action with an override routes correctly | P1-action |
| **P1-license** | Stand up license schema: platform-neutral `machine_id`, `license`, `activations` (#1) | Supabase tables exist; `validate_license` works on Windows; the machine-id interface has no Win-only type in its signature (Mac-ready) | — |
| **P1-migrate** | Bump `SETTINGS_SCHEMA_VERSION`→3 + forward migration (#4) | Loading the owner's real `config.json` migrates all 40+ actions into the unified model with **identical count before/after** (assert in a test) | P1-action, P1-provfield |
| **P1-updater** | Version-channel updater + license entitlement (#5) | A simulated `latest.json` advertising v2 does **not** prompt a v1 client to update; v1.x patch does | P1-license |
| **P1-txfactor** | Widen `llm::transform()` to accept an optional 2nd key (all arms `None`) | `cargo check` passes; existing OpenRouter transform still returns text (real call) | — |
| **P1-poe** | Add Poe provider (single key) end-to-end | `TransformProvider` + `PROVIDER_INFO` + secrets + dispatch updated; AI Transform on a real Poe key returns text | P1-txfactor |
| **P1-genesis** | Add Genesis/CopyCoders provider (two-key + `X-Provider-Key`, model=slug) | A real Genesis bot call returns text; `GET /models` (gen_ key only) lists bots; missing 2nd key → 400 | P1-txfactor |
| **P1-ingest** | Brand ingestion spike (webview `<input type=file>` + `FileReader`) | In the **installed** build, picking a `.txt`/`.md` returns its text; if not, `read_file_text` fallback returns it | — |
| **P1-store** | Brand storage commands (`list/save/load/delete_brand_doc`) | A saved doc under `<config_dir>/SpeakEasy/brands/` survives an app restart and reloads | P1-ingest |
| **P1-paste0** | Zero-key brand paste (click/hotkey) | With **no API keys set**, click/hotkey a brand doc → full text pastes into Notepad | P1-store |
| **P1-pastevoice** | Voice brand paste | With Whisper key set, say the doc's name → transcribes → pastes into a focused box | P1-store |
| **P1-installer** | Signed installer | Clean Windows box installs the release with **no** SmartScreen "unknown publisher" block | P0-sign |
| **P1-license-issue** | Issue a manual founding-five license | A hand-issued key activates; app launches with **no** offline/unlicensed banner | P1-license |

**2am-hardening rows (from /ultrathink):**

| id | Step / action | Done when… | Depends on |
|----|---------------|------------|------------|
| **P0-logscrub** | Audit logging in brand/provider/diagnostics paths | `grep` confirms no doc bodies or key values reach logs; a forced brand-paste error logs a **redacted** line | — |
| **P1-updater-repoint** | Repoint updater to a **versioned** channel in the v1 build | Installed v1's updater URL contains a version segment (not bare `latest`); a v2 `latest.json` does NOT prompt a v1 client | P1-license |
| **P1-migrate-rust** | Rust config load preserves the OLD action shape | Loading the owner's real pre-refactor `config.json` via `load_user_settings` returns all 40+ actions (none default-dropped) **before** TS migration | — |
| **P1-license-compat** | Existing beta activation still validates | An activation created under the old `win-<hash>` scheme validates green after the schema migration | P1-license |
| **P1-action-voice** | Voice matcher intact post-refactor | After the unified-action refactor, `getAllActions()` returns all migrated actions and a **spoken** command matches+executes (not just the review window) | P1-action |
| **P1-genesis-long** | Long Genesis generation doesn't time out | A Genesis bot job running **>60s** returns full text (SSE-accumulated, ~300s timeout), no `Timeout` | P1-genesis |
| **P1-genesis-busy** | Genesis concurrency handled | Triggering a 2nd Genesis call while one runs shows a "still working" toast, not a raw `429` | P1-genesis |

**UNRESOLVED (no concrete fix yet — do not silently drop):**
- **Poe `GET /models`** may not exist / may return hundreds of bots. Verify at P1-poe; fallback = curated Poe model list. (Tracked in §5a.)
- **Poe private org bots** — verify a member's OWN Poe key can invoke the ORG's (possibly private) bots by handle via the API **before** advertising "connect your Poe." Same vapor-risk class as the Claude Code/MCP claim; gate before marketing it.
- **Mac runtime testing** — deferred by owner; no test machine chosen. Blocks Phase 4 only, not the founding-five launch.

---

## 13. Continuity & multi-chat execution (this plan spans many chats)

**Verified state (2026-07-08):** code continuity = **git only**, and only once committed/pushed (uncommitted work is invisible to the next chat). Decisions/context = **memory files + `docs/DECISION-LOG.md`** (durable, cross-chat). Progress = **GAP** — the per-session `.active-plan.<session_id>.json` is **git-ignored (`.gitignore:49`) and session-scoped**, so it's a within-chat foreman only, NOT a cross-chat truth (a stale `.active-plan.e3678faa-…json` from a June session sits unread). `docs/handoffs/` exists (the `/handoff` mechanism).

**EXECUTION MODE (DECIDED 2026-07-08): serial CORE + parallel side-tracks.** The CORE thread (Track A action model → Track B providers) runs as ONE serial chat on `feature/core` (it owns the god-files). **From day one, in parallel side-chats:** license+updater on `feature/license` (Track C), and Phase 0 signing enrollment + legal docs (independent). Brand scaffolding on `feature/brand` (Track D) runs in parallel too, pausing only for the final `getAllActions()` wiring until CORE lands. All chats obey the ledger + rituals below.

**The fix — one cross-chat live ledger:** `docs/BUILD-STATUS.md`, committed to git, table = §12 rows + columns `{status: todo/in-progress/blocked/done, evidence, chat-date, branch}`. **Every chat reads it first and updates it last.** It is the single source of truth for "what's done"; the per-session `.active-plan` stays the in-chat foreman.

**Parallel vs. serial (from §12 deps + shared-file reality):**
- **Shared "god files" — NEVER edit from two chats at once:** `App.tsx` (hotkeys, `getAllActions`, action execution, transform call sites, paste), `llm.rs`, `commands.rs`, `secrets.rs`, `config.rs`, `stores/appStore.ts`, `types/index.ts`.
- **CORE thread (single-chat, serial):** Track A structural foundation (action model → per-action provider → migration) → Track B providers (Poe/Genesis). Both hit the App.tsx/llm.rs/commands.rs cluster → same chat/branch, in order. The migration runs AFTER the action refactor, tested against the real config once.
- **Safe in a PARALLEL chat (separate branch + files):** (C) license schema + updater channel (`license.rs`, Supabase, `tauri.conf.json`); (D) brand-library scaffolding (new brands module + commands + UI + ingestion) **up to** wiring brand-paste into `getAllActions()` — that final wiring waits for Track A; (Phase 0) signing enrollment + legal docs — fully independent, start immediately (signing has external latency).
- **Feasible concurrency:** CORE(A→B) ‖ License+Updater(C) ‖ Brand-scaffold+Phase0(D). **NOT allowed:** two chats both in the App.tsx/llm.rs/commands.rs cluster.

**Rituals (enforce):**
1. **Branch-per-track** — `feature/core`, `feature/license`, `feature/brand`; merge in dependency order (C independent; A→B→D-wiring).
2. **Commit/push at every chat boundary** — `/save-progress` mid-work, `/full-deploy-light` or `/wrapup` at end. Nothing continues until pushed.
3. **Start-of-chat:** read MASTER-PLAN.md → BUILD-STATUS.md → DECISION-LOG.md → `git log`/`git status`; pull latest. Only start a §12 item whose deps are `done` in the ledger; mark it `in-progress` + your branch so a parallel chat doesn't grab it.
4. **End-of-chat:** update BUILD-STATUS.md (done/blocked + evidence), commit/push, add build-time gotchas to memory.
5. **§12 `Depends on` is law** — out-of-order execution (e.g. migration before the action refactor) is where corruption/wedge happens.

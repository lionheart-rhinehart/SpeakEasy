# SpeakEasy — Decision Log

> The **why** behind the master plan. The plan (`docs/MASTER-PLAN.md`) is the *what/how*; this is the *why*, the options we weighed, and the paths we **rejected** — so we never re-litigate a settled decision or re-walk a dead end. Each decision is cited from the plan by ID (D1–D11).
>
> Format per entry: **Context** (what we were solving) → **Options considered** → **Decision** → **Why** → **Rejected & why** → **Status**. Living document: append new decisions; mark superseded ones rather than deleting.
>
> _Created 2026-07-08 from the planning conversation (not from memory)._

---

## D1 — Desktop app, not a cloud/web app

**Context.** The owner opened with: *"this is not going to work if it has to be a desktop app because we have so many Mac users… what would it take to make this into a cloud based version where it doesn't have to be a desktop app?"*

**Options considered.**
- **A. Pure web app (SaaS in a browser tab)** — instant cross-platform, zero install.
- **B. Web app + browser extension** — inject text into *web* targets only.
- **C. Thin native agent + cloud control plane** — small native helper for OS primitives, everything else in the cloud (a v2 re-platform).
- **D. Browser-extension companion** — good only if targets are web apps.

**Decision.** Stay a **desktop app** (Windows now, Mac port later — see D10). Do **not** go browser-based.

**Why.** A browser **physically cannot** do the thing that makes SpeakEasy valuable — press a hotkey anywhere, speak, and text lands in whatever app you're in. Four OS-level powers the browser sandbox forbids: global hotkeys that fire when the app isn't focused, auto-paste into any native app, capturing the current selection from another app, and always-on-top overlay/tray. **Even Wispr Flow (the competitor) is a native app on all four platforms** — there is no browser product that dictates into any app, because the OS sandbox forbids it. "Go cloud to cover Mac" conflated two different problems: *Mac coverage* (solved by the desktop Mac port, D10) vs. *no-install browser* (only achievable by giving up the auto-paste/hotkey magic).

**Rejected & why.** A **pure web app** guts the differentiator — it degrades to a "dictation notepad" (record in a tab, copy the text out manually). The thin-agent cloud re-platform (C) is the only genuinely attractive "cloud" idea, but it's a months-long v2, not a way to cover Mac now.

**Status.** Decided.

---

## D2 — No chat-client / bot "cockpit"

**Context.** We explored building a simple local-host chat browser inside SpeakEasy that lists the Genesis bots and lets the user chat back-and-forth (with voice input), after realizing the bots are conversational (see D3).

**Options considered.** Build a voice-driven desktop chat cockpit for the bots, vs. not building one.

**Decision.** **Do not** build a chat client / cockpit.

**Why.** The group already has **OpenClaw + their own agentic OS (Claude Code) + the Genesis portal** to chat with these bots. A SpeakEasy chat window would be a *worse, redundant* version of tools they already own. Owner: *"they actually even have their own agentic OS model that they've built and people are utilizing it right now. So that may put this completely dead in the water."* It would also bloat SpeakEasy into **"the Kraken"** — the owner's separate, far more advanced marketing system — which is explicitly off-strategy.

**Rejected & why.** The cockpit fails the "how is this better than the portal they already have?" test unless it's a full voice-first, desktop-wired experience — and that scope turns SpeakEasy into the Kraken.

**Status.** Decided (killed).

---

## D3 — Brand Asset Library as the flagship (the pivot)

**Context.** The bots don't work one-shot. Owner: *"each one of these bots has to be activated with the words ready first… then it has a series of initial questions to ask… it requires research documents to actually go and write."* So "say the bot's name → paste the result" is a non-starter.

**Options considered.**
- (a) One-shot voice transform → **dead** (bots are stateful/conversational).
- (b) Chat cockpit → **dead** (D2).
- (c) Store research docs/brand assets in SpeakEasy and **voice-recall + paste** them into whatever tool asks for them.

**Decision.** Build the **Brand Asset Library** (option c) as the flagship: create brands, upload docs (research, testimonials, voice guides) as text, then paste a chosen doc into any focused textbox by voice **or** click/hotkey.

**Why.** It stays in SpeakEasy's lane (hold text → trigger → paste), and it *feeds* the tools the group already uses instead of competing with them. It works across **all** tools — including server-side bots that are **blind to local files** (Genesis bots run at `gas.copycoders.ai` and can't read your disk, so you must paste). And the decisive insight: **most of the group is "so far behind" they can't drive their agentic OS** — owner: *"most people are so far behind… they don't even really know how to use Claude code appropriately, that this would still be a massive upsell."* So a dead-simple easy-button is valuable even where their OS *could* handle docs. Simplicity is the product.

**Rejected & why.** The "just point Claude Code at the workspace" objection assumes users can operate Claude Code — the ground truth is they can't. And their core tool (Claude Code) reads local files natively, so the doc-library's value concentrates in the **blind** tools (server-side bots, ChatGPT, web tools).

**Status.** Decided (flagship).

---

## D4 — BYOK, one-time; $149 founding-five → $499 target

**Context.** The shipped marketing kit priced at **$99 one-time**; the latest strategy note leaned **$499**. A live contradiction ("you can't sell at two prices"), flagged 2026-07-08.

**Options considered.** $99 (matches the kit) / $499 (matches the strategy note) / a middle anchor.

**Decision.** **BYOK (bring your own key), one-time purchase (not subscription).** Launch at **$149, hard-capped at the first FIVE buyers** as feedback partners; **target $499** once the moat is real; grandfather founders.

**Why.** BYOK is a deliberate selling point — the user controls their own usage/spend and can connect keys/subscriptions they already pay for (Poe points, OpenRouter, Anthropic, OpenAI). On price: $99 *underprices* the automation moat; $499 *demands* a proven moat + flawless onboarding or refunds spike; **$149 is the no-brainer filter** — owner: *"if you're not going to take this at $149… move along."* Anchor-low-then-raise is safer than anchor-high-then-discount (going up reads as momentum; going down reads as weakness). Owner would prefer $199 but chose $149 for the founding five.

**Rejected & why.** Pure $99 leaves money on the table and signals "cheap dictation"; immediate $499 is too risky before the automation moat is battle-tested.

**Status.** Decided (exact $499 timing/mechanic still open — §7).

---

## D5 — Competitive positioning & intel

**Context.** Verified what one-time/lifetime competitors charge, to anchor D4 and keep marketing honest.

**Decision / content (verified 2026-07-08).**
- **Dragon Professional v16 — $699.99 perpetual** (Windows, dictation-only, no automation, stale/abandonware) → the *ceiling reference*, not a real rival.
- **Superwhisper — $249.99 lifetime** (Mac, local models, dictation-only) → the *mid-anchor* and closest modern comp.
- **MacWhisper — ~$69 lifetime** (file transcription only).
- **Wispr Flow — no one-time option; $15/mo only** (the group's actual competitor).
- **Nobody sells SpeakEasy's dictation + automation blend one-time** → anchoring freedom.

**Why it shapes marketing.** **Whisper is OpenAI's MIT-licensed open-source model**, which is why the lifetime crowd (Superwhisper local mode, MacWhisper) has **$0 ongoing cost** — they run it on-device. So **don't over-lean on "cheapest per use"** (local tools are free); lead the cost story specifically **vs Wispr (subscription)**, and lead overall on ownership + automation + control.

**Status.** Decided (positioning rules of the road).

---

## D6 — Value evidence: the owner's real daily usage

**Context.** What actually earns its keep today, as the evidence base for the value prop (cited in §2 of the plan).

**Content.** Dictation + firing the **same URL shortcuts by voice dozens of times a day** — owner: opening Gmail *"like 15 times a day,"* standing Zoom/scheduling links — plus custom prompt actions. These are **demonstrated everyday wins, not hypotheses.**

**Decision.** Lead demos with the URL-shortcut/quick-launch workflow; the brand library extends the same "say it, it happens" muscle to research docs.

**Status.** Recorded (evidence base).

---

## D7 — Market size & ambition

**Context.** Sizing the opportunity for this specific group.

**Content.** Owner: *"there are over 300 people just in this one group alone and I'd say easily 100 of them are currently using WhisperFlow. So right off the bat, we're charging $500 a pop and I get those $100 to buy mine."* The play: reclaim that Wispr spend and **corner the niche.**

**Status.** Recorded.

---

## D8 — Provider strategy: wire Poe + Genesis (both BYOK, OpenAI-compatible)

**Context.** Owner wants BYOK wired for OpenRouter (already present), **Poe** (the group already pays for Poe — *"use what you're already paying for… that's going to be like a massive selling point"*), and the group's **"skill server" = Genesis Bots (OpenClaw)**.

**Verified.**
- **Poe** has an OpenAI-compatible API (`api.poe.com`); **subscribers use their existing subscription points via the API at no extra cost**; bots are callable by **stable handle** through the `model` field (sidesteps the org's every-2-weeks rotating share-link anti-theft).
- **Genesis** is a plain **OpenAI-compatible HTTP API** (`https://gas.copycoders.ai/api/v1`, `/chat/completions` + `/models`), two-header auth (`Authorization: Bearer gen_…` + `X-Provider-Key: <provider key>`), `model` = a **bot slug**. So SpeakEasy can call it **directly** — no Claude Code bridge, no MCP.

**Decision.** Wire **both Poe and Genesis** as first-class providers (each ~1 day, mirroring the OpenRouter path; Genesis needs a 2nd key).

**Why.** Lets members leverage keys/subscriptions they already own; the Genesis integration is the concrete thing that justifies the climb to $499.

**Caveat.** Poe/Genesis are **LLM-only** — transcription still needs an **OpenAI Whisper** key. So a group member juggles up to **three keys** (gen_ + provider + Whisper) → reinforces the onboarding-wizard priority. (Two open verifications remain — Poe `/models` shape and whether a member's own key can call the org's *private* Poe bots — tracked in the plan's UNRESOLVED list.)

**Status.** Decided.

---

## D9 — Local whisper.cpp as a roadmap option (not day-one)

**Context.** Since Whisper is open-source (D5), SpeakEasy could run it locally on Windows.

**Decision.** **Roadmap** (post-$499), not day-one.

**Why.** Adding local whisper.cpp (or Groq) would give **free + offline** dictation and **neutralize the one concession** SpeakEasy makes against everyone ("not offline"). But Windows local speed/quality is **hardware-dependent** (great with an NVIDIA GPU or small models; Macs cheat via the Neural Engine), so it's a differentiator to earn later, not a launch requirement. It also motivates the **transcription-provider seam** (structural #6) so it can slot in without touching the pipeline.

**Status.** Roadmap.

---

## D10 — Mac: the build is small, the *testing* is the blocker

**Context.** Owner: *"we have so many Mac users"* but *"I don't have a Mac to test it on."*

**Verified.** A `MacOS-Build/macOS-Port-Plan.md` already exists — the port is **~150 lines of Rust** across 3 files (Cmd+V/C paste, Chrome paths, window z-order) + bundle config + CI; the React frontend is already platform-agnostic. **The blocker is TESTING, not building** — CI can compile the DMG but cannot verify global hotkeys, Accessibility-permission paste, mic capture, or the always-on-top overlay (100% of SpeakEasy's fragile Mac surface). Distributing a paid Mac app outside the App Store **requires an Apple Developer account ($99/yr)** for a Developer ID cert + notarization (Gatekeeper blocks unsigned).

**Options considered (testing).** Buy a used Apple Silicon Mac mini (~$450), recruit a Mac-owning founding-five member as tester, or rent a cloud Mac (clunky for hotkeys/audio/permission dialogs over remote desktop).

**Decision.** **Windows-first launch + a Mac waitlist**; ship Mac to the waitlist weeks later. **Mac testing method: deferred** (owner's call).

**Why.** Don't block all revenue on a Mac port + a machine the owner doesn't own. The waitlist gauges demand, builds the Mac beta-tester pool, and founding-five revenue funds the Mac work.

**Status.** Deferred behind the founding-five launch (blocks Phase 4 only).

---

## D11 — Team-volume tiers (deferred) + automation-untested caution

**Context.** An earlier note carried team-volume pricing tiers; separately, the automation that justifies $499 is coded but unproven.

**Decision.**
- **Defer** team-volume tiers (revisit post-launch).
- Treat **"the automation works" as UNVERIFIED** until run end-to-end against a real endpoint — it's coded but the owner has never e2e-tested it. Must be proven in Phase 1 before it's a headline claim; the $499 price leans on it.
- **Never advertise Claude Code / MCP integration** — that code does not exist; it is vapor until built.

**Status.** Caution recorded; volume tiers deferred.

---

## Decisions still open (tracked in the plan, not yet logged)
See `docs/MASTER-PLAN.md` §7 (Open decisions) and §12 UNRESOLVED — e.g. final $499 timing/mechanic, checkout vendor, voice-namespace scheme, Mac testing method, Poe `/models` shape, Poe private-org-bot access. Promote each to a D-entry here when decided.

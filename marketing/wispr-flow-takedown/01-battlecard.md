# SpeakEasy vs. Wispr Flow — Competitive Battlecard
**Internal sales reference · the source of truth for the landing page, deck, and email**
_Last updated: 2026-06-06 · all SpeakEasy claims are code-verified; all Wispr claims are web-sourced (see footnotes)_

---

## The one-line position

> **Wispr Flow types for you. SpeakEasy works for you.**
> Wispr is a great dictation engine that drops text at your cursor. SpeakEasy is a voice *automation* layer for marketers — say the name of an action and it fires a webhook into your stack, runs a custom AI prompt, or opens the tool you need. You own it once and run it on your own API key for pennies, instead of renting dictation for $180/year forever.

This battlecard is built to be **bulletproof in front of peers who already use Wispr.** We concede what Wispr does better and win on category, cost, and control — never on pretending Wispr is bad.

---

## Feature matrix

| Dimension | **SpeakEasy** | **Wispr Flow** |
|---|---|---|
| Core job | Voice → **actions + text** | Voice → **text only** |
| Transcription engine | OpenAI Whisper (`whisper-1`), cloud, **your API key** | Proprietary cloud pipeline |
| Languages | ~13 + auto-detect + translate-to-English | **100+** ✅ Wispr wins |
| Platforms | **Windows-native** desktop | Mac, Windows, iOS, Android ✅ Wispr wins |
| Mobile app | ❌ none | ✅ iOS + Android ✅ Wispr wins |
| **Voice commands (say an action's name → it runs)** | ✅ **Yes** — 4-tier fuzzy match, auto-execute | ❌ None |
| **Webhooks / no-code automation** (Zapier, Make, n8n, custom) | ✅ **Unlimited** POST/GET actions, custom headers | ❌ None (dev REST/WebSocket API only) |
| **Per-action AI prompts** (`{{text}}` templating) | ✅ Yes, stored & hotkey/voice-triggered | ❌ None |
| Multi-LLM for transforms | ✅ Claude + OpenAI + OpenRouter, your choice | ❌ Closed box |
| Per-action hotkeys | ✅ Unlimited, with conflict detection | ❌ Single dictation hotkey |
| Targeted paste ("Cursor Lock") | ✅ Lock output to a chosen window | ⚠️ Pastes at cursor only |
| Chrome-profile routing | ✅ Yes | ❌ No |
| Learned personal dictionary | ⚠️ Not yet (AI transform cleans on demand) | ✅ Yes ✅ Wispr wins |
| Auto-format / filler removal polish | ⚠️ Via AI transform (on demand) | ✅ Automatic & refined ✅ Wispr wins |
| Cross-device sync | ❌ (single desktop) | ✅ Yes ✅ Wispr wins |
| **Pricing model** | **$99 one-time** + bring-your-own key | **$15/mo · $144–180/yr, forever** |
| **Typical cost, Year 1** | ~$110–145 (incl. license) | $180 |
| **Typical cost, Year 2+** | **~$10–50/yr usage only** | $180/yr, every year |
| Offline core dictation | ❌ Cloud (Whisper) — *we do not claim offline* | ❌ Cloud — no offline mode |
| Privacy track record | No public incident | ⚠️ 2025 incident: audio + window screenshots to cloud; reporter banned before CTO apology¹ |
| Brand / scale | New, founder-run | 2.5M+ downloads, ~$2B valuation ✅ Wispr wins |
| You own a license key | ✅ Yes — yours to keep | ❌ Rental; stops when you stop paying |

---

## Where each one genuinely wins

**SpeakEasy wins**
- Voice that *triggers actions*, not just dictates — the only real "voice automation" tool here.
- Webhooks into the exact marketing stack you already run (Zapier / Make / n8n / custom).
- Bring-your-own-key economics → pennies per use, **own it once**.
- Multi-LLM (Claude/GPT/OpenRouter) instead of a locked engine.
- Power-user control on Windows: per-action hotkeys, Cursor Lock, Chrome-profile routing.
- A clean privacy record — and you hold the license key.

**Wispr wins (concede openly)**
- Raw dictation breadth: 100+ languages vs. our ~13.
- Mac + iOS + Android; we're Windows desktop only.
- A learned personal dictionary and more refined automatic formatting.
- Cross-device sync.
- Brand trust and scale (2.5M+ users, $2B valuation).

> **The honest framing:** If your job is *multilingual mobile dictation*, Wispr is the better buy and we'll say so. If your job is *getting marketing work done at a Windows desk and wiring your voice into your tools*, SpeakEasy wins on capability **and** cost.

---

## The five talk tracks (memorize these)

1. **"Voice that DOES things, not just types."**
   Say *"send to my newsletter Zap,"* *"rewrite this as a hook,"* *"open Canva"* — SpeakEasy fires the webhook, runs the prompt, opens the tool. Wispr can only put text where your cursor is.

2. **"Your keys, your money."**
   You bring your own OpenAI key. Dictation costs **~$0.006/minute** — pennies. Wispr charges **$15/month forever.** (Calculator proves it live on the page.)

3. **"Multi-LLM, not a locked box."**
   Run your AI cleanup on Claude, GPT, or anything via OpenRouter. Wispr is a closed engine — you get what they give you.

4. **"Built for power users on Windows."**
   Per-action hotkeys, Cursor Lock (paste exactly where you want), Chrome-profile routing, fuzzy voice matching. Wispr's Windows build is the reviewers' "second-class citizen."²

5. **"Own it, don't rent it — and no surveillance scandal."**
   You buy a license key once. SpeakEasy has no Wispr-style privacy incident.¹

---

## The cost story (the kill shot)

Assumptions: 150 WPM speaking rate, Whisper at $0.006/min, ~20% of dictations run through an AI transform on a mid-tier model. Numbers are estimates; the **live calculator** on the landing page lets each person plug in their own Wispr usage.

| Usage profile | Words/week | SpeakEasy usage/yr | SpeakEasy **Year 1** (incl. $99) | SpeakEasy **Year 2+** | Wispr/yr | 3-yr total: **SpeakEasy vs Wispr** |
|---|---|---|---|---|---|---|
| Light | 5,000 | ~$12 | ~$111 | ~$12 | $180 | **~$135 vs $540** → save ~$405 |
| Medium | 20,000 | ~$46 | ~$145 | ~$46 | $180 | **~$237 vs $540** → save ~$303 |
| Heavy | 50,000 | ~$110 | ~$209 | ~$110 | $180 | **~$429 vs $540** → save ~$111 |

**Headline for typical (medium) users:** *Pays for itself in ~9 months, then saves ~$130/year — every year, forever.*

**Honesty note (keeps us credible):** at *extreme* dictation volume, Whisper's per-minute rate narrows the gap. The calculator shows this truthfully — which is exactly why it builds trust. For normal marketer usage, SpeakEasy wins clearly; for someone dictating 5+ hours a week, we say "run the numbers, it's closer." That candor is a selling point against Wispr's hype.

---

## Objection handling

| They say… | We say… |
|---|---|
| "Wispr supports 100+ languages." | "True — if you work across many languages, Wispr's the better dictation engine. Most of us produce in English, where the difference is moot, and you gain a whole automation layer." |
| "I need it on my phone / Mac." | "Then Wispr's range fits you. SpeakEasy is a power tool for where marketing actually gets produced — your Windows desk. It's not trying to be a phone toy." |
| "Setting up my own API key is a hassle." | "Five minutes, once. That five minutes buys you a tool you *own* instead of a subscription you rent forever — and dictation drops to pennies." |
| "Isn't BYO-key just hidden cost?" | "Open the calculator — even heavy users land far under $180/yr. For most, it's $10–50/year total." |
| "Wispr is huge / $2B / everyone uses it." | "Scale is why they nerf reliability after the trial² and why a privacy researcher caught them sending audio + screenshots to the cloud — then got *banned* for reporting it.¹ Big isn't the same as on-your-side." |
| "Does SpeakEasy work offline / is it private?" | "Be straight: no — transcription is cloud (Whisper), same as Wispr. Neither is offline. We don't pretend otherwise. What's different is you hold the key and there's no surveillance scandal." |
| "Wispr's formatting is cleaner." | "Their auto-format is nice. Ours is on-demand via AI transform — and the same feature rewrites, summarizes, and restyles, which dictation-only can't." |

---

## The offer (CTA across all assets)

- **$99 one-time license** (2 devices). Bring your own OpenAI key.
- Framing: *"Less than 7 months of Wispr — then it's yours forever."*
- Optional urgency: **founding-member price** for the group.
- Primary CTA: **Run your numbers on the live calculator → grab your license.**

---

### Footnotes / sources
1. Wispr privacy incident (2025): audio + active-window screenshots sent to cloud infra; the reporting researcher (Ryan Shrott) was initially banned before the CTO apologized. Reported via Medium/ModelPiper coverage. State as *reported*, not adjudicated.
2. Post-trial reliability complaints and Windows "second-class" build: aggregated from Trustpilot (2.7/5), Reddit, and 2026 review roundups (Spokenly, getvoibe, MakerStack).
3. SpeakEasy capabilities verified in source: `src/utils/fuzzyMatch.ts` (voice commands), `src/App.tsx` (hotkeys, webhook/prompt execution, Cursor Lock), `src-tauri/src/transcription.rs` (Whisper), `src-tauri/src/llm.rs` (multi-LLM), `src-tauri/src/license.rs` (licensing).

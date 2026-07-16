# SpeakEasy — Privacy Policy

> **⚠️ DRAFT TEMPLATE — NOT LEGAL ADVICE.** This document was drafted as a starting template for
> the owner and is **not** filed, reviewed, or attorney-approved legal advice. Before publication,
> an owner/attorney review is **required**, and the bracketed placeholders (`[LICENSOR ENTITY]`,
> `[JURISDICTION]`, `[SUPPORT EMAIL]`, `[EFFECTIVE DATE]`) must be filled in. This policy is written
> to describe the Software **honestly** — it deliberately does not overstate what the Software does.

_Last updated: [EFFECTIVE DATE] · Applies to: SpeakEasy for Windows (v1.x)_

---

## 1. Summary

SpeakEasy is a desktop application that turns your voice into text and runs voice- or hotkey-
triggered actions. To do its job it relies on **cloud services** and on **third-party AI providers
that you choose (Bring Your Own Key)**. This policy explains, plainly, **what data leaves your
machine, when, and to whom**. It does **not** claim that SpeakEasy works offline.

## 2. Audio and transcription (OpenAI Whisper)

When you dictate, the Software records the audio you speak and **sends that audio to OpenAI's
transcription service (the Whisper API)** to convert it into text. This means:

- **Transcription is not performed offline.** Your spoken audio is transmitted to OpenAI's cloud to
  be transcribed and returned as text.
- OpenAI's handling of that audio is governed by **OpenAI's own privacy policy and terms**, using
  the API key you provide.

If you do not want audio sent to OpenAI, do not use the dictation/transcription features.

## 3. Diagnostics (Supabase)

To help diagnose problems, the Software may upload a limited set of **diagnostic logs** to a hosted
**Supabase** backend operated for SpeakEasy:

- **What is uploaded:** application **`WARN` and `ERROR` log lines** and, if the application crashes,
  a **`crash.log`** file.
- **What is *not* included:** these diagnostics are designed **not** to contain your document
  contents or your API-key values. We do not intentionally log the body text of your brand-library
  documents, the text you dictate, or your provider keys.

## 4. Brand-library documents (stored locally in plaintext)

The Brand Asset Library stores the documents you add (research, testimonials, voice guides, etc.) as
**plaintext files on your own machine** (in the application's local data folder).

- SpeakEasy **does not** upload, sync, or back up these documents to any server on its own.
- A brand document **leaves your machine only when you paste it into another tool.** At that point
  the text goes wherever that destination tool sends it — for example, a website, a chat client, or
  a server-side bot. That transmission is controlled by the destination tool, not by SpeakEasy.

Because these documents are stored in plaintext locally, anyone with access to your computer or
user profile could read them. Protect your device accordingly.

## 5. Your provider keys and requests (BYOK — third-party servers)

SpeakEasy is **Bring Your Own Key (BYOK)**. When you use an AI provider, the Software sends your
request — and the **key material needed to authenticate that request** — to the **provider you
selected**. Depending on your configuration, that provider may be:

- **OpenAI**
- **OpenRouter**
- **Poe**
- **Genesis / CopyCoders** — note that Genesis/CopyCoders specifically **receives your provider key
  via the `X-Provider-Key` HTTP header** in order to run its bots on your behalf.

Additional notes:

- **Where keys are stored.** Your API keys are stored **locally in your operating system's secure
  keyring/credential store**. SpeakEasy does **not** transmit your keys to any destination **except
  the provider you invoke** to fulfill your request.
- **Provider terms apply.** Each provider handles your requests and any data therein under **its own
  privacy policy and terms**. Your usage, spend, and compliance with those providers are your
  responsibility (see the EULA, "Bring Your Own Key").

## 6. What SpeakEasy does not do

- We **do not** sell your personal data or your documents.
- We **do not** claim offline operation — transcription and AI provider features require sending
  data to the relevant cloud services described above.
- SpeakEasy does **not** transmit your keys or documents to us beyond the diagnostic logs described
  in Section 3.

## 7. Data controller and contact

The party responsible for this Software is **[LICENSOR ENTITY]**. For privacy questions, data
requests, or concerns, contact **[SUPPORT EMAIL]**.

## 8. Governing law and your rights

This policy and any privacy rights you may have are governed by the laws of **[JURISDICTION]**.
Depending on where you live, you may have rights to access, correct, or delete personal data.
_[Owner/attorney to confirm applicable data-protection obligations (e.g. GDPR/CCPA) and any
data-subject-request process for [JURISDICTION].]_

## 9. Changes to this policy

We may update this policy as the Software changes. Material changes will be reflected by updating the
"Last updated" date above and, where appropriate, notifying users.

---

_This is a draft template. Sections 2–5 describe the Software's actual data flows as of v1.x and
should be re-verified against the shipped build before publication._

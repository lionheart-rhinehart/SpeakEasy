// ============================================================================
// Brand-paste action synthesis (Track D / P1-paste0)
// ============================================================================
// Brand docs are NOT persisted through config.json's actions[] (that pipeline
// routes webhook-vs-prompt by `method` presence — a brand doc would be mis-routed).
// Instead each hydrated BrandDocMeta is synthesized ON THE FLY into a unified
// Action{kind:"brand_paste"} and injected into getAllActions() (voice) and the
// hotkey-registration list (App.tsx). This keeps brand docs entirely out of the
// settings Tauri boundary while reusing the existing match/register/execute flow.
//
// GUARDRAIL (§5d): every brand action is namespaced under the verb "paste {doc}"
// to avoid colliding with other action names in the flat voice-match space.

import type { Action, BrandDocMeta } from "../types";
import { normalizeVoiceText } from "./fuzzyMatch";

/** Stable, collision-proof Action id for a brand doc (prefix keeps it out of the
 *  webhook/prompt id space so the App.tsx re-fetch can route it back to brands). */
export const BRAND_ACTION_ID_PREFIX = "brand:";

export function brandActionId(docId: string): string {
  return `${BRAND_ACTION_ID_PREFIX}${docId}`;
}

export function isBrandActionId(id: string): boolean {
  return id.startsWith(BRAND_ACTION_ID_PREFIX);
}

/**
 * The voice/display trigger for a brand doc: verb-namespaced AND brand-scoped.
 *
 * When a brand label is set, the brand is part of the spoken phrase — e.g.
 * "paste Athletic Acceleration Testimonials" — so many docs sharing a bare name
 * ("Testimonials") across brands never collide: you must say the brand to fire a
 * specific one. Saying just "testimonials" then matches several partially and
 * drops to the disambiguation modal instead of mis-executing. If no brand is set,
 * falls back to "paste {name}".
 */
export function brandActionName(doc: { name: string; brand?: string }): string {
  const brand = (doc.brand ?? "").trim();
  const name = doc.name.trim();
  return (brand ? `paste ${brand} ${name}` : `paste ${name}`).replace(/\s+/g, " ").trim();
}

/** Synthesize one unified brand_paste Action from a doc's metadata. */
export function docToAction(doc: BrandDocMeta): Action {
  return {
    id: brandActionId(doc.id),
    name: brandActionName(doc),
    hotkey: doc.hotkey ?? "",
    enabled: true,
    kind: "brand_paste",
    brandDocId: doc.id,
  };
}

/** Synthesize the full brand_paste action list from hydrated metadata. */
export function brandDocsToActions(docs: BrandDocMeta[]): Action[] {
  return docs.map(docToAction);
}

/**
 * Brand-scope gate for voice matching. A brand doc that has a brand label may only
 * fire when the spoken text contains EVERY word of that brand — so saying just
 * "testimonials" never triggers "Athletic Acceleration Testimonials"; you must say
 * the brand. Docs with no brand are ungated (returns true). This is what makes the
 * spoken brand name *required*, not merely part of the display phrase.
 */
export function spokenSatisfiesBrand(spokenText: string, brand: string | undefined): boolean {
  const b = normalizeVoiceText(brand ?? "");
  if (!b) return true; // no brand set → not gated
  const spoken = normalizeVoiceText(spokenText);
  return b.split(" ").every((word) => word.length > 0 && spoken.includes(word));
}

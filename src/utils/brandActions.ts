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

/** Stable, collision-proof Action id for a brand doc (prefix keeps it out of the
 *  webhook/prompt id space so the App.tsx re-fetch can route it back to brands). */
export const BRAND_ACTION_ID_PREFIX = "brand:";

export function brandActionId(docId: string): string {
  return `${BRAND_ACTION_ID_PREFIX}${docId}`;
}

export function isBrandActionId(id: string): boolean {
  return id.startsWith(BRAND_ACTION_ID_PREFIX);
}

/** The voice/display name for a brand doc: verb-namespaced "paste {doc}". */
export function brandActionName(docName: string): string {
  return `paste ${docName}`.trim();
}

/** Synthesize one unified brand_paste Action from a doc's metadata. */
export function docToAction(doc: BrandDocMeta): Action {
  return {
    id: brandActionId(doc.id),
    name: brandActionName(doc.name),
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

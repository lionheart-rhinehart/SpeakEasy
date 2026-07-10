// ============================================================================
// Unified Action normalization
// ============================================================================
// The persisted settings still hold two separate arrays (webhookActions +
// promptActions). At runtime we normalize them into one discriminated `Action`
// list so voice matching, hotkey registration, and execution operate on a single
// shape with an explicit `kind` tag (no more object-shape sniffing). Execution of
// legacy kinds still routes back to the proven executors by id — this layer only
// unifies the *dispatch* surface. The persisted collapse into one array is
// P1-migrate; per-action provider/model overrides are P1-provfield.

import type { Action, ActionKind, WebhookAction, PromptAction, UserSettings } from "../types";

/** Map a WebhookAction's `method` to a unified `kind`. */
export function webhookKind(method: WebhookAction["method"]): ActionKind {
  switch (method) {
    case "POST":
    case "GET":
      return "webhook";
    case "URL":
      return "url";
    case "SMART_URL":
      return "smart_url";
    case "PROMPT":
      return "prompt";
    default:
      return "webhook";
  }
}

/** Normalize a persisted WebhookAction into the unified Action shape. */
export function webhookToAction(w: WebhookAction): Action {
  return {
    id: w.id,
    name: w.name,
    hotkey: w.hotkey,
    enabled: w.enabled,
    kind: webhookKind(w.method),
    webhookUrl: w.webhookUrl,
    method: w.method,
    headers: w.headers,
    askChromeProfile: w.askChromeProfile,
    prompt: w.prompt,
    requiresSelection: w.requiresSelection,
    provider: w.provider,
    model: w.model,
  };
}

/** Normalize a persisted PromptAction into the unified Action shape. */
export function promptToAction(p: PromptAction): Action {
  return {
    id: p.id,
    name: p.name,
    hotkey: p.hotkey,
    enabled: p.enabled,
    kind: "prompt",
    method: "PROMPT",
    prompt: p.prompt,
    requiresSelection: p.requiresSelection,
    provider: p.provider,
    model: p.model,
  };
}

/**
 * All actions (enabled + disabled) normalized to the unified shape.
 * Used by hotkey registration, which applies its own enabled/field guards.
 */
export function getAllUnifiedActions(settings: UserSettings): Action[] {
  const out: Action[] = [];
  for (const w of settings.webhookActions ?? []) out.push(webhookToAction(w));
  for (const p of settings.promptActions ?? []) out.push(promptToAction(p));
  return out;
}

/**
 * Only enabled actions, normalized. Used by voice-command matching so disabled
 * actions are never matched/executed.
 */
export function getEnabledUnifiedActions(settings: UserSettings): Action[] {
  return getAllUnifiedActions(settings).filter((a) => a.enabled);
}

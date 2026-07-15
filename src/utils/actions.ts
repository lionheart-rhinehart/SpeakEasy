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

import type {
  Action,
  ActionKind,
  WebhookAction,
  PromptAction,
  UserSettings,
  FileAction,
  FileWebhookAction,
  FilePromptAction,
} from "../types";

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

// ============================================================================
// Persisted-schema collapse / expand (P1-migrate — SETTINGS_SCHEMA_VERSION v3)
// ============================================================================
// On disk (config.json) the two legacy arrays collapse into ONE unified
// `actions[]` array of `FileAction` (snake_case, Rust interop). The in-memory
// UserSettings still holds the two camelCase arrays (webhookActions/promptActions)
// — P1-action's split — so App.tsx/SettingsPanel/hotkeyValidation stay unchanged.
// These pure functions are the boundary: collapse on save, expand on load.
//
// Losslessness hinges on ORIGIN: a FileAction with a `method` came from a
// WebhookAction; without one, it came from a PromptAction. That single rule routes
// every entry back to the correct in-memory array on expand.

/** Collapse one in-memory WebhookAction → the unified persisted FileAction. */
export function webhookToFileAction(w: WebhookAction): FileAction {
  return {
    id: w.id,
    name: w.name,
    hotkey: w.hotkey,
    enabled: w.enabled,
    kind: webhookKind(w.method),
    provider: w.provider,
    model: w.model,
    webhook_url: w.webhookUrl,
    method: w.method, // present ⇒ webhook origin (drives expand routing)
    headers: w.headers,
    ask_chrome_profile: w.askChromeProfile,
    prompt: w.prompt,
    requires_selection: w.requiresSelection ?? true,
  };
}

/** Collapse one in-memory PromptAction → the unified persisted FileAction. */
export function promptToFileAction(p: PromptAction): FileAction {
  return {
    id: p.id,
    name: p.name,
    hotkey: p.hotkey,
    enabled: p.enabled,
    kind: "prompt",
    provider: p.provider,
    model: p.model,
    // NB: no `method` — absence is what marks this as PromptAction-origin.
    prompt: p.prompt,
    requires_selection: p.requiresSelection ?? true,
  };
}

/** Expand a webhook-origin FileAction (has `method`) → in-memory WebhookAction. */
export function fileActionToWebhook(fa: FileAction): WebhookAction {
  return {
    id: fa.id,
    name: fa.name,
    hotkey: fa.hotkey,
    webhookUrl: fa.webhook_url ?? "",
    method: (fa.method ?? "POST") as WebhookAction["method"],
    headers: fa.headers,
    enabled: fa.enabled,
    askChromeProfile: fa.ask_chrome_profile,
    prompt: fa.prompt,
    requiresSelection: fa.requires_selection ?? true,
    provider: fa.provider as WebhookAction["provider"],
    model: fa.model,
  };
}

/** Expand a prompt-origin FileAction (no `method`) → in-memory PromptAction. */
export function fileActionToPrompt(fa: FileAction): PromptAction {
  return {
    id: fa.id,
    name: fa.name,
    hotkey: fa.hotkey,
    prompt: fa.prompt ?? "",
    enabled: fa.enabled,
    requiresSelection: fa.requires_selection ?? true,
    provider: fa.provider as PromptAction["provider"],
    model: fa.model,
  };
}

/**
 * Collapse the two in-memory arrays into the single persisted `actions[]`.
 * Webhooks first (preserving their order), then prompt actions — matching
 * getAllUnifiedActions()'s ordering.
 */
export function arraysToFileActions(
  webhookActions: WebhookAction[],
  promptActions: PromptAction[]
): FileAction[] {
  return [
    ...webhookActions.map(webhookToFileAction),
    ...promptActions.map(promptToFileAction),
  ];
}

/**
 * Expand the persisted `actions[]` back into the two in-memory arrays. Routing is
 * by ORIGIN: entries carrying a `method` are webhooks, the rest are prompt actions.
 */
export function fileActionsToArrays(actions: FileAction[]): {
  webhookActions: WebhookAction[];
  promptActions: PromptAction[];
} {
  const webhookActions: WebhookAction[] = [];
  const promptActions: PromptAction[] = [];
  for (const fa of actions) {
    if (fa.method != null) {
      webhookActions.push(fileActionToWebhook(fa));
    } else {
      promptActions.push(fileActionToPrompt(fa));
    }
  }
  return { webhookActions, promptActions };
}

/** Legacy v2 file→memory mappers (used only when reading a pre-v3 config). */
export function fileWebhookToCamel(action: FileWebhookAction): WebhookAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    webhookUrl: action.webhook_url,
    method: action.method as WebhookAction["method"],
    headers: action.headers,
    enabled: action.enabled,
    askChromeProfile: action.ask_chrome_profile,
    prompt: action.prompt,
    requiresSelection: action.requires_selection ?? true,
    provider: action.provider as WebhookAction["provider"],
    model: action.model,
  };
}

export function filePromptToCamel(action: FilePromptAction): PromptAction {
  return {
    id: action.id,
    name: action.name,
    hotkey: action.hotkey,
    prompt: action.prompt,
    enabled: action.enabled,
    requiresSelection: action.requires_selection ?? true,
    provider: action.provider as PromptAction["provider"],
    model: action.model,
  };
}

/**
 * Decide which persisted source to read the in-memory action arrays from.
 *
 * CRITICAL (the 2026-07-14 data-loss fix): the Rust `UserSettings` struct always
 * serializes `actions` (no `skip_serializing_if`), so an OLD v2 config crosses the
 * Tauri boundary as `actions: []` (present-but-empty) alongside the real
 * `webhook_actions`. A presence check (`actions !== undefined`) therefore WRONGLY
 * treats the old config as an empty v3 config and drops every legacy action. The
 * decision MUST be by CONTENT: use the unified `actions[]` only when it is
 * non-empty; otherwise fall back to the legacy arrays. (A migrated v3 config drops
 * its legacy arrays on save, so the fallback can't resurrect deleted actions.)
 */
export function resolveActionsFromFile(
  actions: FileAction[] | undefined,
  legacyWebhooks: FileWebhookAction[] | undefined,
  legacyPrompts: FilePromptAction[] | undefined
): { webhookActions: WebhookAction[]; promptActions: PromptAction[] } {
  if (actions && actions.length > 0) {
    return fileActionsToArrays(actions);
  }
  return {
    webhookActions: (legacyWebhooks ?? []).map(fileWebhookToCamel),
    promptActions: (legacyPrompts ?? []).map(filePromptToCamel),
  };
}

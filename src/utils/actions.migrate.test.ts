// P1-migrate zero-loss tests for the persisted-schema collapse/expand boundary.
// The invariant that protects the owner's 40+ actions across the v2->v3 schema
// bump: collapsing the two in-memory arrays into one persisted `actions[]` and
// expanding them back is lossless — identical action count and fields before and
// after. See src/utils/actions.ts (arraysToFileActions / fileActionsToArrays).

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  arraysToFileActions,
  fileActionsToArrays,
  resolveActionsFromFile,
} from "./actions";
import type { WebhookAction, PromptAction, FileWebhookAction } from "../types";

// A fixture covering every WebhookAction method (URL / SMART_URL / POST / GET /
// PROMPT) plus PromptActions, including per-action provider/model overrides.
const webhooks: WebhookAction[] = [
  { id: "w1", name: "Gmail", hotkey: "", webhookUrl: "https://mail.google.com", method: "URL", enabled: true, askChromeProfile: true },
  { id: "w2", name: "Search", hotkey: "", webhookUrl: "", method: "SMART_URL", enabled: true },
  { id: "w3", name: "Post Hook", hotkey: "Control+1", webhookUrl: "https://x/hook", method: "POST", enabled: true, headers: { "X-Foo": "bar" } },
  { id: "w4", name: "Get Hook", hotkey: "", webhookUrl: "https://x/get", method: "GET", enabled: false },
  { id: "w5", name: "Fix Grammar", hotkey: "", webhookUrl: "", method: "PROMPT", enabled: true, prompt: "fix {{text}}", requiresSelection: true, provider: "openai", model: "gpt-4o" },
];
const prompts: PromptAction[] = [
  { id: "p1", name: "Summarize", hotkey: "", prompt: "summarize {{text}}", enabled: true, requiresSelection: true },
  { id: "p2", name: "Ideas", hotkey: "Control+2", prompt: "ideas", enabled: true, requiresSelection: false, provider: "anthropic", model: "claude-sonnet-5" },
];

describe("persisted action collapse/expand (P1-migrate)", () => {
  it("collapses both arrays into one actions[] with the total count", () => {
    const fileActions = arraysToFileActions(webhooks, prompts);
    expect(fileActions).toHaveLength(webhooks.length + prompts.length);
  });

  it("marks webhook-origin actions with `method` and prompt-origin without", () => {
    const fileActions = arraysToFileActions(webhooks, prompts);
    const webhookEntries = fileActions.filter((a) => a.method != null);
    const promptEntries = fileActions.filter((a) => a.method == null);
    expect(webhookEntries).toHaveLength(webhooks.length);
    expect(promptEntries).toHaveLength(prompts.length);
  });

  it("expands back to the two arrays with identical counts and order", () => {
    const { webhookActions, promptActions } = fileActionsToArrays(
      arraysToFileActions(webhooks, prompts)
    );
    expect(webhookActions).toHaveLength(webhooks.length);
    expect(promptActions).toHaveLength(prompts.length);
    expect(webhookActions.map((w) => w.id)).toEqual(webhooks.map((w) => w.id));
    expect(promptActions.map((p) => p.id)).toEqual(prompts.map((p) => p.id));
  });

  it("preserves per-action provider/model overrides across the round-trip", () => {
    const { webhookActions, promptActions } = fileActionsToArrays(
      arraysToFileActions(webhooks, prompts)
    );
    const w5 = webhookActions.find((w) => w.id === "w5")!;
    expect(w5.provider).toBe("openai");
    expect(w5.model).toBe("gpt-4o");
    expect(w5.method).toBe("PROMPT");
    const p2 = promptActions.find((p) => p.id === "p2")!;
    expect(p2.provider).toBe("anthropic");
    expect(p2.model).toBe("claude-sonnet-5");
    expect(p2.requiresSelection).toBe(false);
  });

  // Regression for the 2026-07-14 data-loss bug: Rust always serializes `actions`,
  // so an OLD v2 config arrives over the Tauri boundary as `actions: []` (present
  // but empty) ALONGSIDE the populated legacy arrays. resolveActionsFromFile must
  // read the legacy actions, NOT treat the empty `actions[]` as an empty v3 config.
  it("reads legacy arrays when Rust sends an empty actions[] (v2 config)", () => {
    const legacy: FileWebhookAction[] = Array.from({ length: 46 }, (_, i) => ({
      id: `w${i}`,
      name: `Action ${i}`,
      hotkey: "",
      webhook_url: "https://example.com",
      method: "URL",
      enabled: true,
    }));
    const resolved = resolveActionsFromFile([], legacy, undefined);
    expect(resolved.webhookActions).toHaveLength(46);
    expect(resolved.promptActions).toHaveLength(0);
    expect(resolved.webhookActions.map((w) => w.id)).toEqual(legacy.map((w) => w.id));
  });

  it("prefers the unified actions[] when it is non-empty (v3 config)", () => {
    const unified = arraysToFileActions(webhooks, prompts);
    // Even if stale legacy arrays are also present, non-empty actions[] wins.
    const resolved = resolveActionsFromFile(unified, [], undefined);
    expect(resolved.webhookActions).toHaveLength(webhooks.length);
    expect(resolved.promptActions).toHaveLength(prompts.length);
  });

  it("is empty only when both actions[] and legacy arrays are empty", () => {
    const resolved = resolveActionsFromFile([], [], []);
    expect(resolved.webhookActions).toHaveLength(0);
    expect(resolved.promptActions).toHaveLength(0);
  });

  it("is idempotent: a second round-trip is a fixed point", () => {
    const once = fileActionsToArrays(arraysToFileActions(webhooks, prompts));
    const twice = fileActionsToArrays(
      arraysToFileActions(once.webhookActions, once.promptActions)
    );
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once));
  });
});

// Minimal snake_case -> camelCase readers mirroring appStore's legacy converters,
// so this test exercises the migration against the OWNER'S REAL config without
// importing appStore (which pulls in Tauri/zustand). Skips when the file is absent
// (e.g. CI) so it never fails a machine that isn't the owner's.
type SnakeWebhook = { id: string; name: string; hotkey: string; webhook_url: string; method: string; headers?: Record<string, string>; enabled: boolean; ask_chrome_profile?: boolean; prompt?: string; requires_selection?: boolean; provider?: string; model?: string };
type SnakePrompt = { id: string; name: string; hotkey: string; prompt: string; enabled: boolean; requires_selection?: boolean; provider?: string; model?: string };

function readRealConfig(): { webhook_actions: SnakeWebhook[]; prompt_actions: SnakePrompt[] } | null {
  const appdata = process.env.APPDATA;
  if (!appdata) return null;
  const path = join(appdata, "SpeakEasy", "config.json");
  if (!existsSync(path)) return null;
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  const us = cfg.user_settings ?? {};
  return {
    webhook_actions: us.webhook_actions ?? [],
    prompt_actions: us.prompt_actions ?? [],
  };
}

describe("owner's real config zero-loss (skipped if absent)", () => {
  const real = readRealConfig();
  it.skipIf(real === null)(
    "migrates every real action with identical count and preserved ids",
    () => {
      const cfg = real!;
      const webhookActions: WebhookAction[] = cfg.webhook_actions.map((a) => ({
        id: a.id, name: a.name, hotkey: a.hotkey, webhookUrl: a.webhook_url,
        method: a.method as WebhookAction["method"], headers: a.headers, enabled: a.enabled,
        askChromeProfile: a.ask_chrome_profile, prompt: a.prompt,
        requiresSelection: a.requires_selection ?? true,
        provider: a.provider as WebhookAction["provider"], model: a.model,
      }));
      const promptActions: PromptAction[] = cfg.prompt_actions.map((a) => ({
        id: a.id, name: a.name, hotkey: a.hotkey, prompt: a.prompt, enabled: a.enabled,
        requiresSelection: a.requires_selection ?? true,
        provider: a.provider as PromptAction["provider"], model: a.model,
      }));

      const total = webhookActions.length + promptActions.length;
      const fileActions = arraysToFileActions(webhookActions, promptActions);
      expect(fileActions).toHaveLength(total);

      const back = fileActionsToArrays(fileActions);
      expect(back.webhookActions).toHaveLength(webhookActions.length);
      expect(back.promptActions).toHaveLength(promptActions.length);

      const idsBefore = [...webhookActions, ...promptActions].map((a) => a.id).sort();
      const idsAfter = [...back.webhookActions, ...back.promptActions].map((a) => a.id).sort();
      expect(idsAfter).toEqual(idsBefore);

      console.log(`[real-config] migrated ${total} actions (${webhookActions.length} webhook + ${promptActions.length} prompt) with zero loss`);
    }
  );
});

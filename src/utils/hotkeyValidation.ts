import type { UserSettings, HotkeyDefinition, HotkeyModifier } from "../types";

// List of valid modifier keys
const MODIFIERS: HotkeyModifier[] = ["Control", "Alt", "Shift", "Meta"];

// Canonical modifier ordering. Hotkey strings are sorted into this order so that
// physically identical shortcuts (e.g. "Control+Shift+Alt+D" vs "Control+Alt+Shift+D")
// produce the same string and are caught by the exact-string conflict detector.
const MODIFIER_ORDER: HotkeyModifier[] = ["Control", "Alt", "Shift", "Meta"];

/**
 * Get all hotkeys currently in use across the application.
 * Returns a Map of hotkey string -> action name (for conflict messages).
 */
export function getAllUsedHotkeys(settings: UserSettings): Map<string, string> {
  const used = new Map<string, string>();

  // System hotkeys
  if (settings.hotkeyRecord) {
    used.set(settings.hotkeyRecord, "Voice to Text");
  }
  if (settings.hotkeyAiTransform) {
    used.set(settings.hotkeyAiTransform, "AI Transform");
  }
  if (settings.hotkeyHistory) {
    used.set(settings.hotkeyHistory, "History");
  }
  if (settings.hotkeyVoiceCommand) {
    used.set(settings.hotkeyVoiceCommand, "Voice Command");
  }

  // Webhook actions (only enabled ones count as conflicts)
  for (const action of settings.webhookActions) {
    if (action.enabled && action.hotkey) {
      used.set(action.hotkey, action.name);
    }
  }

  // Prompt actions (only enabled ones count as conflicts)
  for (const action of settings.promptActions) {
    if (action.enabled && action.hotkey) {
      used.set(action.hotkey, action.name);
    }
  }

  return used;
}

/**
 * Validate that a hotkey is unique (not already used by another action).
 * @param hotkey - The hotkey string to validate (e.g., "Control+Shift+D")
 * @param existingHotkeys - Map of existing hotkeys from getAllUsedHotkeys()
 * @param excludeActionName - Optional action name to exclude from conflict check (for editing existing action)
 */
export function validateHotkeyUnique(
  hotkey: string,
  existingHotkeys: Map<string, string>,
  excludeActionName?: string
): { valid: boolean; conflictWith?: string } {
  if (!hotkey) {
    return { valid: false };
  }

  const conflictingAction = existingHotkeys.get(hotkey);

  // If there's a conflict, check if it's with the same action being edited
  if (conflictingAction) {
    if (excludeActionName && conflictingAction === excludeActionName) {
      return { valid: true };
    }
    return { valid: false, conflictWith: conflictingAction };
  }

  return { valid: true };
}

/**
 * Parse a Tauri hotkey string into a structured HotkeyDefinition.
 * @param hotkey - e.g., "Control+Shift+D"
 * @returns HotkeyDefinition with modifiers and key separated
 */
export function parseHotkeyToDefinition(hotkey: string): HotkeyDefinition {
  if (!hotkey) {
    return { modifiers: [], key: "" };
  }

  const parts = hotkey.split("+");
  const modifiers: HotkeyModifier[] = [];
  let key = "";

  for (const part of parts) {
    if (MODIFIERS.includes(part as HotkeyModifier)) {
      modifiers.push(part as HotkeyModifier);
    } else {
      // Last non-modifier part is the key
      key = part;
    }
  }

  return { modifiers, key };
}

/**
 * Convert a HotkeyDefinition back to a Tauri hotkey string.
 * @param def - The hotkey definition
 * @returns Tauri format string like "Control+Shift+D"
 */
export function hotkeyDefinitionToString(def: HotkeyDefinition): string {
  if (!def.key) {
    return "";
  }

  // Sort modifiers into canonical order so equivalent shortcuts stringify identically.
  const sortedModifiers = [...def.modifiers].sort(
    (a, b) => MODIFIER_ORDER.indexOf(a) - MODIFIER_ORDER.indexOf(b)
  );
  const parts = [...sortedModifiers, def.key];
  return parts.join("+");
}

/**
 * Normalize a hotkey string to canonical modifier order.
 * Two physically identical shortcuts stored in different modifier orders
 * (e.g. "Shift+Control+1" and "Control+Shift+1") both normalize to the same
 * string, so the exact-string conflict detector can catch the collision.
 * Empty / no-key strings pass through unchanged. Idempotent.
 */
export function normalizeHotkey(hotkey: string): string {
  if (!hotkey) {
    return hotkey;
  }
  const normalized = hotkeyDefinitionToString(parseHotkeyToDefinition(hotkey));
  // If parsing produced no key (malformed), keep the original rather than dropping it.
  return normalized || hotkey;
}

/**
 * Validate that a hotkey string is in valid Tauri format.
 * @param hotkey - The hotkey string to validate
 * @returns true if valid, false otherwise
 */
export function isValidHotkeyFormat(hotkey: string): boolean {
  if (!hotkey) {
    return false;
  }

  const def = parseHotkeyToDefinition(hotkey);

  // Must have at least one modifier and a key
  if (def.modifiers.length === 0 || !def.key) {
    return false;
  }

  // Key must not be a modifier
  if (MODIFIERS.includes(def.key as HotkeyModifier)) {
    return false;
  }

  return true;
}

/**
 * Format a hotkey string for user-friendly display.
 * Converts Tauri format to readable format (e.g., "Control+Backquote" -> "Ctrl+`")
 */
export function formatHotkeyForDisplay(hotkey: string): string {
  if (!hotkey) {
    return "";
  }

  return hotkey
    .replace(/Control/g, "Ctrl")
    .replace(/Backquote/g, "`")
    .replace(/Space/g, "Space")
    .replace(/Minus/g, "-")
    .replace(/Equal/g, "=")
    .replace(/BracketLeft/g, "[")
    .replace(/BracketRight/g, "]")
    .replace(/Backslash/g, "\\")
    .replace(/Semicolon/g, ";")
    .replace(/Quote/g, "'")
    .replace(/Comma/g, ",")
    .replace(/Period/g, ".")
    .replace(/Slash/g, "/");
}

/**
 * Get the list of preset hotkey options (for backward compatibility dropdown).
 */
export function getPresetHotkeys(): { value: string; label: string }[] {
  const presets: { value: string; label: string }[] = [];

  // Ctrl+1 through Ctrl+9
  for (let i = 1; i <= 9; i++) {
    presets.push({
      value: `Control+${i}`,
      label: `Ctrl+${i}`,
    });
  }

  // Ctrl+Shift+1 through Ctrl+Shift+3
  for (let i = 1; i <= 3; i++) {
    presets.push({
      value: `Control+Shift+${i}`,
      label: `Ctrl+Shift+${i}`,
    });
  }

  // Ctrl+Alt+1 through Ctrl+Alt+9
  for (let i = 1; i <= 9; i++) {
    presets.push({
      value: `Control+Alt+${i}`,
      label: `Ctrl+Alt+${i}`,
    });
  }

  // Ctrl+Shift+Alt+1 through Ctrl+Shift+Alt+9
  for (let i = 1; i <= 9; i++) {
    presets.push({
      value: `Control+Alt+Shift+${i}`,
      label: `Ctrl+Shift+Alt+${i}`,
    });
  }

  return presets;
}

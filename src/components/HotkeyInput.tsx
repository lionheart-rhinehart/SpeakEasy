import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../stores/appStore";
import type { HotkeyModifier } from "../types";
import { getPresetHotkeys, parseHotkeyToDefinition, hotkeyDefinitionToString, validateHotkeyUnique, getAllUsedHotkeys } from "../utils/hotkeyValidation";

// Map special keys to Tauri format (same as SettingsPanel.tsx)
const keyMap: Record<string, string> = {
  " ": "Space",
  "`": "Backquote",
  "~": "Backquote",
  "Dead": "Backquote",
  "-": "Minus",
  "_": "Minus",
  "=": "Equal",
  "+": "Equal",
  "[": "BracketLeft",
  "{": "BracketLeft",
  "]": "BracketRight",
  "}": "BracketRight",
  "\\": "Backslash",
  "|": "Backslash",
  ";": "Semicolon",
  ":": "Semicolon",
  "'": "Quote",
  "\"": "Quote",
  ",": "Comma",
  "<": "Comma",
  ".": "Period",
  ">": "Period",
  "/": "Slash",
  "?": "Slash",
  "ArrowUp": "ArrowUp",
  "ArrowDown": "ArrowDown",
  "ArrowLeft": "ArrowLeft",
  "ArrowRight": "ArrowRight",
  "Enter": "Enter",
  "Tab": "Tab",
  "Escape": "Escape",
  "Backspace": "Backspace",
  "Delete": "Delete",
  "Home": "Home",
  "End": "End",
  "PageUp": "PageUp",
  "PageDown": "PageDown",
};

const codeMap: Record<string, string> = {
  "Backquote": "Backquote",
  "Minus": "Minus",
  "Equal": "Equal",
  "BracketLeft": "BracketLeft",
  "BracketRight": "BracketRight",
  "Backslash": "Backslash",
  "Semicolon": "Semicolon",
  "Quote": "Quote",
  "Comma": "Comma",
  "Period": "Period",
  "Slash": "Slash",
};

const MODIFIERS: HotkeyModifier[] = ["Control", "Alt", "Shift", "Meta"];

/**
 * Convert a keyboard event to a single key in Tauri format.
 * This is for capturing individual keys, not full hotkey combinations.
 */
function keyEventToSingleKey(e: KeyboardEvent): string | null {
  // If it's a modifier key, return the modifier
  if (e.key === "Control" || e.ctrlKey && !e.key.match(/^[a-zA-Z0-9]$/)) {
    if (e.key === "Control") return "Control";
  }
  if (e.key === "Alt") return "Alt";
  if (e.key === "Shift") return "Shift";
  if (e.key === "Meta") return "Meta";

  // For non-modifiers, use the key mapping
  let key = codeMap[e.code] || keyMap[e.key] || e.key.toUpperCase();

  // Handle function keys
  if (e.key.startsWith("F") && !isNaN(parseInt(e.key.substring(1)))) {
    key = e.key.toUpperCase();
  }

  // Handle number keys
  if (/^[0-9]$/.test(e.key)) {
    key = e.key;
  }

  return key;
}

/**
 * Format a single key for display
 */
function formatKeyForDisplay(key: string): string {
  const displayMap: Record<string, string> = {
    "Control": "Ctrl",
    "Meta": "Cmd",
    "Backquote": "`",
    "Space": "Space",
    "Minus": "-",
    "Equal": "=",
    "BracketLeft": "[",
    "BracketRight": "]",
    "Backslash": "\\",
    "Semicolon": ";",
    "Quote": "'",
    "Comma": ",",
    "Period": ".",
    "Slash": "/",
  };
  return displayMap[key] || key;
}

interface HotkeyInputProps {
  value: string;
  onChange: (hotkey: string) => void;
  excludeActionName?: string;
  disabled?: boolean;
  showPresetToggle?: boolean;
}

type FieldIndex = 0 | 1 | 2;
type CaptureMode = FieldIndex | null;

export default function HotkeyInput({
  value,
  onChange,
  excludeActionName,
  disabled = false,
  showPresetToggle = true,
}: HotkeyInputProps) {
  const settings = useAppStore((state) => state.settings);
  const setCapturingHotkey = useAppStore((state) => state.setCapturingHotkey);

  // Parse the current value into fields
  const def = parseHotkeyToDefinition(value);
  const [field1, setField1] = useState<string>(def.modifiers[0] || "Control");
  const [field2, setField2] = useState<string>(def.modifiers[1] || "");
  const [field3, setField3] = useState<string>(def.key || "");

  // Which field is being captured
  const [capturingField, setCapturingField] = useState<CaptureMode>(null);

  // Use preset dropdown mode
  const [usePreset, setUsePreset] = useState(false);

  // Validation error
  const [error, setError] = useState<string | null>(null);

  // Update fields when value prop changes
  useEffect(() => {
    const parsed = parseHotkeyToDefinition(value);
    setField1(parsed.modifiers[0] || "Control");
    setField2(parsed.modifiers[1] || "");
    setField3(parsed.key || "");
  }, [value]);

  // Rebuild hotkey string when fields change
  const buildHotkey = useCallback(() => {
    const modifiers: HotkeyModifier[] = [];
    if (field1 && MODIFIERS.includes(field1 as HotkeyModifier)) {
      modifiers.push(field1 as HotkeyModifier);
    }
    if (field2 && MODIFIERS.includes(field2 as HotkeyModifier)) {
      modifiers.push(field2 as HotkeyModifier);
    }
    return hotkeyDefinitionToString({ modifiers, key: field3 });
  }, [field1, field2, field3]);

  // Validate and propagate changes
  useEffect(() => {
    if (!field3) {
      // No key yet, don't validate or propagate
      setError(null);
      return;
    }

    const newHotkey = buildHotkey();
    if (!newHotkey) return;

    // Check for duplicates
    const existingHotkeys = getAllUsedHotkeys(settings);
    const validation = validateHotkeyUnique(newHotkey, existingHotkeys, excludeActionName);

    if (!validation.valid) {
      setError(`Already used by: ${validation.conflictWith}`);
    } else {
      setError(null);
      if (newHotkey !== value) {
        onChange(newHotkey);
      }
    }
  }, [field1, field2, field3, buildHotkey, settings, excludeActionName, onChange, value]);

  // Handle key capture
  useEffect(() => {
    if (capturingField === null) {
      setCapturingHotkey(false);
      return;
    }

    setCapturingHotkey(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels capture
      if (e.key === "Escape") {
        setCapturingField(null);
        return;
      }

      const key = keyEventToSingleKey(e);
      if (!key) return;

      if (capturingField === 0) {
        // Field 1: must be a modifier
        if (MODIFIERS.includes(key as HotkeyModifier)) {
          setField1(key);
          setCapturingField(null);
        }
      } else if (capturingField === 1) {
        // Field 2: optional modifier or clear
        if (MODIFIERS.includes(key as HotkeyModifier)) {
          // Don't allow same modifier as field 1
          if (key !== field1) {
            setField2(key);
          }
          setCapturingField(null);
        }
      } else if (capturingField === 2) {
        // Field 3: the actual key (non-modifier)
        if (!MODIFIERS.includes(key as HotkeyModifier)) {
          setField3(key);
          setCapturingField(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      setCapturingHotkey(false);
    };
  }, [capturingField, field1, setCapturingHotkey]);

  // Preset dropdown options
  const presets = getPresetHotkeys();

  if (usePreset) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {presets.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          {showPresetToggle && (
            <button
              onClick={() => setUsePreset(false)}
              className="text-xs text-primary-500 hover:text-primary-700 whitespace-nowrap"
            >
              Custom
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 3-field input */}
      <div className="flex items-center gap-1">
        {/* Field 1: Primary modifier (required) */}
        <button
          onClick={() => !disabled && setCapturingField(0)}
          disabled={disabled}
          className={`px-2 py-1.5 min-w-[60px] border rounded text-xs font-mono transition-colors ${
            capturingField === 0
              ? "bg-primary-100 border-primary-400 text-primary-700 animate-pulse"
              : "bg-slate-100 border-slate-300 hover:border-primary-300 hover:bg-primary-50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {capturingField === 0 ? "Press..." : formatKeyForDisplay(field1)}
        </button>

        <span className="text-slate-400">+</span>

        {/* Field 2: Secondary modifier (optional) */}
        <button
          onClick={() => !disabled && setCapturingField(1)}
          disabled={disabled}
          className={`px-2 py-1.5 min-w-[60px] border rounded text-xs font-mono transition-colors ${
            capturingField === 1
              ? "bg-primary-100 border-primary-400 text-primary-700 animate-pulse"
              : field2
                ? "bg-slate-100 border-slate-300 hover:border-primary-300 hover:bg-primary-50"
                : "bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-primary-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {capturingField === 1 ? "Press..." : field2 ? formatKeyForDisplay(field2) : "(opt)"}
        </button>

        <span className="text-slate-400">+</span>

        {/* Field 3: The key (required) */}
        <button
          onClick={() => !disabled && setCapturingField(2)}
          disabled={disabled}
          className={`px-2 py-1.5 min-w-[60px] border rounded text-xs font-mono transition-colors ${
            capturingField === 2
              ? "bg-primary-100 border-primary-400 text-primary-700 animate-pulse"
              : field3
                ? "bg-slate-100 border-slate-300 hover:border-primary-300 hover:bg-primary-50"
                : "bg-slate-50 border-dashed border-slate-300 text-slate-400 hover:border-primary-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {capturingField === 2 ? "Press..." : field3 ? formatKeyForDisplay(field3) : "Key"}
        </button>

        {/* Clear field 2 button */}
        {field2 && (
          <button
            onClick={() => setField2("")}
            disabled={disabled}
            className="p-1 text-slate-400 hover:text-slate-600"
            title="Remove optional modifier"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {/* Preset toggle */}
      {showPresetToggle && (
        <button
          onClick={() => setUsePreset(true)}
          className="text-xs text-slate-500 hover:text-primary-500"
        >
          Use preset shortcuts
        </button>
      )}

      {/* Helper text */}
      <p className="text-xs text-slate-400">
        Click a field and press a key. Press Escape to cancel.
      </p>
    </div>
  );
}

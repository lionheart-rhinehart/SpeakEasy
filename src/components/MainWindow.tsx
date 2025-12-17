import { useState } from "react";
import { useAppStore } from "../stores/appStore";
import RecordingButton from "./RecordingButton";

// Helper to display hotkey in user-friendly format
function formatHotkeyDisplay(hotkey: string): string {
  return hotkey
    .replace("Control", "Ctrl")
    .replace("Backquote", "`")
    .replace("Plus", "+")
    .replace("Minus", "-")
    .replace("Equal", "=")
    .replace("BracketLeft", "[")
    .replace("BracketRight", "]")
    .replace("Backslash", "\\")
    .replace("Semicolon", ";")
    .replace("Quote", "'")
    .replace("Comma", ",")
    .replace("Period", ".")
    .replace("Slash", "/");
}

export default function MainWindow() {
  const { recordingState, lastTranscription, setSettingsOpen, setHistoryOpen, apiKey, setApiKey, settings, updateSettings } =
    useAppStore();
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState("");

  const handleSaveApiKey = () => {
    if (tempApiKey.trim()) {
      setApiKey(tempApiKey.trim());
      setShowApiKeyInput(false);
      setTempApiKey("");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-text-primary">SpeakEasy</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Dev mode refresh button */}
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh (Dev)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => setHistoryOpen(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-lg transition-colors"
            title="History (Ctrl+F)"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-slate-100 rounded-lg transition-colors"
            title="Settings"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        {/* API Key Setup Banner */}
        {!apiKey && !showApiKeyInput && (
          <div className="w-full max-w-sm p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 mb-2">
              OpenAI API key required for transcription
            </p>
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-sm text-amber-700 hover:text-amber-900 underline"
            >
              Set API Key
            </button>
          </div>
        )}

        {/* API Key Input */}
        {showApiKeyInput && (
          <div className="w-full max-w-sm p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <label className="block text-sm font-medium text-text-primary mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveApiKey}
                className="flex-1 px-3 py-2 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowApiKeyInput(false);
                  setTempApiKey("");
                }}
                className="px-3 py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mode Toggle: Transcribe vs Translate */}
        <div className="flex items-center gap-3 p-1 bg-slate-100 rounded-full">
          <button
            onClick={() => updateSettings({ translateToEnglish: false })}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              !settings.translateToEnglish
                ? "bg-white text-primary-600 shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Transcribe
          </button>
          <button
            onClick={() => updateSettings({ translateToEnglish: true })}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
              settings.translateToEnglish
                ? "bg-white text-primary-600 shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            To English
          </button>
        </div>
        {settings.translateToEnglish && (
          <p className="text-xs text-primary-600">
            Speak any language → English output
          </p>
        )}

        <RecordingButton />

        {/* API Key Status */}
        {apiKey && (
          <button
            onClick={() => setShowApiKeyInput(true)}
            className="text-xs text-green-600 hover:text-green-700"
          >
            API Key configured
          </button>
        )}

        {/* Last transcription preview */}
        {lastTranscription && recordingState === "idle" && (
          <div className="w-full max-w-sm">
            <p className="text-xs text-text-secondary mb-1">Last transcription:</p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
              <p className="text-sm text-text-primary whitespace-pre-wrap">
                {lastTranscription.text}
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer - Hotkey Quick Reference */}
      <footer className="px-4 py-2 border-t border-slate-200 bg-surface">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-1">
          <div className="text-xs text-text-secondary text-center">
            <span className="text-text-tertiary">Voice-to-Text:</span>{" "}
            <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-xs font-mono">
              {formatHotkeyDisplay(settings.hotkeyRecord || "Ctrl+Space")}
            </kbd>
          </div>
          <div className="text-xs text-text-secondary text-center">
            <span className="text-text-tertiary">AI Transform:</span>{" "}
            <kbd className="px-1.5 py-0.5 bg-primary-100 rounded text-xs font-mono text-primary-700">
              {formatHotkeyDisplay(settings.hotkeyAiTransform || "Ctrl+`")}
            </kbd>
          </div>
          {/* Active webhook hotkeys */}
          {settings.webhookActions?.filter(w => w.enabled).map((webhook) => (
            <div key={webhook.id} className="text-xs text-text-secondary text-center">
              <span className="text-text-tertiary">{webhook.name}:</span>{" "}
              <kbd className="px-1.5 py-0.5 bg-emerald-100 rounded text-xs font-mono text-emerald-700">
                {formatHotkeyDisplay(webhook.hotkey)}
              </kbd>
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}

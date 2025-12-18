import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { VoiceCommandMatch } from "../types";

interface VoiceReviewData {
  transcribedText: string;
  matches: VoiceCommandMatch[];
}

export default function VoiceReviewPanel() {
  const [data, setData] = useState<VoiceReviewData | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  // Send result back to main app (moved up for use in effects)
  const sendResult = useCallback((selectedIndex: number | null) => {
    const payload = selectedIndex !== null
      ? { selectedIndex, cancelled: false }
      : { selectedIndex: null, cancelled: true };

    console.log("[VoiceReviewPanel] Sending result:", payload);
    invoke("emit_voice_review_result", { result: payload }).catch(console.error);
  }, []);

  // Global Escape handler - works even when data is null (stuck Loading state)
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        console.log("[VoiceReviewPanel] Global Escape pressed, cancelling");
        sendResult(null);
      }
    };

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [sendResult]);

  // Listen for voice review data from main app
  useEffect(() => {
    const unlisten = listen<VoiceReviewData>("voice-review-data", (event) => {
      console.log("[VoiceReviewPanel] Received data:", event.payload);
      setData(event.payload);
      setSelectedIndex(0);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-close timeout if data doesn't arrive in 5 seconds
  useEffect(() => {
    if (data === null) {
      timeoutRef.current = window.setTimeout(() => {
        console.log("[VoiceReviewPanel] Timeout: no data received, auto-closing");
        sendResult(null);
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, sendResult]);

  // Handle keyboard input for navigation (when data is loaded)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || data.matches.length === 0) return;

      // Number keys 1-5 for immediate selection
      if (e.key >= "1" && e.key <= "5") {
        const index = parseInt(e.key) - 1;
        if (index < data.matches.length) {
          sendResult(index);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, data.matches.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          sendResult(selectedIndex);
          break;
        case "Escape":
          e.preventDefault();
          sendResult(null);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, selectedIndex, sendResult]);

  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/95 rounded-xl shadow-2xl">
        <p className="text-slate-500 mb-4">Loading...</p>
        <button
          onClick={() => sendResult(null)}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
        >
          Cancel (Esc)
        </button>
      </div>
    );
  }

  const { transcribedText, matches } = data;

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
          <h2 className="text-base font-semibold text-purple-900">Voice Command</h2>
        </div>
        <p className="mt-1 text-sm text-purple-700 truncate">
          You said: "<span className="font-medium">{transcribedText}</span>"
        </p>
      </div>

      {/* Matches list */}
      <div className="flex-1 p-3 overflow-y-auto">
        {matches.length === 0 ? (
          <div className="text-center py-6">
            <svg className="w-10 h-10 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-600 font-medium text-sm">No matching action found</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {matches.slice(0, 5).map((match, index) => {
              const actionName = match.action.name;
              const isSelected = index === selectedIndex;
              const confidencePercent = Math.round(match.confidence * 100);

              return (
                <button
                  key={`${match.action.name}-${index}`}
                  onClick={() => sendResult(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                      : "bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                        isSelected ? "bg-purple-500 text-white" : "bg-slate-200 text-slate-600"
                      }`}>
                        {index + 1}
                      </span>
                      <span className={`font-medium truncate ${isSelected ? "text-purple-900" : "text-slate-800"}`}>
                        {actionName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        match.matchType === "exact" ? "bg-green-100 text-green-700" :
                        match.matchType === "contains" ? "bg-blue-100 text-blue-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>
                        {match.matchType}
                      </span>
                      <span className={`text-xs font-medium w-8 text-right ${
                        confidencePercent >= 80 ? "text-green-600" :
                        confidencePercent >= 50 ? "text-amber-600" :
                        "text-slate-500"
                      }`}>
                        {confidencePercent}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          1-5 Select | Esc Cancel
        </span>
        <button
          onClick={() => sendResult(null)}
          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
        >
          None of these
        </button>
      </div>
    </div>
  );
}

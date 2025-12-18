import { useState, useEffect, useCallback } from "react";
import type { VoiceCommandMatch } from "../types";

interface VoiceCommandModalProps {
  isOpen: boolean;
  transcribedText: string;
  matches: VoiceCommandMatch[];
  autoExecuteThreshold: number;
  onExecute: (match: VoiceCommandMatch) => void;
  onCancel: () => void;
}

export default function VoiceCommandModal({
  isOpen,
  transcribedText,
  matches,
  autoExecuteThreshold,
  onExecute,
  onCancel,
}: VoiceCommandModalProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const topMatch = matches[0];
  const shouldAutoExecute = topMatch && topMatch.confidence >= autoExecuteThreshold;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIndex(0);
      if (shouldAutoExecute) {
        setCountdown(1.5); // 1.5 second countdown
      } else {
        setCountdown(null);
      }
    }
  }, [isOpen, shouldAutoExecute]);

  // Auto-execute countdown
  useEffect(() => {
    if (!isOpen || countdown === null || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 0.1) {
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  // Execute when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && topMatch) {
      onExecute(topMatch);
    }
  }, [countdown, topMatch, onExecute]);

  const handleCancelCountdown = useCallback(() => {
    setCountdown(null);
  }, []);

  const handleExecuteSelected = useCallback(() => {
    const selectedMatch = matches[selectedIndex];
    if (selectedMatch) {
      onExecute(selectedMatch);
    }
  }, [matches, selectedIndex, onExecute]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      } else if (e.key === "Enter") {
        handleExecuteSelected();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, matches.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, matches.length, handleExecuteSelected, onCancel]);

  if (!isOpen) return null;

  const confidencePercent = topMatch ? Math.round(topMatch.confidence * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <h2 className="text-lg font-semibold text-purple-900">Voice Command</h2>
          </div>
          <p className="mt-1 text-sm text-purple-700">
            You said: "<span className="font-medium">{transcribedText}</span>"
          </p>
        </div>

        {/* Content */}
        <div className="p-5">
          {matches.length === 0 ? (
            // No matches
            <div className="text-center py-6">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-600 font-medium">No matching action found</p>
              <p className="text-sm text-slate-500 mt-1">
                Try saying the exact name of an action
              </p>
            </div>
          ) : (
            <>
              {/* Best match with confidence */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-600">Best match</span>
                  <span className={`text-sm font-medium ${
                    confidencePercent >= 90 ? "text-green-600" :
                    confidencePercent >= 70 ? "text-amber-600" :
                    "text-slate-600"
                  }`}>
                    {confidencePercent}% confidence
                  </span>
                </div>
                {/* Confidence bar */}
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      confidencePercent >= 90 ? "bg-green-500" :
                      confidencePercent >= 70 ? "bg-amber-500" :
                      "bg-slate-400"
                    }`}
                    style={{ width: `${confidencePercent}%` }}
                  />
                </div>
              </div>

              {/* Auto-execute countdown */}
              {countdown !== null && countdown > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-800">
                      Auto-executing in {countdown.toFixed(1)}s...
                    </span>
                    <button
                      onClick={handleCancelCountdown}
                      className="text-sm text-green-600 hover:text-green-800 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Matches list */}
              <div className="space-y-2">
                {matches.slice(0, 5).map((match, index) => {
                  const actionName = match.action.name;
                  const isSelected = index === selectedIndex;

                  return (
                    <button
                      key={`${match.action.name}-${index}`}
                      onClick={() => {
                        setSelectedIndex(index);
                        onExecute(match);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full p-3 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "bg-purple-50 border-purple-300 ring-2 ring-purple-200"
                          : "bg-white border-slate-200 hover:border-purple-200 hover:bg-purple-50/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${isSelected ? "text-purple-900" : "text-slate-800"}`}>
                          {actionName}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          match.matchType === "exact" ? "bg-green-100 text-green-700" :
                          match.matchType === "contains" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {match.matchType}
                        </span>
                      </div>
                      {"type" in match.action && match.action.type === "main" ? (
                        <p className="text-xs text-slate-500 mt-1">System action</p>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1">
                          {"method" in match.action ? match.action.method : "Prompt"} action
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {matches.length > 5 && (
                <p className="text-xs text-slate-500 mt-3 text-center">
                  +{matches.length - 5} more matches
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Use ↑↓ to navigate, Enter to execute
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            {matches.length > 0 && (
              <button
                onClick={handleExecuteSelected}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Execute
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

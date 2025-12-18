import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import type { ChromeProfile } from "../types";

interface ProfileChooserData {
  profiles: ChromeProfile[];
  action_name: string;
}

export default function ProfileChooserWindow() {
  const [data, setData] = useState<ProfileChooserData | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Filter profiles by display name
  const filteredProfiles = useMemo(() =>
    data?.profiles.filter((p) =>
      p.display_name.toLowerCase().includes(filter.toLowerCase())
    ) ?? [],
    [data?.profiles, filter]
  );

  // Send result back to main app
  const sendResult = useCallback((profileDirectory: string | null, cancelled: boolean) => {
    const payload = { profileDirectory, cancelled };
    console.log("[ProfileChooserWindow] Sending result:", payload);
    invoke("emit_profile_chooser_result", { result: payload }).catch(console.error);
  }, []);

  // Global Escape handler - works even when data is null
  useEffect(() => {
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        console.log("[ProfileChooserWindow] Global Escape pressed, cancelling");
        sendResult(null, true);
      }
    };

    window.addEventListener("keydown", handleGlobalEscape);
    return () => window.removeEventListener("keydown", handleGlobalEscape);
  }, [sendResult]);

  // Listen for profile chooser data from main app
  useEffect(() => {
    const unlisten = listen<ProfileChooserData>("profile-chooser-data", (event) => {
      console.log("[ProfileChooserWindow] Received data:", event.payload);
      setData(event.payload);
      setFilter("");
      setSelectedIndex(0);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Focus the input when data arrives
      setTimeout(() => inputRef.current?.focus(), 50);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Auto-close timeout if data doesn't arrive in 5 seconds
  useEffect(() => {
    if (data === null) {
      timeoutRef.current = window.setTimeout(() => {
        console.log("[ProfileChooserWindow] Timeout: no data received, auto-closing");
        sendResult(null, true);
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, sendResult]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredProfiles.length) {
      setSelectedIndex(Math.max(0, filteredProfiles.length - 1));
    }
  }, [filteredProfiles.length, selectedIndex]);

  // Handle keyboard navigation (when data is loaded)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!data || filteredProfiles.length === 0) return;

      // Number keys 1-9 for instant profile selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const index = num - 1;
        if (filteredProfiles[index]) {
          sendResult(filteredProfiles[index].profile_directory, false);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredProfiles.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredProfiles[selectedIndex]) {
            sendResult(filteredProfiles[selectedIndex].profile_directory, false);
          }
          break;
        // Escape is handled by global handler
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [data, filteredProfiles, selectedIndex, sendResult]);

  // Loading state
  if (!data) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white/95 rounded-xl shadow-2xl">
        <p className="text-slate-500 mb-4">Loading...</p>
        <button
          onClick={() => sendResult(null, true)}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors border border-slate-300"
        >
          Cancel (Esc)
        </button>
      </div>
    );
  }

  const { profiles, action_name } = data;

  return (
    <div className="w-full h-full bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-800">
          Choose Chrome Profile
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {action_name}
        </p>
      </div>

      {/* Search/filter input */}
      <div className="px-4 py-2 border-b border-slate-100">
        <input
          ref={inputRef}
          type="text"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="Type to filter..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          autoFocus
        />
      </div>

      {/* Profile list */}
      <div className="flex-1 overflow-y-auto">
        {filteredProfiles.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500">
            {profiles.length === 0
              ? "No Chrome profiles found"
              : "No profiles match your filter"}
          </div>
        ) : (
          <ul className="py-1">
            {filteredProfiles.map((profile, index) => (
              <li key={profile.profile_directory}>
                <button
                  onClick={() => sendResult(profile.profile_directory, false)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                    index === selectedIndex
                      ? "bg-purple-50 text-purple-700"
                      : "hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  {/* Number badge for quick selection (1-9 only) */}
                  {index < 9 && (
                    <kbd className={`w-5 h-5 flex items-center justify-center border rounded text-xs font-mono shrink-0 ${
                      index === selectedIndex
                        ? "bg-purple-500 border-purple-600 text-white"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}>
                      {index + 1}
                    </kbd>
                  )}
                  {/* Profile icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    index === selectedIndex
                      ? "bg-purple-200 text-purple-700"
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    {profile.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {profile.display_name}
                    </p>
                    <p className={`text-xs truncate ${
                      index === selectedIndex ? "text-purple-500" : "text-slate-400"
                    }`}>
                      {profile.profile_directory}
                    </p>
                  </div>
                  {index === selectedIndex && (
                    <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-slate-500">
                      Enter
                    </kbd>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-200 flex justify-between items-center bg-slate-50">
        <p className="text-xs text-slate-500">
          1-9 or ↑↓+Enter to select • Esc to cancel
        </p>
        <button
          onClick={() => sendResult(null, true)}
          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

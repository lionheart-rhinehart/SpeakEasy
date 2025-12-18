import { useState, useEffect, useRef, useCallback } from "react";
import type { ChromeProfile } from "../types";

interface ProfileChooserModalProps {
  isOpen: boolean;
  profiles: ChromeProfile[];
  actionName: string;
  onSelect: (profile: ChromeProfile) => void;
  onCancel: () => void;
}

export default function ProfileChooserModal({
  isOpen,
  profiles,
  actionName,
  onSelect,
  onCancel,
}: ProfileChooserModalProps) {
  const [filter, setFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter profiles by display name
  const filteredProfiles = profiles.filter((p) =>
    p.display_name.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setFilter("");
      setSelectedIndex(0);
      // Focus the input when modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filteredProfiles.length) {
      setSelectedIndex(Math.max(0, filteredProfiles.length - 1));
    }
  }, [filteredProfiles.length, selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Number keys 1-9 for instant profile selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        e.preventDefault();
        const index = num - 1; // 1 -> index 0, 2 -> index 1, etc.
        if (filteredProfiles[index]) {
          onSelect(filteredProfiles[index]);
        }
        return;
      }

      // Arrow keys for navigation
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredProfiles.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredProfiles[selectedIndex]) {
          onSelect(filteredProfiles[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [filteredProfiles, selectedIndex, onSelect, onCancel]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-text-primary">
            Choose Chrome Profile
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {actionName}
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
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            autoFocus
          />
        </div>

        {/* Profile list */}
        <div className="max-h-64 overflow-y-auto">
          {filteredProfiles.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-secondary">
              {profiles.length === 0
                ? "No Chrome profiles found"
                : "No profiles match your filter"}
            </div>
          ) : (
            <ul className="py-1">
              {filteredProfiles.map((profile, index) => (
                <li key={profile.profile_directory}>
                  <button
                    onClick={() => onSelect(profile)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                      index === selectedIndex
                        ? "bg-primary-50 text-primary-700"
                        : "hover:bg-slate-50 text-text-primary"
                    }`}
                  >
                    {/* Number badge for quick selection (1-9 only) */}
                    {index < 9 && (
                      <kbd className="w-5 h-5 flex items-center justify-center bg-slate-100 border border-slate-200 rounded text-xs text-slate-500 font-mono shrink-0">
                        {index + 1}
                      </kbd>
                    )}
                    {/* Profile icon */}
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 shrink-0">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {profile.display_name}
                      </p>
                      <p className="text-xs text-text-secondary truncate">
                        {profile.profile_directory}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs text-text-secondary">
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
        <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-text-secondary">
            1-9 or ↑↓+Enter to select • Esc to cancel
          </p>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

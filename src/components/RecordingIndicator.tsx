import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/appStore";

export default function RecordingIndicator() {
  const recordingState = useAppStore((state) => state.recordingState);
  const [waveformHistory, setWaveformHistory] = useState<number[]>(Array(20).fill(0));
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (recordingState === "recording") {
      // Poll audio level at ~30fps
      const pollLevel = async () => {
        try {
          const level = await invoke<number>("get_audio_level");

          // Update waveform history
          setWaveformHistory((prev) => {
            const next = [...prev.slice(1), level];
            return next;
          });
        } catch (_e) {
          // Ignore errors
        }
        animationRef.current = requestAnimationFrame(pollLevel);
      };

      pollLevel();
    } else {
      // Reset when not recording
      setWaveformHistory(Array(20).fill(0));
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [recordingState]);

  // Don't show if not recording
  if (recordingState !== "recording") {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-red-500 rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-pulse-subtle">
        {/* Recording dot */}
        <div className="relative">
          <div className="w-3 h-3 bg-white rounded-full" />
          <div className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping opacity-75" />
        </div>

        {/* Waveform visualization */}
        <div className="flex items-center gap-0.5 h-8">
          {waveformHistory.map((level, i) => (
            <div
              key={i}
              className="w-1 bg-white/90 rounded-full transition-all duration-75"
              style={{
                height: `${Math.max(4, level * 32)}px`,
                opacity: 0.5 + (i / waveformHistory.length) * 0.5,
              }}
            />
          ))}
        </div>

        {/* Recording text */}
        <span className="text-white text-sm font-medium ml-1">REC</span>
      </div>
    </div>
  );
}

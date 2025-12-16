import { useEffect, useState, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

type OverlayState = "recording" | "processing";

interface OverlayStatePayload {
  state: string;
  recordingDurationMs?: number | null;
}

export default function RecordingOverlay() {
  // Listen for overlay-state-change events from backend
  useEffect(() => {
    const unlistenPromise = listen<OverlayStatePayload>("overlay-state-change", (event) => {
      console.log("[Overlay] Received overlay-state-change event:", event.payload);
      if (!event.payload || typeof event.payload !== "object") return;
      const { state, recordingDurationMs } = event.payload;
      if (state === "recording") {
        setOverlayState("recording");
        setProcessingStartTime(null);
        setElapsedSeconds(0);
        setWaveformHistory(Array(12).fill(0.2));
        hasSeenRecording.current = true;
        console.log("[Overlay] Set state: recording");
      } else if (state === "processing") {
        setOverlayState("processing");
        setProcessingStartTime(Date.now() - (typeof recordingDurationMs === "number" ? recordingDurationMs : 0));
        setElapsedSeconds(0);
        hasSeenRecording.current = false;
        console.log("[Overlay] Set state: processing");
      }
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const [waveformHistory, setWaveformHistory] = useState<number[]>(Array(12).fill(0.2));
  const [overlayState, setOverlayState] = useState<OverlayState>("recording");
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  // Track if we've ever seen recording as true - only switch to processing after that
  const hasSeenRecording = useRef(false);

  // Timer for processing elapsed time
  useEffect(() => {
    if (overlayState !== "processing" || !processingStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - processingStartTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [overlayState, processingStartTime]);

  // Poll recording state and audio levels - switch to processing when recording stops
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if still recording
        const state = await invoke<{ is_recording: boolean }>("get_recording_state");

        if (state.is_recording) {
          // Recording is active
          if (!hasSeenRecording.current) {
            // First time seeing recording - reset everything to recording state
            hasSeenRecording.current = true;
            setOverlayState("recording");
            setProcessingStartTime(null);
            setElapsedSeconds(0);
            setWaveformHistory(Array(12).fill(0.2));
          }
          // Update waveform
          const level = await invoke<number>("get_audio_level");
          setWaveformHistory((prev) => [...prev.slice(1), level]);
        } else if (hasSeenRecording.current && overlayState === "recording") {
          // Recording stopped AFTER we saw it recording - switch to processing
          console.log("RecordingOverlay: Recording stopped, switching to processing");
          hasSeenRecording.current = false; // Reset for next recording session
          setOverlayState("processing");
          setProcessingStartTime(Date.now());
          setElapsedSeconds(0);
        }
      } catch (_e) {
        // Ignore errors
      }
    }, 50);

    return () => clearInterval(interval);
  }, [overlayState]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (overlayState === "processing") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-transparent">
        <div className="bg-amber-500 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3">
          {/* Spinner */}
          <div className="relative w-5 h-5">
            <svg
              className="animate-spin w-5 h-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>

          {/* Processing text with elapsed time */}
          <div className="flex flex-col">
            <span className="text-white text-xs font-medium">Processing...</span>
            <span className="text-white/70 text-[10px]">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent">
      <div className="bg-red-500 rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3">
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
              className="w-1 bg-white rounded-full"
              style={{
                height: `${Math.max(4, Math.min(32, level * 80))}px`,
              }}
            />
          ))}
        </div>

        {/* Recording text */}
        <span className="text-white text-xs font-medium">REC</span>
      </div>
    </div>
  );
}

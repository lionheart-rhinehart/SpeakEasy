import { useEffect, useState } from "react";
import { useAppStore } from "../stores/appStore";

export default function StatusIndicator() {
  const { recordingState, recordingStartTime } = useAppStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (recordingState !== "recording" || !recordingStartTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recordingStartTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [recordingState, recordingStartTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusText = () => {
    switch (recordingState) {
      case "recording":
        return "Recording...";
      case "processing":
        return "Processing...";
      case "error":
        return "Error occurred";
      default:
        return "Ready";
    }
  };

  const getStatusColor = () => {
    switch (recordingState) {
      case "recording":
        return "text-error";
      case "processing":
        return "text-warning";
      case "error":
        return "text-error";
      default:
        return "text-success";
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Status dot and text */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            recordingState === "recording"
              ? "bg-error animate-pulse-recording"
              : recordingState === "processing"
              ? "bg-warning animate-pulse"
              : recordingState === "error"
              ? "bg-error"
              : "bg-success"
          }`}
        />
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      {/* Timer when recording */}
      {recordingState === "recording" && (
        <div className="text-3xl font-mono font-bold text-text-primary tabular-nums">
          {formatTime(elapsed)}
        </div>
      )}

      {/* Processing spinner text */}
      {recordingState === "processing" && (
        <p className="text-sm text-text-secondary">
          Transcribing your audio...
        </p>
      )}
    </div>
  );
}

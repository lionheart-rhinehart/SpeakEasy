import { invoke } from "@tauri-apps/api/core";
import { useAppStore } from "../stores/appStore";

export default function RecordingButton() {
  const { recordingState, startRecording, stopRecording, addTranscription, apiKey, setRecordingState, settings } = useAppStore();

  const handleClick = async () => {
    if (recordingState === "idle") {
      try {
        // Call Tauri backend to start recording
        await invoke("start_recording");
        startRecording();
      } catch (error) {
        console.error("Failed to start recording:", error);
        setRecordingState("idle");
      }
    } else if (recordingState === "recording") {
      stopRecording();

      try {
        if (!apiKey) {
          // No API key - use mock transcription
          setTimeout(() => {
            addTranscription({
              id: crypto.randomUUID(),
              text: "Please set your OpenAI API key in settings to enable real transcription.",
              durationMs: 2000,
              language: "en",
              createdAt: new Date().toISOString(),
            });
          }, 500);
          return;
        }

        // Call Tauri backend to transcribe - always use English unless specified
        const lang = settings.language === "auto" ? "en" : settings.language;
        const result = await invoke<{
          text: string;
          language: string;
          duration_ms: number;
        }>("transcribe_audio", {
          apiKey,
          language: lang,
        });

        if (!result.text.trim()) {
          addTranscription({
            id: crypto.randomUUID(),
            text: "No speech detected",
            durationMs: result.duration_ms,
            language: result.language,
            createdAt: new Date().toISOString(),
          });
          return;
        }

        addTranscription({
          id: crypto.randomUUID(),
          text: result.text,
          durationMs: result.duration_ms,
          language: result.language,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Failed to transcribe:", error);
        // Show error as transcription
        addTranscription({
          id: crypto.randomUUID(),
          text: `Error: ${error}`,
          durationMs: 0,
          language: "en",
          createdAt: new Date().toISOString(),
        });
      }
    } else if (recordingState === "processing") {
      // Recovery: cancel stuck processing state
      console.log("RecordingButton: cancelling stuck processing state");
      setRecordingState("idle");
      invoke("hide_recording_overlay").catch(console.error);
    }
  };

  const isRecording = recordingState === "recording";
  const isProcessing = recordingState === "processing";

  return (
    <button
      onClick={handleClick}
      className={`
        relative w-24 h-24 rounded-full transition-all duration-200
        flex items-center justify-center
        ${
          isRecording
            ? "bg-error hover:bg-red-600 scale-110"
            : isProcessing
            ? "bg-amber-500 hover:bg-amber-600 cursor-pointer"
            : "bg-primary-500 hover:bg-primary-600 hover:scale-105"
        }
        shadow-lg hover:shadow-xl
        focus:outline-none focus:ring-4 focus:ring-primary-500/30
      `}
    >
      {/* Pulse animation when recording */}
      {isRecording && (
        <span className="absolute inset-0 rounded-full bg-error animate-ping opacity-30" />
      )}

      {/* Icon */}
      {isProcessing ? (
        // Cancel icon (X) when processing - click to cancel stuck state
        <svg
          className="w-10 h-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ) : isRecording ? (
        <svg
          className="w-10 h-10 text-white"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          className="w-10 h-10 text-white"
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
      )}
    </button>
  );
}

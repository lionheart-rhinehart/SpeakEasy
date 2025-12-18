import { useAppStore } from "../stores/appStore";

interface VoiceCommandButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export default function VoiceCommandButton({ onClick, disabled = false }: VoiceCommandButtonProps) {
  const voiceCommandListening = useAppStore((state) => state.voiceCommandListening);
  const globalBusy = useAppStore((state) => state.globalBusy);
  const settings = useAppStore((state) => state.settings);

  const isDisabled = disabled || globalBusy || !settings.voiceCommandEnabled;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`
        w-12 h-12 rounded-full flex items-center justify-center
        transition-all duration-200 shadow-md
        ${isDisabled
          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
          : voiceCommandListening
            ? "bg-purple-500 text-white animate-pulse shadow-purple-300"
            : "bg-purple-100 hover:bg-purple-200 text-purple-600 hover:shadow-lg"
        }
      `}
      title={
        isDisabled
          ? globalBusy
            ? "Wait for current action to complete"
            : !settings.voiceCommandEnabled
              ? "Voice commands disabled"
              : "Disabled"
          : voiceCommandListening
            ? "Listening for command..."
            : "Voice Command - speak an action name"
      }
    >
      {/* Microphone with speech bubble icon */}
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {voiceCommandListening ? (
          // Animated waves when listening
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.5 8.5c0 0-1.5 1-1.5 3.5m9-3.5c0 0 1.5 1 1.5 3.5"
              className="animate-pulse"
            />
          </>
        ) : (
          // Microphone with speech indicator
          <>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
            {/* Small speech bubble indicator */}
            <circle
              cx="18"
              cy="6"
              r="3"
              fill="currentColor"
              className="opacity-60"
            />
          </>
        )}
      </svg>
    </button>
  );
}

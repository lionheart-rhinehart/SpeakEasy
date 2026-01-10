/**
 * Convert transcription errors into user-friendly messages.
 *
 * Categorizes errors by type to help users understand what went wrong
 * and what action they can take to fix it.
 *
 * @param error - The error from transcription (can be any type)
 * @returns A user-friendly error message
 */
export function getTranscriptionErrorMessage(error: unknown): string {
  const errorString = String(error).toLowerCase();

  // Timeout - usually network issue
  if (errorString.includes("timed out") || errorString.includes("timeout")) {
    return "Transcription timed out. Check your internet connection and try again.";
  }

  // API key issues
  if (errorString.includes("401") || errorString.includes("unauthorized") || errorString.includes("invalid api key")) {
    return "API key invalid. Please check your OpenAI API key in Settings.";
  }

  // Rate limiting
  if (errorString.includes("429") || errorString.includes("rate limit") || errorString.includes("too many requests")) {
    return "Rate limited by OpenAI. Please wait a moment and try again.";
  }

  // No audio captured
  if (errorString.includes("no audio") || errorString.includes("empty audio") || errorString.includes("no samples")) {
    return "No audio was captured. Check your microphone settings.";
  }

  // Server errors
  if (errorString.includes("500") || errorString.includes("502") || errorString.includes("503") || errorString.includes("504")) {
    return "OpenAI is temporarily unavailable. Please try again later.";
  }

  // Network errors
  if (errorString.includes("network") || errorString.includes("connection") || errorString.includes("dns") || errorString.includes("enotfound")) {
    return "Network error. Check your internet connection.";
  }

  // Insufficient quota/credits
  if (errorString.includes("insufficient") || errorString.includes("quota") || errorString.includes("billing")) {
    return "OpenAI quota exceeded. Please check your OpenAI account billing.";
  }

  // Default - show the actual error
  // Use the original error string (not lowercase) for display
  return `Transcription failed: ${String(error)}`;
}

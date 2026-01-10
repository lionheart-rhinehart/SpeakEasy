import { invoke } from "@tauri-apps/api/core";

export interface TranscriptionResult {
  text: string;
  language: string;
  duration_ms: number;
}

/**
 * Transcribe audio with a timeout to prevent infinite hangs.
 *
 * The backend can take up to 75+ minutes in worst case (5 retries × 15 min timeout),
 * so this wrapper ensures the frontend always gets a response within a reasonable time.
 *
 * @param apiKey - OpenAI API key
 * @param language - Language code (e.g., "en", "es") or null for auto-detect
 * @param translateToEnglish - If true, uses /translations endpoint to output English
 * @param timeoutMs - Timeout in milliseconds (default: 60 seconds)
 * @returns TranscriptionResult with text, language, and duration
 * @throws Error if transcription fails or times out
 */
export async function transcribeWithTimeout(
  apiKey: string,
  language: string | null,
  translateToEnglish: boolean,
  timeoutMs: number = 60000
): Promise<TranscriptionResult> {
  console.log("[DEBUG] transcribeWithTimeout START", {
    apiKey: apiKey ? "SET (" + apiKey.length + " chars)" : "MISSING",
    language,
    translateToEnglish,
    timeoutMs
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    console.log("[DEBUG] Timeout promise created, will fire in", timeoutMs, "ms");
    setTimeout(() => {
      console.log("[DEBUG] TIMEOUT FIRED! No response after", timeoutMs, "ms");
      reject(new Error("Transcription timed out. The API may be slow or unreachable. Please try again."));
    }, timeoutMs);
  });

  console.log("[DEBUG] About to call invoke('transcribe_audio')");
  const startTime = Date.now();

  try {
    const result = await Promise.race([
      invoke<TranscriptionResult>("transcribe_audio", {
        apiKey,
        language,
        translateToEnglish,
      }).then(r => {
        console.log("[DEBUG] invoke('transcribe_audio') resolved after", Date.now() - startTime, "ms:", r);
        return r;
      }).catch(e => {
        console.log("[DEBUG] invoke('transcribe_audio') rejected after", Date.now() - startTime, "ms:", e);
        throw e;
      }),
      timeoutPromise,
    ]);
    console.log("[DEBUG] transcribeWithTimeout SUCCESS after", Date.now() - startTime, "ms");
    return result;
  } catch (error) {
    console.log("[DEBUG] transcribeWithTimeout ERROR after", Date.now() - startTime, "ms:", error);
    throw error;
  }
}

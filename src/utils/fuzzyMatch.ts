import type { WebhookAction, PromptAction, MainHotkeyAction, VoiceCommandMatch } from "../types";

type ActionType = WebhookAction | PromptAction | MainHotkeyAction;

/**
 * Calculate Levenshtein distance between two strings.
 * This measures the minimum number of single-character edits required
 * to change one string into the other.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[a.length][b.length];
}

/**
 * Get the name from any action type.
 */
function getActionName(action: ActionType): string {
  return action.name;
}

/**
 * Match spoken text against a list of available actions using multi-tier matching.
 *
 * Matching tiers (in order of confidence):
 * 1. Exact match (case-insensitive) - confidence: 1.0
 * 2. Contains match - confidence: 0.7-0.9
 * 3. Word overlap match - confidence: 0.5-0.95
 * 4. Levenshtein distance (fuzzy) - confidence: 0.4-0.85
 *
 * @param spokenText - The transcribed text from voice command
 * @param actions - Array of available actions to match against
 * @returns Array of matches sorted by confidence (highest first)
 */
export function matchVoiceCommand(
  spokenText: string,
  actions: ActionType[]
): VoiceCommandMatch[] {
  const spoken = spokenText.toLowerCase().trim();

  if (!spoken) {
    return [];
  }

  const matches: VoiceCommandMatch[] = [];
  const spokenWords = spoken.split(/\s+/).filter(w => w.length > 0);

  for (const action of actions) {
    const name = getActionName(action).toLowerCase();
    const nameWords = name.split(/\s+/).filter(w => w.length > 0);

    // Tier 1: Exact match (case-insensitive)
    if (spoken === name) {
      matches.push({
        action,
        confidence: 1.0,
        matchType: "exact",
      });
      continue;
    }

    // Tier 2: Contains match
    // Check if one contains the other
    if (name.includes(spoken) || spoken.includes(name)) {
      const shorterLen = Math.min(spoken.length, name.length);
      const longerLen = Math.max(spoken.length, name.length);
      const coverage = shorterLen / longerLen;
      // Higher coverage = higher confidence (0.7 to 0.9 range)
      const confidence = 0.7 + coverage * 0.2;
      matches.push({
        action,
        confidence,
        matchType: "contains",
      });
      continue;
    }

    // Tier 3: Word overlap match
    // Count how many words match between spoken and action name
    let matchingWords = 0;
    for (const spokenWord of spokenWords) {
      for (const nameWord of nameWords) {
        if (nameWord.includes(spokenWord) || spokenWord.includes(nameWord)) {
          matchingWords++;
          break;
        }
      }
    }

    if (matchingWords > 0) {
      const maxWords = Math.max(spokenWords.length, nameWords.length);
      const wordScore = matchingWords / maxWords;

      // Require at least 25% word overlap (lowered from 50%)
      if (wordScore >= 0.25) {
        // 0.5 to 0.95 range based on word overlap (boosted for better threshold behavior)
        const confidence = 0.5 + wordScore * 0.45;
        matches.push({
          action,
          confidence,
          matchType: "fuzzy",
        });
        continue;
      }
    }

    // Tier 4: Levenshtein distance (fuzzy matching for typos)
    const distance = levenshteinDistance(spoken, name);
    const maxLen = Math.max(spoken.length, name.length);
    const similarity = 1 - distance / maxLen;

    // Require at least 30% similarity (lowered from 60%)
    if (similarity >= 0.3) {
      // 0.4 to 0.85 range based on similarity (boosted for better threshold behavior)
      const confidence = 0.4 + similarity * 0.45;
      matches.push({
        action,
        confidence,
        matchType: "fuzzy",
      });
    }
  }

  // Sort by confidence (highest first)
  matches.sort((a, b) => b.confidence - a.confidence);

  return matches;
}

/**
 * Get the top N matches from the voice command matching results.
 */
export function getTopMatches(
  matches: VoiceCommandMatch[],
  limit: number = 3
): VoiceCommandMatch[] {
  return matches.slice(0, limit);
}

/**
 * Check if the top match has high enough confidence for auto-execution.
 * @param matches - Array of matches from matchVoiceCommand
 * @param threshold - Minimum confidence for auto-execute (default: 0.9)
 */
export function shouldAutoExecute(
  matches: VoiceCommandMatch[],
  threshold: number = 0.9
): boolean {
  if (matches.length === 0) {
    return false;
  }

  const topMatch = matches[0];

  // Only auto-execute if confidence is above threshold
  // AND there's a significant gap between top match and second match
  if (topMatch.confidence >= threshold) {
    if (matches.length === 1) {
      return true;
    }

    const secondMatch = matches[1];
    const confidenceGap = topMatch.confidence - secondMatch.confidence;

    // Require at least 0.15 gap between top two matches to avoid ambiguity
    return confidenceGap >= 0.15;
  }

  return false;
}

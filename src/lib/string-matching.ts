import { distance } from 'fastest-levenshtein';

export interface MatchResult {
  target: string;
  score: number; // 0 to 1, where 1 is perfect match
}

export function findBestMatch(source: string, targets: string[]): MatchResult | null {
  if (!source || targets.length === 0) return null;

  const normalizedSource = source.toLowerCase().trim();
  let bestMatch: MatchResult | null = null;
  let bestDistance = Infinity;

  for (const target of targets) {
    const normalizedTarget = target.toLowerCase().trim();
    
    // Exact match check
    if (normalizedSource === normalizedTarget) {
      return { target, score: 1 };
    }

    // Levenshtein distance
    const dist = distance(normalizedSource, normalizedTarget);
    
    // Calculate a score based on distance and length
    const maxLength = Math.max(normalizedSource.length, normalizedTarget.length);
    const score = 1 - (dist / maxLength);

    if (dist < bestDistance) {
      bestDistance = dist;
      bestMatch = { target, score };
    }
  }

  // Only return if score is above a threshold (e.g., 0.4)
  if (bestMatch && bestMatch.score > 0.4) {
    return bestMatch;
  }

  return null;
}






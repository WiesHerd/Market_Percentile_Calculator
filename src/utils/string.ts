interface SpecialtyEquivalent {
  equivalents: string[];
  keywords?: string[];
  requireAll: boolean;
  exclusions?: string[];
}

interface SpecialtyEquivalents {
  [key: string]: SpecialtyEquivalent;
}

// Enhanced string similarity calculation for specialties
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Normalize strings
  const normalize = (s: string): string => {
    return s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')  // Replace special chars with space
      .replace(/\band\b/g, ' ')       // Replace 'and' with space
      .replace(/\s+/g, ' ')          // Normalize spaces
      .replace(/\b(the|of|in|with|without)\b/g, '') // Remove common words
      .trim();
  };

  const n1 = normalize(str1);
  const n2 = normalize(str2);

  // Exact match after normalization
  if (n1 === n2) return 1;

  // Word-based comparison
  const words1 = new Set(n1.split(' ').filter(Boolean));
  const words2 = new Set(n2.split(' ').filter(Boolean));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  // Perfect word match (regardless of order)
  if (intersection.size === union.size) return 0.95;

  // Calculate base similarity score
  let similarity = intersection.size / union.size;

  // Boost score if one is contained within the other
  if (n1.includes(n2) || n2.includes(n1)) {
    similarity = Math.min(1, similarity + 0.2);
  }

  // Boost score for partial word matches
  const partialMatches = [...words1].some(w1 => 
    [...words2].some(w2 => 
      (w1.includes(w2) || w2.includes(w1)) && w1 !== w2
    )
  );
  
  if (partialMatches) {
    similarity = Math.min(1, similarity + 0.1);
  }

  return similarity;
}; 
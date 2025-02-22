interface SpecialtyEquivalent {
  equivalents: string[];
  keywords?: string[];
  requireAll: boolean;
  exclusions?: string[];
}

interface SpecialtyEquivalents {
  [key: string]: SpecialtyEquivalent;
}

// Simple string similarity calculation for specialties
export const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Normalize strings
  const normalize = (s: string): string => {
    return s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')  // Replace special chars with space
      .replace(/\s+/g, ' ')          // Normalize spaces
      .trim();
  };

  const n1 = normalize(str1);
  const n2 = normalize(str2);

  // Exact match
  if (n1 === n2) return 1;

  // Word-based comparison
  const words1 = new Set(n1.split(' '));
  const words2 = new Set(n2.split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}; 
interface SpecialtyEquivalent {
  equivalents: string[];
  keywords?: string[];
  requireAll: boolean;
  exclusions?: string[];
}

interface SpecialtyEquivalents {
  [key: string]: SpecialtyEquivalent;
}

export const calculateStringSimilarity = (str1: string, str2: string): number => {
  // Define equivalent specialty names across surveys
  const specialtyEquivalents: SpecialtyEquivalents = {
    // Allergy and Immunology variations
    allergyImmunology: {
      equivalents: [
        'allergy and immunology',
        'allergy/immunology',
        'allergy & immunology',
        'allergy immunology',
        'allergist/immunologist',
        'allergist and immunologist'
      ],
      keywords: ['allergy', 'immunology'],
      requireAll: true  // Require both keywords to be present
    },

    // General Medicine
    general: {
      equivalents: [
        'general medicine',
        'general practice',
        'general internal medicine',
        'primary care'
      ],
      keywords: ['general', 'medicine', 'practice', 'primary', 'care'],
      requireAll: false  // Don't require all keywords
    },

    // Surgical Specialties - Each should be specific
    generalSurgery: {
      equivalents: [
        'general surgery',
        'surgery (general)',
        'surgery - general'
      ],
      keywords: ['general', 'surgery'],
      requireAll: true,  // Require both keywords
      exclusions: ['allergy', 'immunology']  // Never match these terms
    },

    cardiothoracicSurgery: {
      equivalents: [
        'cardiothoracic surgery',
        'surgery (cardiothoracic)',
        'cardiovascular surgery',
        'cardiothoracic and vascular surgery',
        'thoracic and cardiovascular surgery'
      ],
      keywords: ['cardiothoracic', 'surgery'],
      requireAll: true,
      exclusions: ['general', 'allergy', 'immunology']
    }
  };

  // Normalize function - Less aggressive, preserves important separators
  const normalize = (s: string): string => {
    return s.toLowerCase()
      .replace(/\s*\/\s*/g, ' / ')  // Standardize slashes
      .replace(/\s*\(\s*/g, ' (')   // Standardize parentheses
      .replace(/\s*\)\s*/g, ') ')
      .replace(/\s*-\s*/g, ' - ')   // Standardize hyphens
      .replace(/\s+/g, ' ')         // Replace multiple spaces
      .replace(/\s*&\s*/g, ' and ') // Replace & with 'and'
      .trim();
  };

  const n1 = normalize(str1);
  const n2 = normalize(str2);

  // Check if strings are identical after normalization
  if (n1 === n2) return 1;

  // Check for equivalent specialties
  for (const specialty of Object.values(specialtyEquivalents)) {
    const normalized = specialty.equivalents.map(s => normalize(s));
    
    // If both strings are in the same equivalents group, they're a match
    if (normalized.includes(n1) && normalized.includes(n2)) {
      return 1;
    }

    // Check for exclusions first
    if (specialty.exclusions) {
      const hasExclusion = specialty.exclusions.some(ex => 
        n1.includes(normalize(ex)) || n2.includes(normalize(ex))
      );
      if (hasExclusion) continue;
    }

    // For specialties with keywords, perform strict matching
    if (specialty.keywords) {
      const words1 = new Set(n1.split(' ').filter(w => w !== 'and'));
      const words2 = new Set(n2.split(' ').filter(w => w !== 'and'));
      
      // Count matching keywords
      const keywordMatches = specialty.keywords.filter(
        kw => words1.has(normalize(kw)) || words2.has(normalize(kw))
      );

      // Check if we have enough matching keywords
      const hasEnoughMatches = specialty.requireAll
        ? keywordMatches.length === specialty.keywords.length  // All keywords must match
        : keywordMatches.length >= Math.min(2, specialty.keywords.length);  // At least 2 keywords must match

      if (hasEnoughMatches) {
        return keywordMatches.length / specialty.keywords.length;
      }
    }
  }

  // If no matches found, return 0
  return 0;
}; 
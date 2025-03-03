import { specialtyManager } from './specialtyManager';

// Types for survey-specific specialty mapping
export type SurveyVendor = 'MGMA' | 'GALLAGHER' | 'SULLIVANCOTTER';

export interface SpecialtyMapping {
  specialty: string;
  vendor: SurveyVendor;
}

// Enhanced normalization for specialty names
const normalizeSpecialtyName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[\/\-&,()]/g, ' ')  // Replace special chars with space
    .replace(/\b(and|or|the|of|in|with|without)\b/g, '')    // Remove common conjunctions
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim();
};

// Calculate similarity score between two specialty names
const calculateSimilarity = (name1: string, name2: string): number => {
  const norm1 = normalizeSpecialtyName(name1);
  const norm2 = normalizeSpecialtyName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 1.0;

  // Check if they are known synonyms using specialtyManager
  const specialties1 = specialtyManager.searchSpecialties(name1);
  const specialties2 = specialtyManager.searchSpecialties(name2);

  // If specialties are found in the manager
  if (specialties1.length > 0 && specialties2.length > 0) {
    // For each specialty found for name1, check against each specialty found for name2
    for (const specialty1 of specialties1) {
      for (const specialty2 of specialties2) {
        // Check if either is a synonym of the other
        const synonyms1 = [...specialty1.synonyms.predefined, ...specialty1.synonyms.custom];
        const synonyms2 = [...specialty2.synonyms.predefined, ...specialty2.synonyms.custom];

        // If they are synonyms of each other, high confidence
        if (synonyms1.some(s => normalizeSpecialtyName(s) === norm2) || 
            synonyms2.some(s => normalizeSpecialtyName(s) === norm1)) {
          return 0.95;
        }

        // Check if they share any synonyms
        const sharedSynonyms = synonyms1.filter(s1 => 
          synonyms2.some(s2 => normalizeSpecialtyName(s1) === normalizeSpecialtyName(s2))
        );
        if (sharedSynonyms.length > 0) {
          return 0.9;
        }

        // Check if they're in the same category
        if (specialty1.category && specialty2.category && specialty1.category === specialty2.category) {
          return 0.85;  // 85% confidence for same category
        }
      }
    }
  }
  
  // If one contains the other but they're not equal, it's not a perfect match
  // For example: "Cardiology" vs "Critical Care Medicine - Cardiology"
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // Calculate length difference penalty
    const lengthDiff = Math.abs(norm1.length - norm2.length) / Math.max(norm1.length, norm2.length);
    return Math.max(0.7, 0.8 - lengthDiff); // Score between 0.7 and 0.8
  }
  
  // Calculate word overlap with synonym consideration
  const words1 = new Set(norm1.split(' ').filter(Boolean));
  const words2 = new Set(norm2.split(' ').filter(Boolean));

  // Add synonym words to the sets
  if (specialties1.length > 0) {
    specialties1.forEach(specialty => {
      [...specialty.synonyms.predefined, ...specialty.synonyms.custom].forEach(syn => {
        normalizeSpecialtyName(syn).split(' ').filter(Boolean).forEach(word => words1.add(word));
      });
    });
  }
  if (specialties2.length > 0) {
    specialties2.forEach(specialty => {
      [...specialty.synonyms.predefined, ...specialty.synonyms.custom].forEach(syn => {
        normalizeSpecialtyName(syn).split(' ').filter(Boolean).forEach(word => words2.add(word));
      });
    });
  }

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  // Add position penalty for words that appear in different orders
  const positionPenalty = 0.1; // 10% penalty for different word positions
  const arr1 = Array.from(words1);
  const arr2 = Array.from(words2);
  let outOfOrderCount = 0;
  
  for (let i = 0; i < Math.min(arr1.length, arr2.length); i++) {
    if (arr1[i] !== arr2[i] && words2.has(arr1[i])) {
      outOfOrderCount++;
    }
  }
  
  // Calculate base similarity with word overlap
  let similarity = (intersection.size / union.size) * (1 - (outOfOrderCount * positionPenalty));
  
  // Cap similarity at 0.7 for word overlap matches
  similarity = Math.min(0.7, similarity);
  
  console.log(`Similarity between "${norm1}" and "${norm2}":`, similarity, 
              'Intersection:', Array.from(intersection), 
              'Union:', Array.from(union));
  
  return similarity;
};

// Find matching specialties from other surveys
const findMatchingSpecialties = (
  specialty: string,
  fromVendor: SurveyVendor,
  toVendor: SurveyVendor,
  availableSpecialties: SpecialtyMapping[]
): { matches: string[]; confidence: number } => {
  const normalizedSpecialty = normalizeSpecialtyName(specialty);
  console.log('Normalized source specialty:', normalizedSpecialty);
  
  // Get all specialties from the target vendor
  const targetVendorSpecialties = availableSpecialties.filter(s => 
    s.vendor === toVendor
  );
  console.log('Target vendor specialties:', targetVendorSpecialties);
  
  // Find matches with confidence scores
  const matches = targetVendorSpecialties.map(targetSpecialty => {
    const normalizedTarget = normalizeSpecialtyName(targetSpecialty.specialty);
    const confidence = calculateSimilarity(specialty, targetSpecialty.specialty);
    console.log(`Comparing "${normalizedSpecialty}" with "${normalizedTarget}" - confidence: ${confidence}`);
    return {
      specialty: targetSpecialty.specialty,
      confidence
    };
  })
  .filter(match => match.confidence > 0.5) // Only keep matches above 50% confidence
  .sort((a, b) => b.confidence - a.confidence);

  console.log('Final matches:', matches);

  if (matches.length > 0) {
    return {
      matches: matches.map(m => m.specialty),
      confidence: matches[0].confidence
    };
  }

  return { matches: [], confidence: 0 };
};

// Get all known specialties for a vendor from available specialties
export const getKnownSpecialties = (
  vendor: SurveyVendor,
  availableSpecialties: SpecialtyMapping[]
): string[] => {
  return Array.from(new Set(
    availableSpecialties
      .filter(s => s.vendor === vendor)
      .map(s => s.specialty)
  ));
};

export {
  findMatchingSpecialties,
  normalizeSpecialtyName
}; 
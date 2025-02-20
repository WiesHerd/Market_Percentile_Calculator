// Types for survey-specific specialty mapping
type SurveyVendor = 'MGMA' | 'GALLAGHER' | 'SULLIVANCOTTER';

interface SpecialtyMapping {
  specialty: string;
  vendor: SurveyVendor;
}

// Enhanced normalization for specialty names
const normalizeSpecialtyName = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[\/\-&,()]/g, ' ')  // Replace special chars with space
    .replace(/\b(and)\b/g, '')    // Remove common conjunctions
    .replace(/\s+/g, ' ')         // Normalize spaces
    .trim();
};

// Calculate similarity score between two specialty names
const calculateSimilarity = (name1: string, name2: string): number => {
  const norm1 = normalizeSpecialtyName(name1);
  const norm2 = normalizeSpecialtyName(name2);
  
  // Exact match after normalization
  if (norm1 === norm2) return 1.0;
  
  // One is contained within the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  // Calculate word overlap
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  const similarity = intersection.size / union.size;
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
  
  // Find matches
  const matches = targetVendorSpecialties.map(targetSpecialty => {
    const normalizedTarget = normalizeSpecialtyName(targetSpecialty.specialty);
    const confidence = calculateSimilarity(specialty, targetSpecialty.specialty);
    console.log(`Comparing "${normalizedSpecialty}" with "${normalizedTarget}" - confidence: ${confidence}`);
    return {
      specialty: targetSpecialty.specialty,
      confidence
    };
  })
  .filter(match => match.confidence > 0.5)
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
const getKnownSpecialties = (
  vendor: SurveyVendor,
  availableSpecialties: SpecialtyMapping[]
): string[] => {
  return Array.from(new Set(
    availableSpecialties
      .filter(s => s.vendor === vendor)
      .map(s => s.specialty)
  ));
};

export type { SurveyVendor, SpecialtyMapping };
export {
  findMatchingSpecialties,
  getKnownSpecialties,
  normalizeSpecialtyName
}; 
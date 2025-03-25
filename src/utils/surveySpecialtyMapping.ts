import { specialtyManager } from './specialtyManager';

// Common words to ignore in specialty comparisons
const COMMON_WORDS = new Set([
  'surgery',
  'surgical',
  'medicine',
  'medical',
  'care',
  'specialist',
  'specialties',
  'specialty',
  'and',
  'the',
  'of',
  'in'
]);

// Types for survey-specific specialty mapping
export type SurveyVendor = 'MGMA' | 'GALLAGHER' | 'SULLIVANCOTTER';

export interface SpecialtyMapping {
  specialty: string;
  vendor: SurveyVendor;
}

// Normalize specialty name
const normalizeSpecialtyName = (name: string): string => name.toLowerCase().trim();

// Calculate similarity score between two specialty names
export const calculateSimilarity = (name1: string, name2: string): number => {
  const norm1 = normalizeSpecialtyName(name1);
  const norm2 = normalizeSpecialtyName(name2);
  
  console.log(`Calculating similarity between "${norm1}" and "${norm2}"`);
  
  // Exact match after normalization
  if (norm1 === norm2) {
    console.log('Exact match after normalization');
    return 1.0;
  }

  // Get specialties from manager
  const specialties1 = specialtyManager.searchSpecialties(name1);
  const specialties2 = specialtyManager.searchSpecialties(name2);

  // If specialties are found in the manager
  if (specialties1.length > 0 && specialties2.length > 0) {
    // For each specialty found for name1, check against each specialty found for name2
    for (const specialty1 of specialties1) {
      for (const specialty2 of specialties2) {
        // Check if they're the same specialty
        if (specialty1.id === specialty2.id) {
          console.log('Same specialty ID match');
          return 0.95;
        }

        // Get all synonyms including predefined and custom
        const synonyms1 = [
          specialty1.name,
          ...specialty1.synonyms.predefined,
          ...specialty1.synonyms.custom
        ].map(normalizeSpecialtyName);

        const synonyms2 = [
          specialty2.name,
          ...specialty2.synonyms.predefined,
          ...specialty2.synonyms.custom
        ].map(normalizeSpecialtyName);

        console.log('Synonyms for specialty1:', synonyms1);
        console.log('Synonyms for specialty2:', synonyms2);

        // Check if either specialty name is in the other's synonym list
        if (synonyms1.includes(norm2) || synonyms2.includes(norm1)) {
          console.log('Direct synonym match found');
          return 0.95;
        }

        // Check for shared synonyms
        const sharedSynonyms = synonyms1.filter(s1 => synonyms2.includes(s1));
        if (sharedSynonyms.length > 0) {
          console.log('Shared synonyms found:', sharedSynonyms);
          return 0.9;
        }

        // Check if they're in the same category
        if (specialty1.category && specialty2.category && specialty1.category === specialty2.category) {
          console.log('Same category match');
          return 0.85;
        }
      }
    }
  }
  
  // Split into words and normalize
  const words1 = norm1.split(/[\s\/\-]+/).filter(Boolean).map(w => w.toLowerCase());
  const words2 = norm2.split(/[\s\/\-]+/).filter(Boolean).map(w => w.toLowerCase());
  
  // Create sets of significant words (excluding common words)
  const significantWords1 = new Set(words1.filter(w => !COMMON_WORDS.has(w)));
  const significantWords2 = new Set(words2.filter(w => !COMMON_WORDS.has(w)));
  
  // Check for critical care specific matches
  if ((words1.includes('critical') && words1.includes('care')) ||
      (words2.includes('critical') && words2.includes('care'))) {
    // If both are critical care related
    if ((words1.includes('critical') && words1.includes('care')) &&
        (words2.includes('critical') && words2.includes('care'))) {
      // Check for intensivist variations
      const hasIntensivistVariation = 
        (words1.includes('intensivist') || words1.includes('intensive')) ||
        (words2.includes('intensivist') || words2.includes('intensive'));
      
      if (hasIntensivistVariation) {
        console.log('Critical Care with Intensivist variation match');
        return 0.9;
      }
      
      console.log('Critical Care base match');
      return 0.85;
    }
  }
  
  // Calculate word overlap for remaining cases
  const intersection = new Set([...significantWords1].filter(x => significantWords2.has(x)));
  const union = new Set([...significantWords1, ...significantWords2]);
  
  const similarity = intersection.size / union.size;
  console.log('Word overlap similarity:', similarity);
  
  // Boost similarity for partial matches
  if (similarity > 0.5) {
    const boostedSimilarity = Math.min(1, similarity + 0.2);
    console.log('Boosted similarity:', boostedSimilarity);
    return boostedSimilarity;
  }
  
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
  console.log(`Finding matches for "${specialty}" (${fromVendor}) -> ${toVendor}`);
  console.log('Normalized source specialty:', normalizedSpecialty);
  
  // Get all specialties from the target vendor
  const targetVendorSpecialties = availableSpecialties.filter(s => 
    s.vendor === toVendor
  );
  console.log(`Found ${targetVendorSpecialties.length} specialties for ${toVendor}`);
  
  // Get source specialty synonyms
  const sourceSpecialtyObj = specialtyManager.searchSpecialties(specialty)[0];
  const sourceSynonyms = sourceSpecialtyObj 
    ? [
        sourceSpecialtyObj.name,
        ...sourceSpecialtyObj.synonyms.predefined,
        ...sourceSpecialtyObj.synonyms.custom
      ].map(normalizeSpecialtyName)
    : [normalizedSpecialty];
  
  console.log('Source specialty synonyms:', sourceSynonyms);
  
  // Find matches with confidence scores
  const matches = targetVendorSpecialties.map(targetSpecialty => {
    const normalizedTarget = normalizeSpecialtyName(targetSpecialty.specialty);
    console.log(`\nComparing with "${targetSpecialty.specialty}"`);
    
    // Get target specialty synonyms
    const targetSpecialtyObj = specialtyManager.searchSpecialties(targetSpecialty.specialty)[0];
    const targetSynonyms = targetSpecialtyObj
      ? [
          targetSpecialtyObj.name,
          ...targetSpecialtyObj.synonyms.predefined,
          ...targetSpecialtyObj.synonyms.custom
        ].map(normalizeSpecialtyName)
      : [normalizedTarget];
    
    console.log('Target specialty synonyms:', targetSynonyms);
    
    // Check for direct synonym matches first
    const hasDirectSynonymMatch = sourceSynonyms.some(s1 => 
      targetSynonyms.some(s2 => normalizeSpecialtyName(s1) === normalizeSpecialtyName(s2))
    );
    
    if (hasDirectSynonymMatch) {
      console.log('Found direct synonym match!');
      return {
        specialty: targetSpecialty.specialty,
        confidence: 1.0,
        reason: 'Direct synonym match'
      };
    }
    
    // If no direct synonym match, calculate similarity
    const confidence = calculateSimilarity(specialty, targetSpecialty.specialty);
    console.log(`Similarity score: ${confidence}`);
    
    // Special handling for Critical Care specialties
    const isCriticalCare = (name: string) => {
      const norm = normalizeSpecialtyName(name);
      return norm.includes('critical') && norm.includes('care');
    };

    if (isCriticalCare(specialty) && isCriticalCare(targetSpecialty.specialty)) {
      console.log('Both are Critical Care specialties - boosting confidence');
      return {
        specialty: targetSpecialty.specialty,
        confidence: Math.max(confidence, 0.85),
        reason: 'Critical Care specialty match'
      };
    }
    
    return {
      specialty: targetSpecialty.specialty,
      confidence,
      reason: confidence > 0.8 ? 'High similarity' : 'Partial match'
    };
  })
  .filter(match => match.confidence > 0.4) // Lower threshold to catch more potential matches
  .sort((a, b) => b.confidence - a.confidence);

  console.log('\nFinal matches:', matches);

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
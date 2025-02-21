// Types for specialty mapping system
interface StandardSpecialty {
  name: string;
  variations: string[];
  category: SpecialtyCategory;
  subcategory?: string;
  keywords: string[];
  relatedSpecialties?: string[];
  parentSpecialty?: string;  // For subspecialties
  isSubspecialty?: boolean;
  requiresQualifier?: boolean;  // For specialties like "General" that need context
}

type SpecialtyCategory = 
  | 'Medical'
  | 'Surgical'
  | 'Hospital-Based'
  | 'Primary Care'
  | 'Pediatric'
  | 'Other';

// Core mapping of standard specialties
const standardSpecialties: Record<string, StandardSpecialty> = {
  // Primary Care Specialties
  "Family Medicine": {
    name: "Family Medicine",
    variations: [
      "Family Practice",
      "Family Physician",
      "General Family Medicine",
      "Family Medicine (General)"
    ],
    category: "Primary Care",
    keywords: ["family", "medicine", "practice"],
    relatedSpecialties: ["Internal Medicine", "Pediatrics"],
    requiresQualifier: false
  },

  "Internal Medicine": {
    name: "Internal Medicine",
    variations: [
      "General Internal Medicine",
      "Adult Medicine",
      "Internist",
      "Internal Medicine (General)"
    ],
    category: "Primary Care",
    keywords: ["internal", "medicine"],
    relatedSpecialties: ["Family Medicine", "Hospital Medicine"],
    requiresQualifier: false
  },

  // Medical Specialties
  "Allergy and Immunology": {
    name: "Allergy and Immunology",
    variations: [
      "Allergy/Immunology",
      "Allergy & Immunology",
      "Allergist/Immunologist",
      "Allergy and Clinical Immunology"
    ],
    category: "Medical",
    keywords: ["allergy", "immunology"],
    relatedSpecialties: ["Pediatric Allergy/Immunology"],
    requiresQualifier: false
  },

  "Cardiology": {
    name: "Cardiology",
    variations: [
      "Cardiovascular Disease",
      "Cardiovascular Medicine",
      "Adult Cardiology",
      "Clinical Cardiology"
    ],
    category: "Medical",
    keywords: ["cardiology", "cardiovascular", "heart"],
    relatedSpecialties: [
      "Interventional Cardiology",
      "Electrophysiology",
      "Advanced Heart Failure"
    ],
    requiresQualifier: false
  },

  // Surgical Specialties with Clear Hierarchy
  "Surgery": {
    name: "Surgery",
    variations: [],
    category: "Surgical",
    keywords: ["surgery", "surgical"],
    requiresQualifier: true  // Requires more specific type
  },

  "General Surgery": {
    name: "General Surgery",
    variations: [
      "Surgery (General)",
      "General Surgical Services",
      "Surgery - General",
      "General Surgeon"
    ],
    category: "Surgical",
    keywords: ["general", "surgery"],
    parentSpecialty: "Surgery",
    relatedSpecialties: [
      "Trauma Surgery",
      "Surgical Critical Care",
      "Minimally Invasive Surgery"
    ],
    requiresQualifier: false
  },

  "Cardiothoracic Surgery": {
    name: "Cardiothoracic Surgery",
    variations: [
      "Surgery (Cardiothoracic)",
      "Surgery (Cardiothoracic/Cardiovascular)",
      "CT Surgery",
      "Thoracic Surgery",
      "Cardiovascular Surgery"
    ],
    category: "Surgical",
    keywords: ["cardiothoracic", "cardiovascular", "thoracic", "surgery"],
    parentSpecialty: "Surgery",
    relatedSpecialties: ["Adult Cardiac Surgery", "Congenital Cardiac Surgery"],
    requiresQualifier: false
  }
};

// Specialty synonym mappings
export const specialtySynonyms: Record<string, string[]> = {
  'otolaryngology': ['otorhinolaryngology', 'ent', 'ear nose and throat'],
  'obstetrics and gynecology': ['ob/gyn', 'obgyn', 'obstetrics gynecology'],
  'physical medicine and rehabilitation': ['physiatry', 'pm&r', 'pmr'],
  'emergency medicine': ['em', 'emergency room'],
  // Add more specialty synonyms as needed
};

// Comprehensive normalize function that handles all specialty name variations
export const normalizeSpecialtyName = (specialty: string): string => {
  return specialty
    .toLowerCase()
    .replace(/[\(\)]/g, '')        // Remove parentheses
    .replace(/[\/\-&,]/g, ' ')     // Replace separators with spaces
    .replace(/[^a-z0-9\s]/g, '')   // Remove special characters
    .replace(/\s+/g, ' ')          // Normalize spaces
    .trim();
};

// Check if two specialties are synonyms
export const areSpecialtiesSynonyms = (specialty1: string, specialty2: string): boolean => {
  const norm1 = normalizeSpecialtyName(specialty1);
  const norm2 = normalizeSpecialtyName(specialty2);

  // Direct match
  if (norm1 === norm2) return true;

  // Check synonyms
  for (const [base, synonyms] of Object.entries(specialtySynonyms)) {
    const isSpecialty1Match = base === norm1 || synonyms.includes(norm1);
    const isSpecialty2Match = base === norm2 || synonyms.includes(norm2);
    
    if (isSpecialty1Match && isSpecialty2Match) return true;
  }

  return false;
};

// Get all synonyms for a specialty
export const getSpecialtySynonyms = (specialty: string): string[] => {
  const normalized = normalizeSpecialtyName(specialty);
  
  // Check if it's a base specialty
  if (specialtySynonyms[normalized]) {
    return [normalized, ...specialtySynonyms[normalized]];
  }
  
  // Check if it's a synonym
  for (const [base, synonyms] of Object.entries(specialtySynonyms)) {
    if (synonyms.includes(normalized)) {
      return [base, ...synonyms];
    }
  }
  
  return [normalized];
};

// Helper to check if two specialty names are variations of each other
const areSpecialtyVariations = (name1: string, name2: string): boolean => {
  const normalized1 = normalizeSpecialtyName(name1);
  const normalized2 = normalizeSpecialtyName(name2);

  // Check direct match after normalization
  if (normalized1 === normalized2) return true;

  // Check against standard specialties
  for (const standard of Object.values(standardSpecialties)) {
    const isName1Match = standard.variations.some(v => 
      normalizeSpecialtyName(v) === normalized1
    ) || normalizeSpecialtyName(standard.name) === normalized1;

    const isName2Match = standard.variations.some(v => 
      normalizeSpecialtyName(v) === normalized2
    ) || normalizeSpecialtyName(standard.name) === normalized2;

    if (isName1Match && isName2Match) return true;
  }

  return false;
};

// Find the standard specialty for a given specialty name
const findStandardSpecialty = (name: string): StandardSpecialty | null => {
  const normalized = normalizeSpecialtyName(name);

  for (const standard of Object.values(standardSpecialties)) {
    if (
      normalizeSpecialtyName(standard.name) === normalized ||
      standard.variations.some(v => normalizeSpecialtyName(v) === normalized)
    ) {
      return standard;
    }
  }

  return null;
};

// Calculate similarity score between two specialties with hierarchy awareness
const calculateSpecialtySimilarity = (name1: string, name2: string): number => {
  const standard1 = findStandardSpecialty(name1);
  const standard2 = findStandardSpecialty(name2);

  if (!standard1 || !standard2) return 0;

  // Exact match or known variation
  if (standard1.name === standard2.name) return 1;

  // Parent-child relationship
  if (standard1.parentSpecialty === standard2.name || 
      standard2.parentSpecialty === standard1.name) {
    return 0.9;
  }

  // Related specialties
  if (standard1.relatedSpecialties?.includes(standard2.name) ||
      standard2.relatedSpecialties?.includes(standard1.name)) {
    return 0.8;
  }

  // Same immediate parent
  if (standard1.parentSpecialty && 
      standard1.parentSpecialty === standard2.parentSpecialty) {
    return 0.7;
  }

  // Same category
  if (standard1.category === standard2.category) {
    return 0.3;
  }

  return 0;
};

// Fix TypeScript export issues
export type { StandardSpecialty, SpecialtyCategory };
export {
  standardSpecialties,
  areSpecialtyVariations,
  findStandardSpecialty,
  calculateSpecialtySimilarity
}; 
// Types for specialty mapping system
export interface StandardSpecialty {
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

export type SpecialtyCategory = 
  | 'Medical'
  | 'Surgical'
  | 'Hospital-Based'
  | 'Primary Care'
  | 'Pediatric'
  | 'Other';

// Core mapping of standard specialties
export const standardSpecialties: Record<string, StandardSpecialty> = {
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
  "Hematology and Oncology": {
    name: "Hematology and Oncology",
    variations: [
      "Hematology/Oncology",
      "Hematology & Oncology",
      "Hematology-Oncology",
      "Medical Oncology and Hematology",
      "Hematology-Medical Oncology"
    ],
    category: "Medical",
    keywords: ["hematology", "oncology", "cancer", "blood"],
    relatedSpecialties: [
      "Medical Oncology",
      "Hematology",
      "Pediatric Hematology/Oncology"
    ],
    requiresQualifier: false
  },

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

// Define specialty mapping types
interface SpecialtyDefinition {
  name: string;
  synonyms: string[];
  relatedSpecialties?: string[];
  category?: SpecialtyCategory;
  parentSpecialty?: string;
}

// Enhanced normalization for specialty names
const normalizeSpecialtyName = (name: string): string => {
  return name
    .toLowerCase()
    // Replace special chars and conjunctions with space
    .replace(/[\/\-&,()]/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\s+/g, ' ')
    // Remove common words that don't affect meaning
    .replace(/\b(the|of|in|with|without)\b/g, '')
    .trim();
};

// Define specialty mappings with enhanced synonyms
const specialtyDefinitions: Record<string, SpecialtyDefinition> = {
  'Allergy and Immunology': {
    name: 'Allergy and Immunology',
    synonyms: [
      'Allergy/Immunology',
      'Allergy & Immunology',
      'Allergist/Immunologist',
      'Clinical Immunology',
      'Allergy Immunology',
      'Allergist and Immunologist',
      'Allergy and Clinical Immunology'
    ],
    relatedSpecialties: [
      'Pediatric Allergy',
      'Clinical Immunology'
    ],
    category: 'Medical'
  },
  'Cardiology': {
    name: 'Cardiology',
    synonyms: [
      'Cardiovascular Disease',
      'Cardiovascular Medicine',
      'Heart Disease',
      'Clinical Cardiology'
    ],
    relatedSpecialties: [
      'Interventional Cardiology',
      'Pediatric Cardiology',
      'Electrophysiology'
    ],
    category: 'Medical'
  }
};

// Get synonyms for a specialty
const getSpecialtySynonyms = (specialty: string): string[] => {
  const normalized = normalizeSpecialtyName(specialty);
  
  // Find matching specialty definition
  const definition = Object.values(specialtyDefinitions).find(def => 
    normalizeSpecialtyName(def.name) === normalized ||
    def.synonyms.some(syn => normalizeSpecialtyName(syn) === normalized)
  );
  
  return definition ? [definition.name, ...definition.synonyms] : [specialty];
};

// Enhanced specialty variation check
const areSpecialtyVariations = (specialty1: string, specialty2: string): boolean => {
  const norm1 = normalizeSpecialtyName(specialty1);
  const norm2 = normalizeSpecialtyName(specialty2);
  
  // Check direct match after normalization
  if (norm1 === norm2) return true;
  
  // Check against specialty definitions
  for (const def of Object.values(specialtyDefinitions)) {
    const allVariations = [def.name, ...def.synonyms].map(normalizeSpecialtyName);
    
    // Check if both specialties map to the same normalized form
    const matches1 = allVariations.some(v => v === norm1);
    const matches2 = allVariations.some(v => v === norm2);
    
    if (matches1 && matches2) return true;
  }
  
  // Additional fuzzy matching for edge cases
  const words1 = new Set(norm1.split(' '));
  const words2 = new Set(norm2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  // If all words match (regardless of order), consider it a match
  if (intersection.size === union.size) return true;
  
  return false;
};

// Check if two specialties are synonyms
const areSpecialtiesSynonyms = (specialty1: string, specialty2: string): boolean => {
  return areSpecialtyVariations(specialty1, specialty2);
};

// Find standard specialty definition
const findStandardSpecialty = (specialty: string): SpecialtyDefinition | null => {
  const normalized = normalizeSpecialtyName(specialty);
  
  return Object.values(specialtyDefinitions).find(def => 
    normalizeSpecialtyName(def.name) === normalized ||
    def.synonyms.some(syn => normalizeSpecialtyName(syn) === normalized)
  ) || null;
};

// Calculate similarity score between two specialties with hierarchy awareness
const calculateSpecialtySimilarity = (name1: string, name2: string): number => {
  const standard1 = findStandardSpecialty(name1);
  const standard2 = findStandardSpecialty(name2);

  if (!standard1 || !standard2) return 0;

  // Exact match or known variation
  if (standard1.name === standard2.name) return 1;

  // Related specialties
  if (standard1.relatedSpecialties?.includes(standard2.name) ||
      standard2.relatedSpecialties?.includes(standard1.name)) {
    return 0.8;
  }

  // Same category
  if (standard1.category === standard2.category) {
    return 0.3;
  }

  return 0;
};

// Export types and functions
export type { StandardSpecialty, SpecialtyCategory, SpecialtyDefinition };
export {
  normalizeSpecialtyName,
  getSpecialtySynonyms,
  areSpecialtyVariations,
  areSpecialtiesSynonyms,
  findStandardSpecialty,
  calculateSpecialtySimilarity,
  specialtyDefinitions
}; 
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
      "Allergy/Immunology"
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

// Define specialty mappings
const specialtyDefinitions: Record<string, SpecialtyDefinition> = {
  'Dermatology': {
    name: 'Dermatology',
    synonyms: [
      'Dermatologist',
      'Dermatological Medicine',
      'Skin Care',
      'Clinical Dermatology'
    ],
    relatedSpecialties: [
      'Pediatric Dermatology',
      'Dermatologic Surgery',
      'Mohs Surgery'
    ],
    category: 'Medical'
  },
  'Allergy and Immunology': {
    name: 'Allergy and Immunology',
    synonyms: [
      'Allergy/Immunology'
    ],
    relatedSpecialties: [
      'Pediatric Allergy'
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

// Normalize specialty names for comparison
const normalizeSpecialtyName = (name: string): string => {
  return name.toLowerCase()
    .replace(/[\/\-&,()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

// Check if two specialties are variations of each other
const areSpecialtyVariations = (specialty1: string, specialty2: string): boolean => {
  const norm1 = normalizeSpecialtyName(specialty1);
  const norm2 = normalizeSpecialtyName(specialty2);
  
  // Check direct match
  if (norm1 === norm2) return true;
  
  // Check against specialty definitions
  for (const def of Object.values(specialtyDefinitions)) {
    const allVariations = [def.name, ...def.synonyms].map(normalizeSpecialtyName);
    if (allVariations.includes(norm1) && allVariations.includes(norm2)) {
      return true;
    }
  }
  
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
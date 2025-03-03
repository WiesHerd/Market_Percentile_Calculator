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
  },

  "Orthopedics": {
    name: "Orthopedics",
    variations: [
      "Orthopedic Surgery",
      "Surgery (Orthopedics)",
      "Surgery (Orthopedic)",
      "Orthopedic",
      "Orthopaedics",
      "Orthopaedic Surgery",
      "Surgery (Orthopaedics)",
      "Surgery (Orthopaedic)",
      "Orthopaedic"
    ],
    category: "Surgical",
    keywords: ["orthopedic", "orthopaedic", "surgery", "bone", "joint"],
    parentSpecialty: "Surgery",
    relatedSpecialties: [
      "Sports Medicine",
      "Joint Replacement",
      "Spine Surgery",
      "Hand Surgery"
    ],
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

// Normalize specialty name for comparison
const normalizeSpecialtyName = (name: string): string => {
  return name
    .toLowerCase()
    // Handle parenthetical variations - convert both "X (Y)" and "Y (X)" patterns
    .replace(/\s*\((.*?)\)\s*/g, ' $1 ') // Convert "X (Y)" to "X Y"
    .replace(/^(.*?)\s*\((.*?)\)$/, '$2 $1') // Also try "Y X" for "Y (X)" pattern
    // Handle common word order variations
    .replace(/^surgery[,\s]+(.*)/i, '$1 surgery') // Move "Surgery" to end if it's at start
    .replace(/^(.*?)[,\s]+surgery$/i, 'surgery $1') // Move "Surgery" to start if it's at end
    // Handle spelling variations
    .replace(/orthopedic/g, 'orthopedic') // Standardize orthopedic spelling
    .replace(/orthopaedic/g, 'orthopedic') // Convert British spelling
    // Clean up the result
    .replace(/[,\-\/]/g, ' ') // Replace commas, hyphens, and slashes with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Remove leading/trailing spaces
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
  },
  'Orthopedics': {
    name: 'Orthopedics',
    synonyms: [
      'Bone & Joint',
      'Orthopedist',
      'Orthopaedics',
      'Musculoskeletal Medicine'
    ],
    relatedSpecialties: [
      'Orthopedic Surgery',
      'Sports Medicine',
      'Joint Replacement',
      'Spine Surgery'
    ],
    category: 'Medical'
  },
  'Orthopedic Surgery': {
    name: 'Orthopedic Surgery',
    synonyms: [
      'Surgery (Orthopedics)',
      'Surgery (Orthopedic)',
      'Orthopaedic Surgery',
      'Surgery (Orthopaedics)',
      'Surgery (Orthopaedic)'
    ],
    relatedSpecialties: [
      'Orthopedics',
      'Sports Medicine',
      'Joint Replacement',
      'Spine Surgery'
    ],
    category: 'Surgical'
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
  
  // Create variations of both specialties
  const createVariations = (name: string): string[] => {
    const words = name.split(' ');
    const variations = [
      name,
      // Try different word orders
      words.reverse().join(' '),
      // Handle "Surgery" variations
      name.replace(/^surgery\s+/i, '') + ' surgery',
      'surgery ' + name.replace(/\s+surgery$/i, ''),
      // Handle parenthetical variations
      `${words[0]} (${words.slice(1).join(' ')})`,
      `${words.slice(1).join(' ')} (${words[0]})`,
      // Handle common specialty patterns
      name.replace(/^(.*?)\s+surgery$/i, 'surgery ($1)'),
      name.replace(/^surgery\s+(.*?)$/i, '$1 (surgery)')
    ];
    return [...new Set(variations.map(v => normalizeSpecialtyName(v)))];
  };

  const variations1 = createVariations(norm1);
  const variations2 = createVariations(norm2);

  // Check if any variations match
  return variations1.some(v1 => variations2.includes(v1));
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
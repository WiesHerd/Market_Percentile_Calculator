import { specialtyDefinitions, SpecialtyDefinition } from './specialtyMapping';

const STORAGE_KEY = 'specialty-synonyms';

// Add predefined specialty synonyms
const PREDEFINED_SYNONYMS: Record<string, string[]> = {
  'Cardiothoracic Surgery': [
    'Cardiovascular Surgery',
    'Surgery (Cardiothoracic/Cardiovascular)',
    'Surgery (Cardiothoracic)',
    'Cardiothoracic/Cardiovascular Surgery',
    'Cardiovascular/Thoracic Surgery',
    'CT Surgery',
    'Heart Surgery',
    'Thoracic Surgery',
    'Cardiac Surgery',
    'Surgery - Cardiothoracic',
    'Surgery - Cardiovascular'
  ],
  'otolaryngology': ['otorhinolaryngology', 'ent', 'ear nose and throat'],
  'obstetrics and gynecology': ['ob/gyn', 'obgyn', 'obstetrics gynecology'],
  'physical medicine and rehabilitation': ['physiatry', 'pm&r', 'pmr'],
  'emergency medicine': ['em', 'emergency room']
};

// Check if running in browser environment
const isClient = typeof window !== 'undefined';

// Load custom synonyms from localStorage with safety check
export function loadCustomSynonyms(): Record<string, string[]> {
  if (!isClient) {
    console.log('Running on server, returning default synonyms');
    return PREDEFINED_SYNONYMS;
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const customSynonyms = saved ? JSON.parse(saved) : {};
    // Merge predefined and custom synonyms
    return {
      ...PREDEFINED_SYNONYMS,
      ...customSynonyms
    };
  } catch (error) {
    console.error('Error loading custom synonyms:', error);
    return PREDEFINED_SYNONYMS;
  }
}

// Save custom synonyms to localStorage with safety check
export function saveCustomSynonyms(synonyms: Record<string, string[]>): void {
  if (!isClient) {
    console.log('Running on server, skipping synonym save');
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synonyms));
  } catch (error) {
    console.error('Error saving custom synonyms:', error);
  }
}

// Get all synonyms for a specialty (both predefined and custom)
export function getAllSynonyms(specialty: string): string[] {
  const predefined = PREDEFINED_SYNONYMS[specialty] || [];
  const custom = loadCustomSynonyms()[specialty] || [];
  return Array.from(new Set([...predefined, ...custom]));
}

// Update synonyms for a specialty
export function updateSpecialtySynonyms(specialty: string, synonyms: string[]): void {
  const customSynonyms = loadCustomSynonyms();
  customSynonyms[specialty] = synonyms;
  saveCustomSynonyms(customSynonyms);
}

// Get all specialties with their synonyms
export function getAllSpecialtiesWithSynonyms(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  const customSynonyms = loadCustomSynonyms();

  // Add predefined specialties and their synonyms
  Object.entries(specialtyDefinitions).forEach(([specialty, definition]) => {
    result[specialty] = [...(definition.synonyms || [])];
  });

  // Add custom synonyms
  Object.entries(customSynonyms).forEach(([specialty, synonyms]) => {
    if (result[specialty]) {
      result[specialty] = Array.from(new Set([...result[specialty], ...synonyms]));
    } else {
      result[specialty] = synonyms;
    }
  });

  return result;
}

// Remove a specialty and its synonyms
export function removeSpecialtySynonyms(specialty: string): void {
  const customSynonyms = loadCustomSynonyms();
  delete customSynonyms[specialty];
  saveCustomSynonyms(customSynonyms);
}

// Add a new specialty with synonyms
export function addSpecialtyWithSynonyms(specialty: string, synonyms: string[]): void {
  const customSynonyms = loadCustomSynonyms();
  customSynonyms[specialty] = synonyms;
  saveCustomSynonyms(customSynonyms);
}

// Check if a specialty has custom synonyms
export function hasCustomSynonyms(specialty: string): boolean {
  const customSynonyms = loadCustomSynonyms();
  return !!customSynonyms[specialty];
}

// Get only custom synonyms for a specialty
export function getCustomSynonyms(specialty: string): string[] {
  return loadCustomSynonyms()[specialty] || [];
}

// Get only predefined synonyms for a specialty
export function getPredefinedSynonyms(specialty: string): string[] {
  return PREDEFINED_SYNONYMS[specialty] || [];
} 
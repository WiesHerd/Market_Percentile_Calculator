import { specialtyDefinitions, SpecialtyDefinition } from './specialtyMapping';

const STORAGE_KEY = 'specialty-synonyms';

// Load custom synonyms from localStorage
export function loadCustomSynonyms(): Record<string, string[]> {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Error loading custom synonyms:', error);
    return {};
  }
}

// Save custom synonyms to localStorage
export function saveCustomSynonyms(synonyms: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(synonyms));
  } catch (error) {
    console.error('Error saving custom synonyms:', error);
  }
}

// Get all synonyms for a specialty (both predefined and custom)
export function getAllSynonyms(specialty: string): string[] {
  const predefined = specialtyDefinitions[specialty]?.synonyms || [];
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
  return specialtyDefinitions[specialty]?.synonyms || [];
} 
'use client';

import { 
  type SpecialtyDefinition,
  type StandardSpecialty,
  normalizeSpecialtyName,
  specialtyDefinitions,
  standardSpecialties,
  areSpecialtyVariations,
  calculateSpecialtySimilarity
} from '@/utils/specialtyMapping';
import { 
  loadCustomSynonyms, 
  saveCustomSynonyms, 
  getAllSynonyms as getUtilSynonyms 
} from '../utils/specialtySynonyms';

// Add these constants at the top of the file after imports
const COMMON_WORDS = new Set([
  'surgery',
  'surgical',
  'medicine',
  'medical',
  'care',
  'specialist',
  'specialties',
  'specialty'
]);

// Add specialty domain categories to prevent cross-domain matches
const SPECIALTY_DOMAINS = {
  CARDIAC: new Set([
    'cardiology',
    'cardiovascular',
    'cardiothoracic',
    'heart',
    'cardiac'
  ]),
  ORTHOPEDIC: new Set([
    'orthopedic',
    'orthopedics',
    'orthopaedic',
    'orthopaedics',
    'bone',
    'joint'
  ]),
  // Add more domains as needed
} as const;

function getSpecialtyDomain(specialty: string): string | null {
  const normalized = normalizeSpecialtyName(specialty);
  
  for (const [domain, keywords] of Object.entries(SPECIALTY_DOMAINS)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return domain;
      }
    }
  }
  return null;
}

export interface SpecialtyMapping {
  id: string;
  sourceSpecialty: string;
  targetSpecialty: string;
  confidence: number;
  reason: string;
  vendor?: string;
  synonymSource?: 'predefined' | 'custom' | 'learned';
}

export interface SynonymEntry {
  specialty: string;
  synonym: string;
  source: 'predefined' | 'custom' | 'learned';
  confidence: number;
  lastUsed?: Date;
  usageCount?: number;
}

const STORAGE_KEY = 'specialty-mapping-service';

export class SpecialtyMappingService {
  private synonyms: Map<string, string[]>;
  private mappings: Map<string, string>;
  private learnedPatterns: Map<string, string>;

  constructor() {
    this.synonyms = new Map();
    this.mappings = new Map();
    this.learnedPatterns = new Map();
    this.initialize();
  }

  private initialize(): void {
    try {
      console.log('Initializing SpecialtyMappingService...');
      
      // Load standard specialties and their variations
      console.log('Loading standard specialties:', standardSpecialties);
      Object.entries(standardSpecialties).forEach(([key, specialty]) => {
        console.log('Processing specialty:', key);
        this.addSynonyms(key, specialty.variations);
      });

      // Load specialty definitions and their synonyms
      console.log('Loading specialty definitions:', specialtyDefinitions);
      Object.entries(specialtyDefinitions).forEach(([key, definition]) => {
        console.log('Processing definition:', key);
        this.addSynonyms(key, [...definition.synonyms, ...definition.variations]);
      });

      // Load learned patterns from storage
      console.log('Loading learned patterns from storage...');
      const savedPatterns = getFromStorage<Record<string, string>>(STORAGE_KEY, {});
      this.learnedPatterns = new Map(Object.entries(savedPatterns));
      console.log('Loaded learned patterns:', this.learnedPatterns);

    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  private addSynonyms(specialty: string, synonyms: string[]): void {
    const normalized = normalizeSpecialtyName(specialty);
    const existingSynonyms = this.synonyms.get(normalized) || [];
    this.synonyms.set(normalized, [...new Set([...existingSynonyms, ...synonyms])]);
    
    // Add mappings for each synonym
    synonyms.forEach(synonym => {
      const normalizedSynonym = normalizeSpecialtyName(synonym);
      this.mappings.set(normalizedSynonym, normalized);
    });
  }

  public findPotentialMatches(specialty: string): Array<{
    specialty: string;
    confidence: number;
    reason: string;
  }> {
    const normalized = normalizeSpecialtyName(specialty);
    const matches = new Map<string, { confidence: number; reason: string }>();

    // Check direct matches and variations first
    Object.entries(standardSpecialties).forEach(([key, value]) => {
      // Check the main specialty name
      const mainSimilarity = calculateSpecialtySimilarity(normalized, key);
      if (mainSimilarity > 0) {
        matches.set(key, {
          confidence: mainSimilarity,
          reason: mainSimilarity === 1 ? 'Exact match' : 'Similar specialty name'
        });
      }

      // Check all variations
      value.variations.forEach(variation => {
        const variationSimilarity = calculateSpecialtySimilarity(normalized, variation);
        if (variationSimilarity > 0) {
          matches.set(key, {
            confidence: variationSimilarity,
            reason: variationSimilarity === 1 ? 'Exact variation match' : 'Similar to known variation'
          });
        }
      });
    });

    // Check specialty definitions
    Object.entries(specialtyDefinitions).forEach(([key, definition]) => {
      // Check synonyms
      definition.synonyms.forEach(synonym => {
        const synonymSimilarity = calculateSpecialtySimilarity(normalized, synonym);
        if (synonymSimilarity > 0) {
          matches.set(key, {
            confidence: synonymSimilarity,
            reason: synonymSimilarity === 1 ? 'Exact synonym match' : 'Similar to known synonym'
          });
        }
      });

      // Check variations
      definition.variations.forEach(variation => {
        const variationSimilarity = calculateSpecialtySimilarity(normalized, variation);
        if (variationSimilarity > 0) {
          matches.set(key, {
            confidence: variationSimilarity,
            reason: variationSimilarity === 1 ? 'Exact variation match' : 'Similar to known variation'
          });
        }
      });

      // Check related specialties
      definition.relatedSpecialties.forEach(related => {
        const relatedSimilarity = calculateSpecialtySimilarity(normalized, related);
        if (relatedSimilarity > 0) {
          matches.set(related, {
            confidence: relatedSimilarity * 0.9, // Slightly lower confidence for related specialties
            reason: 'Related specialty'
          });
        }
      });
    });

    // Check domain matches
    const sourceDomain = getSpecialtyDomain(specialty);
    if (sourceDomain) {
      Object.entries(standardSpecialties).forEach(([key, value]) => {
        const targetDomain = getSpecialtyDomain(key);
        if (targetDomain === sourceDomain && !matches.has(key)) {
          matches.set(key, {
            confidence: 0.5,
            reason: `Same specialty domain (${sourceDomain})`
          });
        }
      });
    }

    // Check for vendor-specific variations
    Object.entries(specialtyDefinitions).forEach(([key, definition]) => {
      if (definition.surveyVendors?.includes('Gallagher') || 
          definition.surveyVendors?.includes('MGMA') || 
          definition.surveyVendors?.includes('SullivanCotter')) {
        const vendorSimilarity = calculateSpecialtySimilarity(normalized, key);
        if (vendorSimilarity > 0 && !matches.has(key)) {
          matches.set(key, {
            confidence: vendorSimilarity * 0.95, // High confidence for vendor-specific matches
            reason: 'Vendor-specific specialty match'
          });
        }
      }
    });

    // Convert matches map to array and sort by confidence
    return Array.from(matches.entries())
      .map(([specialty, { confidence, reason }]) => ({
        specialty,
        confidence,
        reason
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .filter(match => match.confidence >= 0.4); // Lower threshold to include more potential matches
  }

  public saveToStorage(): void {
    setToStorage(STORAGE_KEY, Object.fromEntries(this.learnedPatterns));
  }
}

// Export singleton instance
export const specialtyMappingService = new SpecialtyMappingService();

function isLocalStorageAvailable() {
  try {
    return typeof window !== 'undefined' && window.localStorage !== undefined;
  } catch (e) {
    return false;
  }
}

function getFromStorage<T>(key: string, defaultValue: T): T {
  try {
    if (!isLocalStorageAvailable()) return defaultValue;
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : defaultValue;
  } catch (error) {
    console.error('Error reading from storage:', error);
    return defaultValue;
  }
}

function setToStorage(key: string, value: unknown): void {
  try {
    if (!isLocalStorageAvailable()) return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to storage:', error);
  }
} 
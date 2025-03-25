'use client';

import { type Specialty } from '@/types/specialty';
import { specialtyManager } from '@/utils/specialtyManager';
import { normalizeSpecialtyName } from '@/utils/surveySpecialtyMapping';

// Add these constants at the top of the file after imports
const COMMON_WORDS = new Set([
  'surgery',
  'surgical',
  'medicine',
  'medical',
  'care',
  'specialist',
  'specialties',
  'specialty',
  'and'
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
  const normalized = specialty.toLowerCase().trim();
  
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

interface MatchResult {
  source: string;
  target: string;
  similarity: number;
}

export class SpecialtyMappingService {
  private learnedPatterns: Map<string, string>;
  private initialized: boolean;

  constructor() {
    this.learnedPatterns = new Map();
    this.initialized = false;
    this.initialize();

    // Listen for synonym changes
    if (typeof window !== 'undefined') {
      window.addEventListener('synonyms-updated', () => {
        console.log('Reinitializing SpecialtyMappingService due to synonym changes...');
        this.initialize();
      });
    }
  }

  private initialize(): void {
    if (this.initialized) {
      console.log('SpecialtyMappingService already initialized');
      return;
    }

    try {
      console.log('Initializing SpecialtyMappingService...');
      
      // Load learned patterns from storage
      console.log('Loading learned patterns from storage...');
      const savedPatterns = getFromStorage<Record<string, string>>(STORAGE_KEY, {});
      this.learnedPatterns = new Map(Object.entries(savedPatterns));
      console.log('Loaded learned patterns:', this.learnedPatterns);

      // Initialize predefined synonyms only once
      const hasInitialized = getFromStorage<boolean>('synonyms_initialized', false);
      if (!hasInitialized) {
        console.log('First time initialization - setting up predefined synonyms');
        specialtyManager.refreshPredefinedSynonyms();
        setToStorage('synonyms_initialized', true);
      }

      this.initialized = true;
      console.log('SpecialtyMappingService initialization complete');
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }

  public findPotentialMatches(specialty: string): Array<{
    specialty: string;
    confidence: number;
    reason: string;
  }> {
    if (!this.initialized) {
      console.log('Service not initialized, initializing now...');
      this.initialize();
    }

    console.log('Finding potential matches for:', specialty);
    const normalized = specialty.toLowerCase().trim();
    const matches = new Map<string, { confidence: number; reason: string }>();

    // Get all specialties from SpecialtyManager
    const allSpecialties: Specialty[] = specialtyManager.getAllSpecialties();
    console.log('Total specialties to check:', allSpecialties.length);

    // Get source specialty with all its synonyms
    const sourceSpecialty = allSpecialties.find(s => 
      normalizeSpecialtyName(s.name) === normalized ||
      s.synonyms.predefined.some(syn => normalizeSpecialtyName(syn) === normalized) ||
      s.synonyms.custom.some(syn => normalizeSpecialtyName(syn) === normalized)
    );
    
    console.log('Source specialty found:', sourceSpecialty?.name);
    
    const sourceSynonyms = sourceSpecialty 
      ? [
          sourceSpecialty.name,
          ...sourceSpecialty.synonyms.predefined,
          ...sourceSpecialty.synonyms.custom
        ].map(s => normalizeSpecialtyName(s))
      : [normalized];
    
    console.log('Source synonyms:', sourceSynonyms);

    allSpecialties.forEach((targetSpecialty: Specialty) => {
      // Skip if it's the same specialty
      if (targetSpecialty.name.toLowerCase().trim() === normalized) {
        return;
      }

      // Get all synonyms for the target specialty
      const targetSynonyms = [
        targetSpecialty.name,
        ...targetSpecialty.synonyms.predefined,
        ...targetSpecialty.synonyms.custom
      ].map(s => normalizeSpecialtyName(s));
      
      console.log('\nChecking target specialty:', targetSpecialty.name);
      console.log('Target synonyms:', targetSynonyms);

      // Check for direct matches first
      const directMatch = sourceSynonyms.some(s1 => targetSynonyms.some(s2 => s1 === s2));
      if (directMatch) {
        console.log('Found direct synonym match!');
        matches.set(targetSpecialty.name, {
          confidence: 1,
          reason: 'Direct synonym match'
        });
        return;
      }

      // Check for partial matches
      const partialMatches = sourceSynonyms.map(s1 => 
        targetSynonyms.map(s2 => ({
          source: s1,
          target: s2,
          similarity: this.calculateStringSimilarity(s1, s2)
        } as MatchResult))
      ).flat();

      const bestMatch = partialMatches.reduce((best, current) => 
        current.similarity > best.similarity ? current : best
      , { source: '', target: '', similarity: 0 } as MatchResult);

      if (bestMatch.similarity > 0.7) {
        console.log(`Found partial match: ${bestMatch.source} ↔ ${bestMatch.target} (${bestMatch.similarity})`);
        matches.set(targetSpecialty.name, {
          confidence: bestMatch.similarity,
          reason: `Similar to "${bestMatch.target}"`
        });
      }
    });

    const results = Array.from(matches.entries())
      .map(([specialty, { confidence, reason }]) => ({
        specialty,
        confidence,
        reason
      }))
      .sort((a, b) => b.confidence - a.confidence);
    
    console.log('\nFinal matches:', results);
    return results;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) {
      return 1.0;
    }
    
    // Direct containment check
    if (longer.includes(shorter)) {
      return 0.9;
    }
    
    // Word overlap check
    const words1 = new Set(str1.split(/[\s\/\-]+/).filter(w => !COMMON_WORDS.has(w)));
    const words2 = new Set(str2.split(/[\s\/\-]+/).filter(w => !COMMON_WORDS.has(w)));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  public saveToStorage(): void {
    if (!this.initialized) {
      console.log('Service not initialized, initializing now...');
      this.initialize();
    }

    console.log('Saving patterns to storage...');
    setToStorage(STORAGE_KEY, Object.fromEntries(this.learnedPatterns));
    console.log('Patterns saved successfully');
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
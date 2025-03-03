export interface SpecialtyMetadata {
  lastModified: Date;
  createdBy?: string;
  notes?: string;
  source?: 'predefined' | 'custom';
}

export interface Specialty {
  id: string;
  name: string;
  category?: string;
  synonyms: {
    predefined: string[];
    custom: string[];
  };
  metadata: SpecialtyMetadata;
}

export interface SpecialtyGroup {
  id: string;
  name: string;
  specialties: string[]; // References to specialty IDs
  metadata: SpecialtyMetadata;
}

export interface SynonymValidationResult {
  isValid: boolean;
  message?: string;
  details?: {
    type: 'duplicate_specialty' | 'duplicate_synonym';
    specialtyName: string;
    synonymType?: 'predefined' | 'custom';
  };
}

export interface SpecialtyManagerConfig {
  version: string;
  lastSync?: Date;
  settings: {
    enableAutoSuggestions: boolean;
    enableDuplicateCheck: boolean;
    caseSensitive: boolean;
    minSynonymLength: number;
  };
}

export type SpecialtyValidationRules = {
  minLength: number;
  maxLength: number;
  allowedCharacters: RegExp;
  disallowedPrefixes: string[];
  requireCategory: boolean;
};

export interface SpecialtyOperation {
  type: 'add' | 'update' | 'delete' | 'merge' | 'split';
  timestamp: Date;
  specialtyId: string;
  changes: Partial<Specialty>;
  metadata?: {
    reason?: string;
    user?: string;
  };
} 
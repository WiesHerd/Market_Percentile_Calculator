import { 
  Specialty,
  SpecialtyGroup,
  SpecialtyManagerConfig,
  SpecialtyOperation,
  SynonymValidationResult,
  SpecialtyValidationRules
} from '@/types/specialty';
import { predefinedSpecialties } from '@/data/predefinedSpecialties';
import { specialtyDefinitions } from './specialtyMapping';

const STORAGE_KEYS = {
  SPECIALTIES: 'specialty-management-specialties',
  GROUPS: 'specialty-management-groups',
  CONFIG: 'specialty-management-config',
  OPERATIONS: 'specialty-management-operations'
} as const;

const DEFAULT_CONFIG: SpecialtyManagerConfig = {
  version: '1.0.0',
  settings: {
    enableAutoSuggestions: true,
    enableDuplicateCheck: true,
    caseSensitive: false,
    minSynonymLength: 2
  }
};

const DEFAULT_VALIDATION_RULES: SpecialtyValidationRules = {
  minLength: 2,
  maxLength: 100,
  allowedCharacters: /^[a-zA-Z0-9\s\-\/&()]+$/,
  disallowedPrefixes: ['the', 'a', 'an'],
  requireCategory: false
};

interface SynonymValidationOptions {
  allowDuplicates?: boolean;
  caseSensitive?: boolean;
  minLength?: number;
  maxLength?: number;
  allowSpecialChars?: boolean;
  reservedWords?: string[];
}

interface NormalizedSynonym {
  original: string;
  normalized: string;
  specialty: string;
  type: 'predefined' | 'custom';
}

interface SynonymHistory {
  id: string;
  specialtyId: string;
  synonym: string;
  action: 'add' | 'remove';
  timestamp: Date;
  type: 'predefined' | 'custom';
  user?: string;
}

interface SynonymConflict {
  synonym: string;
  existingSpecialty: string;
  type: 'predefined' | 'custom';
  suggestedAction: 'merge' | 'rename' | 'skip';
}

class SpecialtyManager {
  private specialties: Map<string, Specialty>;
  private groups: Map<string, SpecialtyGroup>;
  private config: SpecialtyManagerConfig;
  private operations: SpecialtyOperation[];
  private validationRules: SpecialtyValidationRules;
  private synonymHistory: SynonymHistory[] = [];
  private validationOptions: SynonymValidationOptions = {
    allowDuplicates: false,
    caseSensitive: false,
    minLength: 2,
    maxLength: 100,
    allowSpecialChars: true,
    reservedWords: ['unknown', 'other', 'misc', 'various']
  };

  constructor() {
    this.specialties = new Map();
    this.groups = new Map();
    this.operations = [];
    this.config = DEFAULT_CONFIG;
    this.validationRules = DEFAULT_VALIDATION_RULES;
    this.initialize();
  }

  private initialize(): void {
    try {
      // Load config
      const savedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) };
      }

      // Load specialties
      const savedSpecialties = localStorage.getItem(STORAGE_KEYS.SPECIALTIES);
      if (savedSpecialties) {
        const specialtiesArray: Specialty[] = JSON.parse(savedSpecialties);
        specialtiesArray.forEach(specialty => {
          this.specialties.set(specialty.id, {
            ...specialty,
            metadata: {
              ...specialty.metadata,
              lastModified: new Date(specialty.metadata.lastModified)
            }
          });
        });
      } else {
        // Initialize with predefined specialties if no saved data
        predefinedSpecialties.forEach(specialty => {
          this.specialties.set(specialty.id, {
            ...specialty,
            metadata: {
              ...specialty.metadata,
              lastModified: new Date()
            }
          });
        });
      }

      // Load groups
      const savedGroups = localStorage.getItem(STORAGE_KEYS.GROUPS);
      if (savedGroups) {
        const groupsArray: SpecialtyGroup[] = JSON.parse(savedGroups);
        groupsArray.forEach(group => {
          this.groups.set(group.id, {
            ...group,
            metadata: {
              ...group.metadata,
              lastModified: new Date(group.metadata.lastModified)
            }
          });
        });
      }

      // Load operations
      const savedOperations = localStorage.getItem(STORAGE_KEYS.OPERATIONS);
      if (savedOperations) {
        this.operations = JSON.parse(savedOperations).map((op: SpecialtyOperation) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
      }

      // Import predefined synonyms
      this.importPredefinedSynonyms();

      // Save initial state
      this.saveToStorage();
    } catch (error) {
      console.error('Error initializing specialty data:', error);
      // Initialize with defaults if load fails
      this.specialties = new Map();
      this.groups = new Map();
      this.operations = [];
      this.config = DEFAULT_CONFIG;

      // Add predefined specialties as fallback
      predefinedSpecialties.forEach(specialty => {
        this.specialties.set(specialty.id, {
          ...specialty,
          metadata: {
            ...specialty.metadata,
            lastModified: new Date()
          }
        });
      });
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
      localStorage.setItem(
        STORAGE_KEYS.SPECIALTIES,
        JSON.stringify(Array.from(this.specialties.values()))
      );
      localStorage.setItem(
        STORAGE_KEYS.GROUPS,
        JSON.stringify(Array.from(this.groups.values()))
      );
      localStorage.setItem(
        STORAGE_KEYS.OPERATIONS,
        JSON.stringify(this.operations)
      );
    } catch (error) {
      console.error('Error saving specialty data:', error);
    }
  }

  private validateSpecialty(name: string): SynonymValidationResult {
    if (name.length < this.validationRules.minLength) {
      return {
        isValid: false,
        message: `Name must be at least ${this.validationRules.minLength} characters`
      };
    }

    if (name.length > this.validationRules.maxLength) {
      return {
        isValid: false,
        message: `Name must be no more than ${this.validationRules.maxLength} characters`
      };
    }

    if (!this.validationRules.allowedCharacters.test(name)) {
      return {
        isValid: false,
        message: 'Name contains invalid characters'
      };
    }

    const normalizedName = name.toLowerCase().trim();
    for (const prefix of this.validationRules.disallowedPrefixes) {
      if (normalizedName.startsWith(prefix + ' ')) {
        return {
          isValid: false,
          message: `Name should not start with '${prefix}'`
        };
      }
    }

    return { isValid: true };
  }

  private normalizeSynonym(synonym: string): string {
    return this.config.settings.caseSensitive 
      ? synonym.trim()
      : synonym.trim().toLowerCase();
  }

  private validateSynonym(synonym: string, specialtyId?: string): SynonymValidationResult {
    const options = this.validationOptions;
    const normalized = this.normalizeSynonym(synonym);

    // Length validation
    if (normalized.length < options.minLength!) {
      return { 
        isValid: false, 
        message: `Synonym must be at least ${options.minLength} characters long` 
      };
    }

    if (normalized.length > options.maxLength!) {
      return { 
        isValid: false, 
        message: `Synonym cannot exceed ${options.maxLength} characters` 
      };
    }

    // Reserved words check
    if (options.reservedWords?.includes(normalized)) {
      return { 
        isValid: false, 
        message: `"${synonym}" is a reserved word and cannot be used as a synonym` 
      };
    }

    // Special characters validation
    if (!options.allowSpecialChars && !/^[a-zA-Z0-9\s-]+$/.test(normalized)) {
      return { 
        isValid: false, 
        message: 'Synonym can only contain letters, numbers, spaces, and hyphens' 
      };
    }

    // Duplicate check
    if (!options.allowDuplicates) {
      for (const [id, specialty] of this.specialties) {
        if (specialtyId && id === specialtyId) continue;

        const allSynonyms = [
          ...specialty.synonyms.predefined,
          ...specialty.synonyms.custom
        ];

        const hasDuplicate = allSynonyms.some(s => 
          this.normalizeSynonym(s) === normalized
        );

        if (hasDuplicate) {
          return {
            isValid: false,
            message: `Synonym already exists for specialty "${specialty.name}"`
          };
        }
      }
    }

    return { isValid: true };
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private recordOperation(operation: SpecialtyOperation): void {
    this.operations.push(operation);
    // Keep only last 1000 operations
    if (this.operations.length > 1000) {
      this.operations = this.operations.slice(-1000);
    }
    this.saveToStorage();
  }

  private importPredefinedSynonyms(): void {
    // Import predefined specialties from specialtyDefinitions
    Object.entries(specialtyDefinitions).forEach(([name, definition]) => {
      // Find or create the specialty
      let specialty = Array.from(this.specialties.values()).find(s => s.name === name);
      
      if (!specialty) {
        // Create new specialty if it doesn't exist
        const id = this.generateId();
        specialty = {
          id,
          name,
          category: definition.category,
          synonyms: {
            predefined: [],
            custom: []
          },
          metadata: {
            lastModified: new Date(),
            source: 'predefined'
          }
        };
        this.specialties.set(id, specialty);
      }

      // Add predefined synonyms if they don't exist
      definition.synonyms?.forEach(synonym => {
        if (!specialty!.synonyms.predefined.includes(synonym)) {
          specialty!.synonyms.predefined.push(synonym);
        }
      });
    });

    // Save changes
    this.saveToStorage();
  }

  // Public Methods

  public addSpecialty(name: string, category?: string): Specialty | null {
    const validation = this.validateSpecialty(name);
    if (!validation.isValid) {
      console.error('Invalid specialty name:', validation.message);
      return null;
    }

    const id = this.generateId();
    const specialty: Specialty = {
      id,
      name,
      category,
      synonyms: {
        predefined: [],
        custom: []
      },
      metadata: {
        lastModified: new Date(),
        source: 'custom'
      }
    };

    this.specialties.set(id, specialty);
    
    this.recordOperation({
      type: 'add',
      timestamp: new Date(),
      specialtyId: id,
      changes: specialty
    });

    this.saveToStorage();
    return specialty;
  }

  public addSynonym(
    specialtyId: string, 
    synonym: string, 
    isPredefined = false
  ): { success: boolean; message?: string; conflict?: SynonymConflict } {
    const specialty = this.specialties.get(specialtyId);
    if (!specialty) {
      return { success: false, message: 'Specialty not found' };
    }

    const validation = this.validateSynonym(synonym, specialtyId);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    const normalized = this.normalizeSynonym(synonym);
    const target = isPredefined ? 'predefined' : 'custom';

    // Check for conflicts
    for (const [id, other] of this.specialties) {
      if (id === specialtyId) continue;

      const conflictingSynonym = [...other.synonyms.predefined, ...other.synonyms.custom]
        .find(s => this.normalizeSynonym(s) === normalized);

      if (conflictingSynonym) {
        return {
          success: false,
          message: `Conflict detected with specialty "${other.name}"`,
          conflict: {
            synonym,
            existingSpecialty: other.name,
            type: other.synonyms.predefined.includes(conflictingSynonym) 
              ? 'predefined' 
              : 'custom',
            suggestedAction: 'merge'
          }
        };
      }
    }

    if (!specialty.synonyms[target].includes(synonym)) {
      specialty.synonyms[target].push(synonym);
      specialty.metadata.lastModified = new Date();

      // Record history
      this.synonymHistory.push({
        id: this.generateId(),
        specialtyId,
        synonym,
        action: 'add',
        timestamp: new Date(),
        type: target
      });

      this.recordOperation({
        type: 'update',
        timestamp: new Date(),
        specialtyId,
        changes: {
          synonyms: specialty.synonyms
        }
      });

      this.saveToStorage();
      return { success: true };
    }

    return { 
      success: false, 
      message: `Synonym "${synonym}" already exists for this specialty` 
    };
  }

  public removeSynonym(specialtyId: string, synonym: string): boolean {
    const specialty = this.specialties.get(specialtyId);
    if (!specialty) {
      console.error('Specialty not found');
      return false;
    }

    const wasPredefined = specialty.synonyms.predefined.includes(synonym);
    const wasCustom = specialty.synonyms.custom.includes(synonym);

    // Remove from both predefined and custom synonyms
    specialty.synonyms.predefined = specialty.synonyms.predefined
      .filter(s => s !== synonym);
    specialty.synonyms.custom = specialty.synonyms.custom
      .filter(s => s !== synonym);
    
    if (wasPredefined || wasCustom) {
      specialty.metadata.lastModified = new Date();

      // Record history
      this.synonymHistory.push({
        id: this.generateId(),
        specialtyId,
        synonym,
        action: 'remove',
        timestamp: new Date(),
        type: wasPredefined ? 'predefined' : 'custom'
      });

      this.recordOperation({
        type: 'update',
        timestamp: new Date(),
        specialtyId,
        changes: {
          synonyms: specialty.synonyms
        }
      });

      this.saveToStorage();
      return true;
    }

    return false;
  }

  public getSpecialty(id: string): Specialty | undefined {
    return this.specialties.get(id);
  }

  public getAllSpecialties(): Specialty[] {
    return Array.from(this.specialties.values());
  }

  public searchSpecialties(query: string): Specialty[] {
    const normalizedQuery = this.normalizeSynonym(query);
    return Array.from(this.specialties.values()).filter(specialty => {
      const normalizedName = this.normalizeSynonym(specialty.name);
      if (normalizedName.includes(normalizedQuery)) return true;

      // Search through synonyms
      return [...specialty.synonyms.predefined, ...specialty.synonyms.custom]
        .some(synonym => this.normalizeSynonym(synonym).includes(normalizedQuery));
    });
  }

  public getSynonymSuggestions(name: string): string[] {
    if (!this.config.settings.enableAutoSuggestions) return [];

    const normalizedName = this.normalizeSynonym(name);
    const suggestions = new Set<string>();

    // Common variations
    suggestions.add(name.replace(/\s+&\s+/g, ' and ')); // & -> and
    suggestions.add(name.replace(/\s+and\s+/g, ' & ')); // and -> &
    suggestions.add(name.replace(/[\/\-]/g, ' ')); // Remove slashes and hyphens
    suggestions.add(name.replace(/\s+/g, '-')); // Replace spaces with hyphens
    suggestions.add(name.replace(/\s+/g, '/')); // Replace spaces with slashes

    // Remove duplicates and invalid suggestions
    return Array.from(suggestions).filter(suggestion => {
      const validation = this.validateSynonym(suggestion);
      return validation.isValid && suggestion !== name;
    });
  }

  public exportData(): string {
    const data = {
      specialties: Array.from(this.specialties.values()),
      groups: Array.from(this.groups.values()),
      config: this.config,
      operations: this.operations
    };
    return JSON.stringify(data, null, 2);
  }

  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      // Validate data structure
      if (!data.specialties || !Array.isArray(data.specialties)) {
        throw new Error('Invalid specialties data');
      }

      // Clear existing data
      this.specialties.clear();
      this.groups.clear();
      this.operations = [];

      // Import new data
      data.specialties.forEach((specialty: Specialty) => {
        this.specialties.set(specialty.id, {
          ...specialty,
          metadata: {
            ...specialty.metadata,
            lastModified: new Date(specialty.metadata.lastModified)
          }
        });
      });

      if (data.groups) {
        data.groups.forEach((group: SpecialtyGroup) => {
          this.groups.set(group.id, {
            ...group,
            metadata: {
              ...group.metadata,
              lastModified: new Date(group.metadata.lastModified)
            }
          });
        });
      }

      if (data.config) {
        this.config = { ...DEFAULT_CONFIG, ...data.config };
      }

      if (data.operations) {
        this.operations = data.operations.map((op: SpecialtyOperation) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }));
      }

      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  /**
   * Delete a specialty and all its synonyms
   * @param specialtyId The ID of the specialty to delete
   * @returns true if deleted, false if not found
   */
  deleteSpecialty(specialtyId: string): boolean {
    const specialties = this.getAllSpecialties();
    const index = specialties.findIndex(s => s.id === specialtyId);
    
    if (index === -1) return false;
    
    // Remove the specialty
    specialties.splice(index, 1);
    
    // Save the updated specialties
    localStorage.setItem('specialties', JSON.stringify(specialties));
    
    return true;
  }

  public getSynonymHistory(
    specialtyId?: string,
    options?: { 
      startDate?: Date; 
      endDate?: Date; 
      action?: 'add' | 'remove';
      type?: 'predefined' | 'custom';
    }
  ): SynonymHistory[] {
    let history = [...this.synonymHistory];

    if (specialtyId) {
      history = history.filter(h => h.specialtyId === specialtyId);
    }

    if (options?.startDate) {
      history = history.filter(h => h.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      history = history.filter(h => h.timestamp <= options.endDate!);
    }

    if (options?.action) {
      history = history.filter(h => h.action === options.action);
    }

    if (options?.type) {
      history = history.filter(h => h.type === options.type);
    }

    return history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getConflictingSynonyms(specialtyId: string): SynonymConflict[] {
    const specialty = this.specialties.get(specialtyId);
    if (!specialty) return [];

    const conflicts: SynonymConflict[] = [];
    const allSynonyms = [
      ...specialty.synonyms.predefined,
      ...specialty.synonyms.custom
    ];

    for (const [id, other] of this.specialties) {
      if (id === specialtyId) continue;

      const otherSynonyms = [
        ...other.synonyms.predefined,
        ...other.synonyms.custom
      ];

      for (const synonym of allSynonyms) {
        const normalized = this.normalizeSynonym(synonym);
        const conflictingSynonym = otherSynonyms
          .find(s => this.normalizeSynonym(s) === normalized);

        if (conflictingSynonym) {
          conflicts.push({
            synonym,
            existingSpecialty: other.name,
            type: other.synonyms.predefined.includes(conflictingSynonym) 
              ? 'predefined' 
              : 'custom',
            suggestedAction: 'merge'
          });
        }
      }
    }

    return conflicts;
  }
}

// Create and export a singleton instance
export const specialtyManager = new SpecialtyManager(); 
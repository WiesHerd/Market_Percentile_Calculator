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

class SpecialtyManager {
  private specialties: Map<string, Specialty>;
  private groups: Map<string, SpecialtyGroup>;
  private config: SpecialtyManagerConfig;
  private operations: SpecialtyOperation[];
  private validationRules: SpecialtyValidationRules;

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

  private validateSynonym(synonym: string, specialtyId?: string): SynonymValidationResult {
    // First apply specialty name validation rules
    const nameValidation = this.validateSpecialty(synonym);
    if (!nameValidation.isValid) {
      return nameValidation;
    }

    // Check for duplicates if enabled
    if (this.config.settings.enableDuplicateCheck) {
      const normalizedSynonym = this.normalizeName(synonym);
      
      // Check across all specialties
      for (const [id, specialty] of this.specialties) {
        if (specialtyId && id === specialtyId) continue; // Skip current specialty

        const allSynonyms = [
          ...specialty.synonyms.predefined,
          ...specialty.synonyms.custom
        ];

        if (allSynonyms.some(s => this.normalizeName(s) === normalizedSynonym)) {
          return {
            isValid: false,
            message: `Synonym already exists for specialty "${specialty.name}"`
          };
        }
      }
    }

    return { isValid: true };
  }

  private normalizeName(name: string): string {
    let normalized = name.trim();
    if (!this.config.settings.caseSensitive) {
      normalized = normalized.toLowerCase();
    }
    return normalized;
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

  public addSynonym(specialtyId: string, synonym: string, isPredefined = false): boolean {
    const specialty = this.specialties.get(specialtyId);
    if (!specialty) {
      console.error('Specialty not found');
      return false;
    }

    const validation = this.validateSynonym(synonym, specialtyId);
    if (!validation.isValid) {
      console.error('Invalid synonym:', validation.message);
      return false;
    }

    const target = isPredefined ? 'predefined' : 'custom';
    if (!specialty.synonyms[target].includes(synonym)) {
      specialty.synonyms[target].push(synonym);
      specialty.metadata.lastModified = new Date();
      
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

  public removeSynonym(specialtyId: string, synonym: string): boolean {
    const specialty = this.specialties.get(specialtyId);
    if (!specialty) {
      console.error('Specialty not found');
      return false;
    }

    // Remove from both predefined and custom synonyms
    specialty.synonyms.predefined = specialty.synonyms.predefined.filter(s => s !== synonym);
    specialty.synonyms.custom = specialty.synonyms.custom.filter(s => s !== synonym);
    
    specialty.metadata.lastModified = new Date();

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

  public getSpecialty(id: string): Specialty | undefined {
    return this.specialties.get(id);
  }

  public getAllSpecialties(): Specialty[] {
    return Array.from(this.specialties.values());
  }

  public searchSpecialties(query: string): Specialty[] {
    const normalizedQuery = this.normalizeName(query);
    return Array.from(this.specialties.values()).filter(specialty => {
      const normalizedName = this.normalizeName(specialty.name);
      if (normalizedName.includes(normalizedQuery)) return true;

      // Search through synonyms
      return [...specialty.synonyms.predefined, ...specialty.synonyms.custom]
        .some(synonym => this.normalizeName(synonym).includes(normalizedQuery));
    });
  }

  public getSynonymSuggestions(name: string): string[] {
    if (!this.config.settings.enableAutoSuggestions) return [];

    const normalizedName = this.normalizeName(name);
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
}

// Create and export a singleton instance
export const specialtyManager = new SpecialtyManager(); 
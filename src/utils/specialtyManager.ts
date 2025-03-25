import { 
  Specialty,
  SpecialtyGroup,
  SpecialtyManagerConfig,
  SpecialtyOperation,
  SynonymValidationResult,
  SpecialtyValidationRules
} from '@/types/specialty';
import { predefinedSpecialties } from '@/data/predefinedSpecialties';

const STORAGE_KEYS = {
  SPECIALTIES: 'specialty-management-specialties',
  GROUPS: 'specialty-management-groups',
  CONFIG: 'specialty-management-config',
  OPERATIONS: 'specialty-management-operations'
} as const;

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
  'Otolaryngology': [
    'Otorhinolaryngology', 
    'ENT', 
    'Ear Nose and Throat',
    'Head and Neck Surgery',
    'Ear Nose Throat',
    'Otology'
  ],
  'Obstetrics and Gynecology': [
    'OB/GYN', 
    'OBGYN', 
    'Obstetrics Gynecology',
    'Women\'s Health',
    'Obstetrics & Gynecology'
  ],
  'Physical Medicine and Rehabilitation': [
    'Physiatry', 
    'PM&R', 
    'PMR',
    'Rehabilitation Medicine'
  ],
  'Emergency Medicine': [
    'EM', 
    'Emergency Room',
    'ER Medicine',
    'Acute Care',
    'Emergency Care'
  ],
  'Gastroenterology': [
    'GI',
    'Digestive Disease',
    'Digestive Diseases',
    'Gastrointestinal Medicine',
    'Digestive Health'
  ],
  'Urgent Care': [
    'Immediate Care',
    'Walk-in Clinic',
    'Express Care',
    'Acute Care',
    'Quick Care'
  ],
  'Adolescent Medicine': [
    'Teen Medicine',
    'Youth Medicine',
    'Adolescent Health',
    'Teen Health'
  ],
  'Child and Adolescent Psychiatry': [
    'Pediatric Psychiatry',
    'Child Psychiatry',
    'Youth Psychiatry',
    'Adolescent Psychiatry',
    'Child & Adolescent Psychiatry'
  ],
  'Child Development': [
    'Developmental Pediatrics',
    'Pediatric Development',
    'Child Developmental Medicine',
    'Developmental Medicine (Pediatric)'
  ],
  'Developmental-Behavioral Medicine': [
    'Developmental-Behavioral Pediatrics',
    'Developmental Pediatrics',
    'Behavioral Pediatrics',
    'Developmental and Behavioral Pediatrics',
    'Developmental & Behavioral Pediatrics'
  ]
};

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
  specialtyId?: string;
  existingSpecialty?: string;
  specialtyName?: string;
  synonym?: string;
  type: 'predefined' | 'custom' | 'name';
  suggestedAction?: 'merge' | 'create' | 'ignore';
}

const isClient = typeof window !== 'undefined';

const getFromStorage = (key: string): string | null => {
  if (!isClient) {
    console.log(`Local storage not available, returning default value for ${key}`);
    return null;
  }
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Error reading from localStorage:`, error);
    return null;
  }
};

const saveToStorage = (key: string, value: string): void => {
  if (!isClient) {
    console.log(`Local storage not available, skipping save for ${key}`);
    return;
  }
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Error saving to localStorage:`, error);
  }
};

export class SpecialtyManager {
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

  private getFromStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return defaultValue;
      return JSON.parse(saved) as T;
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return defaultValue;
    }
  }

  private initialize(): void {
    try {
      // Load from storage first
      const savedSpecialties = this.getFromStorage<Array<[string, Specialty]>>(
        STORAGE_KEYS.SPECIALTIES,
        []
      );
      const savedGroups = this.getFromStorage<Array<[string, SpecialtyGroup]>>(
        STORAGE_KEYS.GROUPS,
        []
      );
      const savedConfig = this.getFromStorage<SpecialtyManagerConfig>(
        STORAGE_KEYS.CONFIG,
        DEFAULT_CONFIG
      );
      const savedOperations = this.getFromStorage<SpecialtyOperation[]>(
        STORAGE_KEYS.OPERATIONS,
        []
      );

      // Initialize maps with saved data, ensuring proper metadata
      this.specialties = new Map(
        savedSpecialties.map(([id, specialty]) => [
          id,
          {
            ...specialty,
            metadata: {
              ...specialty.metadata,
              lastModified: specialty.metadata?.lastModified ? new Date(specialty.metadata.lastModified) : new Date(),
              source: specialty.metadata?.source || 'custom'
            },
            synonyms: {
              predefined: specialty.synonyms?.predefined || [],
              custom: specialty.synonyms?.custom || []
            }
          }
        ])
      );

      this.groups = new Map(savedGroups);
      this.config = savedConfig;
      this.operations = savedOperations;

      // Import predefined specialties if none exist
      if (this.specialties.size === 0) {
        this.importPredefinedSynonyms();
      }

      console.log('Initialized SpecialtyManager with:', {
        specialties: this.specialties.size,
        groups: this.groups.size,
        operations: this.operations.length
      });
    } catch (error) {
      console.error('Error initializing SpecialtyManager:', error);
      // Initialize with defaults on error
      this.specialties = new Map();
      this.groups = new Map();
      this.operations = [];
      this.config = { ...DEFAULT_CONFIG };
      this.importPredefinedSynonyms();
    }
  }

  private notifySynonymUpdate(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('synonyms-updated'));
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.SPECIALTIES, JSON.stringify(Array.from(this.specialties.entries())));
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(Array.from(this.groups.entries())));
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
      localStorage.setItem(STORAGE_KEYS.OPERATIONS, JSON.stringify(this.operations));
      
      // Notify listeners that synonyms have been updated
      this.notifySynonymUpdate();
    } catch (error) {
      console.error('Error saving to storage:', error);
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
    // Import predefined specialties
    predefinedSpecialties.forEach(specialty => {
      // Find or create the specialty
      let existingSpecialty = Array.from(this.specialties.values()).find(s => s.name === specialty.name);
      
      if (!existingSpecialty) {
        // Create new specialty if it doesn't exist
        this.specialties.set(specialty.id, {
          ...specialty,
          metadata: {
            ...specialty.metadata,
            lastModified: new Date(),
            source: 'predefined'
          }
        });
      } else {
        // Update existing specialty's predefined synonyms
        existingSpecialty.synonyms.predefined = specialty.synonyms.predefined;
        this.specialties.set(existingSpecialty.id, existingSpecialty);
      }
    });

    // Save changes
    this.saveToStorage();
  }

  public refreshPredefinedSynonyms(): void {
    // Re-import all predefined specialties
    predefinedSpecialties.forEach(specialty => {
      const existing = this.specialties.get(specialty.id);
      if (existing) {
        // Update predefined synonyms while preserving custom ones
        this.specialties.set(specialty.id, {
          ...existing,
          synonyms: {
            predefined: specialty.synonyms.predefined,
            custom: existing.synonyms.custom
          }
        });
      } else {
        // Add new predefined specialty
        this.specialties.set(specialty.id, {
          ...specialty,
          metadata: {
            ...specialty.metadata,
            lastModified: new Date()
          }
        });
      }
    });

    // Import additional predefined synonyms
    this.importPredefinedSynonyms();

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

    // Normalize the synonym to ensure consistent checking
    const normalizedSynonym = this.normalizeSynonym(synonym);
    
    // Check if the synonym already exists in this specialty (in either predefined or custom)
    const target = isPredefined ? 'predefined' : 'custom';
    
    // Check both predefined and custom collections using normalized comparison
    const existsInPredefined = specialty.synonyms.predefined.some(s => 
      this.normalizeSynonym(s) === normalizedSynonym
    );
    
    const existsInCustom = specialty.synonyms.custom.some(s => 
      this.normalizeSynonym(s) === normalizedSynonym
    );
    
    if (existsInPredefined || existsInCustom) {
      return { 
        success: false, 
        message: `Synonym "${synonym}" already exists for specialty "${specialty.name}"` 
      };
    }

    const validation = this.validateSynonym(synonym, specialtyId);
    if (!validation.isValid) {
      return { success: false, message: validation.message };
    }

    // Check for conflicts with other specialties
    for (const [id, other] of this.specialties) {
      if (id === specialtyId) continue;
      
      // Check if it's a name of another specialty
      if (this.normalizeSynonym(other.name) === normalizedSynonym) {
        return {
          success: false,
          message: `Synonym conflict: "${synonym}" is already a specialty name`,
          conflict: {
            specialtyId: id,
            specialtyName: other.name,
            type: 'name' as const
          }
        };
      }
      
      // Check if it exists in predefined synonyms
      const predefinedConflict = other.synonyms.predefined.some(s => 
        this.normalizeSynonym(s) === normalizedSynonym
      );
      
      if (predefinedConflict) {
        return {
          success: false,
          message: `Synonym conflict: "${synonym}" is already a predefined synonym for "${other.name}"`,
          conflict: {
            specialtyId: id,
            specialtyName: other.name,
            type: 'predefined'
          }
        };
      }
      
      // Check if it exists in custom synonyms
      const customConflict = other.synonyms.custom.some(s => 
        this.normalizeSynonym(s) === normalizedSynonym
      );
      
      if (customConflict) {
        return {
          success: false,
          message: `Synonym conflict: "${synonym}" is already a custom synonym for "${other.name}"`,
          conflict: {
            specialtyId: id,
            specialtyName: other.name,
            type: 'custom'
          }
        };
      }
    }

    // Add the synonym to the appropriate collection
    if (isPredefined) {
      specialty.synonyms.predefined.push(synonym);
    } else {
      specialty.synonyms.custom.push(synonym);
    }
    
    // Update last modified date
    specialty.metadata.lastModified = new Date();
    
    // Log the operation
    this.recordOperation({
      type: 'update',
      timestamp: new Date(),
      specialtyId,
      changes: {
        synonyms: {
          ...specialty.synonyms
        }
      }
    });
    
    // Save to storage
    this.saveToStorage();
    
    // Add debug logging
    console.log(`Successfully added ${isPredefined ? 'predefined' : 'custom'} synonym "${synonym}" to "${specialty.name}"`);
    console.log('Updated synonyms:', {
      predefined: specialty.synonyms.predefined,
      custom: specialty.synonyms.custom
    });
    
    return { success: true };
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
    if (!this.specialties.has(specialtyId)) {
      return false;
    }

    // Record the operation before deleting
    const specialty = this.specialties.get(specialtyId)!;
    this.recordOperation({
      type: 'delete',
      timestamp: new Date(),
      specialtyId,
      changes: specialty
    });

    // Remove from the Map
    this.specialties.delete(specialtyId);
    
    // Save changes
    this.saveToStorage();
    
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

  // Methods from specialtySynonyms.ts
  
  /**
   * Get all synonyms for a specialty (both predefined and custom)
   * @param specialty The specialty name
   * @returns Array of synonyms
   */
  public getAllSynonyms(specialty: string): string[] {
    const predefined = PREDEFINED_SYNONYMS[specialty] || [];
    const custom = Array.from(this.specialties.values()).find(s => s.name === specialty)?.synonyms.custom || [];
    return Array.from(new Set([...predefined, ...custom]));
  }

  /**
   * Update synonyms for a specialty
   * @param specialtyId The specialty ID
   * @param synonyms Object containing predefined and custom synonyms
   */
  public updateSpecialtySynonyms(
    specialtyId: string, 
    synonyms: { predefined: string[], custom: string[] }
  ): void {
    const specialty = this.specialties.get(specialtyId);
    if (specialty) {
      specialty.synonyms = {
        predefined: synonyms.predefined,
        custom: synonyms.custom
      };
      specialty.metadata.lastModified = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Get all specialties with their synonyms
   * @returns Record of specialty names to synonym arrays
   */
  public getAllSpecialtiesWithSynonyms(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    // Add specialties and their synonyms from the specialties Map
    Array.from(this.specialties.values()).forEach((specialty) => {
      result[specialty.name] = [
        ...(specialty.synonyms.predefined || []),
        ...(specialty.synonyms.custom || [])
      ];
    });

    return result;
  }

  /**
   * Remove a specialty and its synonyms
   * @param specialty The specialty name
   */
  public removeSpecialtySynonyms(specialty: string): void {
    const specialtyObj = Array.from(this.specialties.values()).find(s => s.name === specialty);
    if (specialtyObj) {
      specialtyObj.synonyms.custom = [];
      specialtyObj.metadata.lastModified = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Add a new specialty with synonyms
   * @param specialty The specialty name
   * @param synonyms Array of synonyms
   */
  public addSpecialtyWithSynonyms(specialty: string, synonyms: string[]): void {
    const specialtyObj = Array.from(this.specialties.values()).find(s => s.name === specialty);
    if (specialtyObj) {
      specialtyObj.synonyms.custom = synonyms;
      specialtyObj.metadata.lastModified = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Check if a specialty has custom synonyms
   * @param specialty The specialty name
   * @returns True if the specialty has custom synonyms
   */
  public hasCustomSynonyms(specialty: string): boolean {
    const specialtyObj = Array.from(this.specialties.values()).find(s => s.name === specialty);
    return !!specialtyObj?.synonyms.custom.length;
  }

  /**
   * Get only custom synonyms for a specialty
   * @param specialty The specialty name
   * @returns Array of custom synonyms
   */
  public getCustomSynonyms(specialty: string): string[] {
    const specialtyObj = Array.from(this.specialties.values()).find(s => s.name === specialty);
    return specialtyObj?.synonyms.custom || [];
  }

  /**
   * Get only predefined synonyms for a specialty
   * @param specialty The specialty name
   * @returns Array of predefined synonyms
   */
  public getPredefinedSynonyms(specialty: string): string[] {
    const specialtyObj = Array.from(this.specialties.values()).find(s => s.name === specialty);
    return specialtyObj?.synonyms.predefined || [];
  }

  private loadFromStorage(): void {
    try {
      // Attempt to load from localStorage
      const storedSpecialties = localStorage.getItem(STORAGE_KEYS.SPECIALTIES);
      const storedGroups = localStorage.getItem(STORAGE_KEYS.GROUPS);
      const storedConfig = localStorage.getItem(STORAGE_KEYS.CONFIG);
      const storedOperations = localStorage.getItem(STORAGE_KEYS.OPERATIONS);

      // Parse and load specialties
      if (storedSpecialties) {
        const parsed = JSON.parse(storedSpecialties);
        this.specialties = new Map(
          Object.entries(parsed).map(([id, specialty]) => [id, specialty as Specialty])
        );
      } else {
        console.log('No stored specialties found, using default specialties');
        this.initializeDefaultSpecialties();
      }

      // Parse and load groups
      if (storedGroups) {
        const parsedGroups = JSON.parse(storedGroups);
        this.groups = new Map(
          Object.entries(parsedGroups).map(([id, group]) => [id, group as SpecialtyGroup])
        );
      } else {
        this.groups = new Map(); // Initialize as empty Map instead of empty array
      }

      // Parse and load config
      if (storedConfig) {
        this.config = JSON.parse(storedConfig);
      } else {
        this.config = DEFAULT_CONFIG;
      }

      // Parse and load operations history
      if (storedOperations) {
        this.operations = JSON.parse(storedOperations);
      } else {
        this.operations = []; // Initialize as empty array
      }
    } catch (error) {
      console.error('Error loading from storage, using defaults:', error);
      // Initialize with defaults when there's an error
      this.initializeDefaultSpecialties();
      this.config = DEFAULT_CONFIG;
      this.groups = new Map(); // Initialize as empty Map
      this.operations = [];
    }

    // Always import predefined specialties to ensure we have the latest definitions
    this.importPredefinedSynonyms();
  }

  private initializeDefaultSpecialties(): void {
    // Start with an empty map
    this.specialties = new Map();
    
    // Import predefined specialties from our data
    predefinedSpecialties.forEach(specialty => {
      this.specialties.set(specialty.id, {
        ...specialty,
        metadata: {
          ...specialty.metadata,
          lastModified: new Date()
        }
      });
    });
    
    // Add special handling for Psychiatry to ensure it's always defined
    const hasPsychiatry = Array.from(this.specialties.values()).some(
      s => s.name.toLowerCase() === 'psychiatry'
    );
    
    if (!hasPsychiatry) {
      const psychiatryId = this.generateId();
      this.specialties.set(psychiatryId, {
        id: psychiatryId,
        name: 'Psychiatry',
        category: 'Medical',
        synonyms: {
          predefined: [
            'Psychiatric Medicine',
            'Mental Health'
          ],
          custom: []
        },
        metadata: {
          lastModified: new Date(),
          source: 'predefined'
        }
      });
      
      console.log('Added default Psychiatry specialty');
    }
    
    // Also ensure Child and Adolescent Psychiatry is defined
    const hasChildPsychiatry = Array.from(this.specialties.values()).some(
      s => s.name.toLowerCase().includes('child') && s.name.toLowerCase().includes('psychiatry')
    );
    
    if (!hasChildPsychiatry) {
      const childPsychId = this.generateId();
      this.specialties.set(childPsychId, {
        id: childPsychId,
        name: 'Child and Adolescent Psychiatry',
        category: 'Medical',
        synonyms: {
          predefined: [
            'Pediatric Psychiatry',
            'Child Psychiatry',
            'Adolescent Psychiatry',
            'Youth Mental Health',
            'Child & Adolescent Psychiatry'
          ],
          custom: []
        },
        metadata: {
          lastModified: new Date(),
          source: 'predefined'
        }
      });
      
      console.log('Added default Child and Adolescent Psychiatry specialty');
    }
  }
}

// Create and export a singleton instance
export const specialtyManager = new SpecialtyManager();

// Export the functions from specialtySynonyms.ts for backward compatibility
export function getAllSynonyms(specialty: string): string[] {
  return specialtyManager.getAllSynonyms(specialty);
}

export function updateSpecialtySynonyms(specialty: string, synonyms: string[]): void {
  specialtyManager.updateSpecialtySynonyms(specialty, synonyms);
}

export function getAllSpecialtiesWithSynonyms(): Record<string, string[]> {
  return specialtyManager.getAllSpecialtiesWithSynonyms();
}

export function removeSpecialtySynonyms(specialty: string): void {
  specialtyManager.removeSpecialtySynonyms(specialty);
}

export function addSpecialtyWithSynonyms(specialty: string, synonyms: string[]): void {
  specialtyManager.addSpecialtyWithSynonyms(specialty, synonyms);
}

export function hasCustomSynonyms(specialty: string): boolean {
  return specialtyManager.hasCustomSynonyms(specialty);
}

export function getCustomSynonyms(specialty: string): string[] {
  return specialtyManager.getCustomSynonyms(specialty);
}

export function getPredefinedSynonyms(specialty: string): string[] {
  return specialtyManager.getPredefinedSynonyms(specialty);
} 
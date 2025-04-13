import { toast } from 'sonner';

// Types for survey data validation
interface ValidationRule {
  validate: (value: any) => boolean;
  message: string;
}

interface FieldRules {
  [key: string]: ValidationRule[];
}

// Global validation rules for survey data
export const surveyValidationRules: FieldRules = {
  vendor: [
    {
      validate: (value: string) => !!value && value.trim() !== '',
      message: 'Please select a vendor before uploading a survey'
    }
  ],
  year: [
    {
      validate: (value: string) => !!value && value.trim() !== '',
      message: 'Please select a year before uploading a survey'
    },
    {
      validate: (value: string) => {
        const year = parseInt(value);
        const currentYear = new Date().getFullYear();
        return year >= 2000 && year <= currentYear + 1;
      },
      message: 'Year must be between 2000 and next year'
    }
  ],
  file: [
    {
      validate: (file: File) => !!file,
      message: 'Please select a file to upload'
    },
    {
      validate: (file: File) => {
        const validExtensions = ['.csv', '.xlsx', '.xls'];
        return validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
      },
      message: 'File must be a CSV or Excel file'
    }
  ]
};

// Function to validate survey data before upload
export function validateSurveyUpload(data: { 
  vendor: string; 
  year: string; 
  file: File;
}): boolean {
  for (const [field, rules] of Object.entries(surveyValidationRules)) {
    for (const rule of rules) {
      if (!rule.validate(data[field as keyof typeof data])) {
        toast.error(rule.message);
        return false;
      }
    }
  }
  return true;
}

// Constants for data migration
export const STORAGE_KEYS = {
  SURVEYS: 'uploadedSurveys',
  TEMPLATES: 'surveyMappingTemplates',
  SPECIALTY_MAPPINGS: 'specialtyMappings'
} as const;

// Function to handle data migration from localStorage to Prisma
export async function migrateLocalStorageData(): Promise<void> {
  try {
    // Migrate surveys
    const localSurveys = localStorage.getItem(STORAGE_KEYS.SURVEYS);
    if (localSurveys) {
      const surveys = JSON.parse(localSurveys);
      for (const survey of surveys) {
        await fetch('/api/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(survey)
        });
      }
      localStorage.removeItem(STORAGE_KEYS.SURVEYS);
    }

    // Migrate templates
    const localTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    if (localTemplates) {
      const templates = JSON.parse(localTemplates);
      for (const template of templates) {
        await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template)
        });
      }
      localStorage.removeItem(STORAGE_KEYS.TEMPLATES);
    }

    // Migrate specialty mappings
    const localMappings = localStorage.getItem(STORAGE_KEYS.SPECIALTY_MAPPINGS);
    if (localMappings) {
      const mappings = JSON.parse(localMappings);
      await fetch('/api/specialty-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mappings)
      });
      localStorage.removeItem(STORAGE_KEYS.SPECIALTY_MAPPINGS);
    }

    toast.success('Data migration completed successfully');
  } catch (error) {
    console.error('Error migrating data:', error);
    toast.error('Failed to migrate data from localStorage');
  }
}

// Function to ensure data consistency between localStorage and Prisma
export async function syncDataWithPrisma(): Promise<void> {
  try {
    // Fetch all data from Prisma
    const [surveysRes, templatesRes, mappingsRes] = await Promise.all([
      fetch('/api/surveys'),
      fetch('/api/templates'),
      fetch('/api/specialty-mappings')
    ]);

    const [surveys, templates, mappings] = await Promise.all([
      surveysRes.json(),
      templatesRes.json(),
      mappingsRes.json()
    ]);

    // Update localStorage with Prisma data
    localStorage.setItem(STORAGE_KEYS.SURVEYS, JSON.stringify(surveys));
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    localStorage.setItem(STORAGE_KEYS.SPECIALTY_MAPPINGS, JSON.stringify(mappings));
  } catch (error) {
    console.error('Error syncing data with Prisma:', error);
    toast.error('Failed to sync data with database');
  }
}

// Function to handle data backup before making changes
export async function backupDataBeforeChange(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    const backup = {
      surveys: localStorage.getItem(STORAGE_KEYS.SURVEYS),
      templates: localStorage.getItem(STORAGE_KEYS.TEMPLATES),
      specialtyMappings: localStorage.getItem(STORAGE_KEYS.SPECIALTY_MAPPINGS),
      timestamp
    };

    // Instead of storing the full backup in localStorage, store only essential metadata
    const backupMetadata = {
      timestamp,
      hasSurveys: !!backup.surveys,
      hasTemplates: !!backup.templates,
      hasMappings: !!backup.specialtyMappings
    };

    // Store only the metadata in localStorage
    localStorage.setItem(`backup_metadata_${timestamp}`, JSON.stringify(backupMetadata));

    // Store the actual backup data in sessionStorage which typically has a higher quota
    try {
      sessionStorage.setItem(`backup_${timestamp}`, JSON.stringify(backup));
    } catch (sessionError) {
      console.warn('Failed to store backup in sessionStorage:', sessionError);
      // If sessionStorage fails, we'll proceed without a backup
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    // Don't show error toast as this is not critical for the upload process
  }
}

// Function to restore data from backup
export async function restoreFromBackup(timestamp: string): Promise<void> {
  try {
    // First try to get backup from sessionStorage
    let backupData = sessionStorage.getItem(`backup_${timestamp}`);
    
    // If not in sessionStorage, try to reconstruct from localStorage
    if (!backupData) {
      const metadata = localStorage.getItem(`backup_metadata_${timestamp}`);
      if (!metadata) {
        throw new Error('Backup not found');
      }

      // Reconstruct backup from current localStorage data
      backupData = JSON.stringify({
        surveys: localStorage.getItem(STORAGE_KEYS.SURVEYS),
        templates: localStorage.getItem(STORAGE_KEYS.TEMPLATES),
        specialtyMappings: localStorage.getItem(STORAGE_KEYS.SPECIALTY_MAPPINGS),
        timestamp
      });
    }

    const backup = JSON.parse(backupData);
    
    // Only restore data that exists in the backup
    if (backup.surveys) localStorage.setItem(STORAGE_KEYS.SURVEYS, backup.surveys);
    if (backup.templates) localStorage.setItem(STORAGE_KEYS.TEMPLATES, backup.templates);
    if (backup.specialtyMappings) localStorage.setItem(STORAGE_KEYS.SPECIALTY_MAPPINGS, backup.specialtyMappings);

    await syncDataWithPrisma();
    toast.success('Data restored successfully');
  } catch (error) {
    console.error('Error restoring from backup:', error);
    toast.error('Failed to restore data from backup');
  }
} 
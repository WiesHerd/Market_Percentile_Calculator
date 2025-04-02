export type StepType = 'upload' | 'column-mapping' | 'specialty-mapping' | 'preview';

export interface ColumnMappingMetric {
  p25: string;
  p50: string;
  p75: string;
  p90: string;
}

export interface ColumnMapping {
  specialty: string;
  providerType: string;
  geographicRegion: string;
  nOrgs: string;
  nIncumbents: string;
  tcc: ColumnMappingMetric;
  wrvu: ColumnMappingMetric;
  cf: ColumnMappingMetric;
}

export interface SpecialtyMapping {
  id: string;
  surveyId: string;
  sourceSpecialty: string;
  mappedSpecialty: string;
  confidence: number;
  isVerified: boolean;
  notes?: string;
}

export interface MappingState {
  [key: string]: SpecialtyMapping;
}

export interface SurveyDataRow {
  specialty: string;
  providerType: string;
  region: string;
  nOrgs: number;
  nIncumbents: number;
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

export interface SurveyData {
  id: string;
  vendor: string;
  year: string;
  data: any[];
  columnMappings: ColumnMapping;
  specialtyMappings: Record<string, SpecialtyMapping>;
  columns: string[];
  mappingProgress: number;
}

export interface UploadedSurvey extends Omit<SurveyData, 'year'> {
  year: string;
}

export interface MappingTemplate {
  id: string;
  name: string;
  vendor: string;
  columnMappings: ColumnMapping;
}

export interface PreviewRow {
  [key: string]: string | number;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface AggregatedData {
  specialty: string;
  providerType: string;
  geographicRegion: string;
  metrics: {
    tcc: { [key: string]: number };
    wrvu: { [key: string]: number };
    cf: { [key: string]: number };
  };
  nOrgs: number;
  nIncumbents: number;
} 
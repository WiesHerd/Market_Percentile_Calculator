export interface ColumnMappingMetric {
  p25: string;
  p50: string;
  p75: string;
  p90: string;
}

export interface ColumnMapping {
  specialty: string;
  providerType: string;
  region: string;
  nOrgs: string;
  nIncumbents: string;
  tcc: ColumnMappingMetric;
  wrvu: ColumnMappingMetric;
  cf: ColumnMappingMetric;
}

export interface SpecialtyMapping {
  mappedSpecialties: string[];
  notes: string;
  resolved: boolean;
  isSingleSource: boolean;
  confidence: number;
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
  year: number;
  columnMappings: ColumnMapping;
  specialtyMappings: MappingState;
  data: SurveyDataRow[];
}

export interface UploadedSurvey extends Omit<SurveyData, 'year'> {
  year: string;
} 
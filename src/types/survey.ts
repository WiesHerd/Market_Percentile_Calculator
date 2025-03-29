export interface SurveyMetric {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SurveyData {
  specialty: string;
  geographic_region: string;
  n_orgs: number;
  n_incumbents: number;
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

export interface SurveyMapping {
  specialty: string;
  geographic_region: string;
  n_orgs: string;
  n_incumbents: string;
  tcc: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
  wrvu: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
  cf: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
}

export interface UploadedSurvey {
  id: string;
  vendor: string;
  year: string;
  status: string;
  uploadDate: string;
  data: {
    id: string;
    surveyId: string;
    specialty: string;
    providerType: string | null;
    region: string | null;
    nOrgs: number | null;
    nIncumbents: number | null;
    tccP25: number | null;
    tccP50: number | null;
    tccP75: number | null;
    tccP90: number | null;
    wrvuP25: number | null;
    wrvuP50: number | null;
    wrvuP75: number | null;
    wrvuP90: number | null;
    cfP25: number | null;
    cfP50: number | null;
    cfP75: number | null;
    cfP90: number | null;
  }[];
  specialtyMappings: {
    id: string;
    surveyId: string;
    sourceSpecialty: string;
    mappedSpecialty: string;
    confidence: number;
    notes: string | null;
    isVerified: boolean;
  }[];
  columnMappings: Record<string, any>;
}

export interface CustomBlendSelection {
  surveyId: string;
  specialty: string;
}

export interface MetricSection {
  title: string;
  key: 'tcc' | 'wrvu' | 'cf';
  format: (value: number) => string;
  description: string;
  icon: JSX.Element;
}

export interface PrintSectionData {
  source: string;
  values: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
}

export interface PrintSection {
  title: string;
  data: PrintSectionData[];
  averages: {
    p25: string;
    p50: string;
    p75: string;
    p90: string;
  };
}

export interface PrintLayoutProps {
  title: string;
  subtitle: string;
  sections: PrintSection[];
}

export interface PreviewRow {
  specialty: string;
  providerType?: string | null;
  region?: string | null;
  nOrgs?: number | null;
  nIncumbents?: number | null;
  tccP25?: number | null;
  tccP50?: number | null;
  tccP75?: number | null;
  tccP90?: number | null;
  wrvuP25?: number | null;
  wrvuP50?: number | null;
  wrvuP75?: number | null;
  wrvuP90?: number | null;
  cfP25?: number | null;
  cfP50?: number | null;
  cfP75?: number | null;
  cfP90?: number | null;
  [key: string]: string | number | null | undefined;
} 
export interface SurveyMetric {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface SurveyData {
  specialty: string;
  tcc?: SurveyMetric;
  wrvu?: SurveyMetric;
  cf?: SurveyMetric;
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
export type MetricType = 'total' | 'wrvu' | 'cf';

export interface MarketData {
  id: string;
  specialty: string;
  p25_total: number;
  p50_total: number;
  p75_total: number;
  p90_total: number;
  p25_wrvu: number;
  p50_wrvu: number;
  p75_wrvu: number;
  p90_wrvu: number;
  p25_cf: number;
  p50_cf: number;
  p75_cf: number;
  p90_cf: number;
}

export type MarketDataPercentileKey = `p${25 | 50 | 75 | 90}_${MetricType}`;

export interface ComplianceCheck {
  id: string;
  type: 'warning' | 'flag' | 'info';
  message: string;
  threshold: number;
  metricType: MetricType;
}

export interface FairMarketValue {
  min: number;
  max: number;
  metricType: MetricType;
  specialty: string;
  source: string;
  lastUpdated: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: 'calculation' | 'data_update' | 'compliance_check';
  details: {
    calculationId?: string;
    specialty?: string;
    metric?: MetricType;
    value?: number;
    actualValue?: number;
    fte?: number;
    percentile?: number;
    complianceFlags?: ComplianceCheck[];
    fairMarketValue?: FairMarketValue;
  };
  userId: string;
}

export interface CalculationHistory {
  id: string;
  physicianName: string;
  specialty: string;
  metric: MetricType;
  value: number;
  actualValue: number;
  fte: number;
  percentile: number;
  timestamp: string;
  notes?: string;
  complianceChecks?: ComplianceCheck[];
  fairMarketValue?: FairMarketValue;
  auditId?: string;
}
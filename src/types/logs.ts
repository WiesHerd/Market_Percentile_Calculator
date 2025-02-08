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

export interface CalculationHistory {
  id: string;
  physicianName: string;
  specialty: string;
  metric: MetricType;
  value: number;
  percentile: number;
  timestamp: string;
  notes?: string;
}
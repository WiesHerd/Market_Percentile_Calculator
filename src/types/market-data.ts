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

export interface CustomMarketData {
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

export interface TCCComponent {
  id: string;
  name: string;
  value: string;
  notes: string;
} 
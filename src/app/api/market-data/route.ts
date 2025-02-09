import { NextResponse } from 'next/server';
import { MarketData } from '@/types/logs';

// Add this line to make it work with static exports
export const dynamic = 'force-static';

const sampleMarketData: MarketData[] = [
  {
    id: '1',
    specialty: 'Family Medicine',
    p25_total: 220000,
    p50_total: 250000,
    p75_total: 280000,
    p90_total: 320000,
    p25_wrvu: 4200,
    p50_wrvu: 4800,
    p75_wrvu: 5400,
    p90_wrvu: 6200,
    p25_cf: 45.50,
    p50_cf: 48.75,
    p75_cf: 52.00,
    p90_cf: 56.25
  },
  {
    id: '2',
    specialty: 'Internal Medicine',
    p25_total: 240000,
    p50_total: 275000,
    p75_total: 310000,
    p90_total: 350000,
    p25_wrvu: 4500,
    p50_wrvu: 5100,
    p75_wrvu: 5800,
    p90_wrvu: 6500,
    p25_cf: 46.75,
    p50_cf: 50.00,
    p75_cf: 53.25,
    p90_cf: 57.50
  },
  {
    id: '3',
    specialty: 'Cardiology',
    p25_total: 400000,
    p50_total: 475000,
    p75_total: 550000,
    p90_total: 650000,
    p25_wrvu: 7500,
    p50_wrvu: 8500,
    p75_wrvu: 9500,
    p90_wrvu: 11000,
    p25_cf: 52.50,
    p50_cf: 55.75,
    p75_cf: 59.00,
    p90_cf: 63.25
  },
  {
    id: '4',
    specialty: 'Orthopedic Surgery',
    p25_total: 500000,
    p50_total: 600000,
    p75_total: 700000,
    p90_total: 850000,
    p25_wrvu: 8500,
    p50_wrvu: 9800,
    p75_wrvu: 11200,
    p90_wrvu: 13000,
    p25_cf: 55.00,
    p50_cf: 58.25,
    p75_cf: 61.50,
    p90_cf: 65.75
  }
];

export async function GET() {
  return NextResponse.json(sampleMarketData);
} 
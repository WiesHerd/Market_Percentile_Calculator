'use client';

import dynamic from 'next/dynamic';

const PercentileCalculator = dynamic(
  () => import('./PercentileCalculator'),
  { ssr: false }
);

export function ClientWrapper() {
  return <PercentileCalculator />;
} 
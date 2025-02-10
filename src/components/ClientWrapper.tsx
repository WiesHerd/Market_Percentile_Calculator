'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const PercentileCalculator = dynamic(
  () => import('./PercentileCalculator'),
  { ssr: false }
);

export function ClientWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {isLoaded && (
        <>
          {showHeader && (
            <header className="flex justify-between items-start mb-6 px-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Provider Percentile Calculator</h1>
                <p className="text-base text-gray-600 mt-1">Calculate and analyze provider compensation percentiles</p>
              </div>
              <Image 
                src={`${process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : ''}/WH Logo.webp`}
                alt="WH Logo"
                width={64}
                height={64}
                className="h-16 w-auto"
                priority
              />
            </header>
          )}
          <main>
            <PercentileCalculator onDataSourceSelected={() => setShowHeader(true)} />
          </main>
        </>
      )}
    </div>
  );
} 
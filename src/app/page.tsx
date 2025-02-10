'use client';

import { useState, useEffect } from 'react';
import PercentileCalculator from '@/components/PercentileCalculator';

export default function Home() {
  const [hasUserMadeChoice, setHasUserMadeChoice] = useState(false);

  useEffect(() => {
    const choiceMade = localStorage.getItem('dataChoiceMade');
    setHasUserMadeChoice(!!choiceMade);
  }, []);

  // If no choice has been made, only show the initial choice dialog
  if (!hasUserMadeChoice) {
    return (
      <div className="min-h-screen bg-white">
        <PercentileCalculator />
      </div>
    );
  }

  // After choice is made, show the full app layout
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <header className="flex justify-between items-start mb-6 px-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Provider Percentile Calculator</h1>
            <p className="text-base text-gray-600 mt-1">Calculate and analyze provider compensation percentiles</p>
          </div>
          <img 
            src="/WH Logo.webp"
            alt="WH Logo"
            className="h-16 w-auto"
          />
        </header>
        <main>
          <PercentileCalculator />
        </main>
      </div>
    </div>
  );
}

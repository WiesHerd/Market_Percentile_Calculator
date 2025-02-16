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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1920px] mx-auto">
        {isLoaded && (
          <>
            {/* Header Section */}
            <div className="bg-gray-50">
              <div className="px-8 sm:px-12 lg:px-8 py-10">
                <div className="flex items-center">
                  <div className="flex items-center space-x-6">
                    <div className="space-y-3">
                      <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">
                        Provider Percentile Calculator
                      </h2>
                      <div className="h-1 w-24 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></div>
                      <p className="text-sm font-medium text-gray-600 max-w-2xl tracking-wide">
                        Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator Content */}
            <div className="px-8 sm:px-12 lg:px-8 py-8">
              <div className="space-y-6">
                {/* Calculator Card */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-8">
                    <div className="mb-6">
                      <div className="flex items-center text-sm text-rose-600">
                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Fields marked with an asterisk (*) are required
                      </div>
                    </div>

                    <main>
                      <PercentileCalculator onDataSourceSelected={() => setShowHeader(true)} />
                    </main>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 
'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MarketData } from '@/types/logs';

const APP_VERSION = '1.0.1'; // Add version number

const PercentileCalculator = dynamic(
  () => import('./PercentileCalculator'),
  { ssr: false }
);

interface CSVRow {
  specialty?: string;
  p25_TCC?: string;
  p50_TCC?: string;
  p75_TCC?: string;
  p90_TCC?: string;
  p25_wrvu?: string;
  p50_wrvu?: string;
  p75_wrvu?: string;
  p90_wrvu?: string;
  p25_cf?: string;
  p50_cf?: string;
  p75_cf?: string;
  p90_cf?: string;
}

export function ClientWrapper() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHeader, setShowHeader] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Clear localStorage first
        localStorage.clear();
        
        // Load default market data from public storage
        const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
        
        try {
          // First try to load CSV
          const csvResponse = await fetch(`${basePath}/data/market-reference-data.csv`);
          const csvText = await csvResponse.text();
          
          const Papa = (await import('papaparse')).default;
          const parsedData: MarketData[] = [];
          
          Papa.parse<CSVRow>(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              results.data.forEach((row, index) => {
                if (!row.specialty) return;
                
                const newData: MarketData = {
                  id: `default_${index + 1}`,
                  specialty: row.specialty,
                  p25_total: parseFloat(row.p25_TCC || '0'),
                  p50_total: parseFloat(row.p50_TCC || '0'),
                  p75_total: parseFloat(row.p75_TCC || '0'),
                  p90_total: parseFloat(row.p90_TCC || '0'),
                  p25_wrvu: parseFloat(row.p25_wrvu || '0'),
                  p50_wrvu: parseFloat(row.p50_wrvu || '0'),
                  p75_wrvu: parseFloat(row.p75_wrvu || '0'),
                  p90_wrvu: parseFloat(row.p90_wrvu || '0'),
                  p25_cf: parseFloat(row.p25_cf || '0'),
                  p50_cf: parseFloat(row.p50_cf || '0'),
                  p75_cf: parseFloat(row.p75_cf || '0'),
                  p90_cf: parseFloat(row.p90_cf || '0')
                };
                parsedData.push(newData);
              });
            }
          });
          
          // Store the parsed data in localStorage
          localStorage.setItem('uploadedMarketData', JSON.stringify(parsedData));
          
        } catch (csvError) {
          // If CSV fails, try JSON
          const response = await fetch(`${basePath}/data/market-data.json`);
          if (!response.ok) {
            throw new Error(`Failed to load market data: ${response.statusText}`);
          }
          const data = await response.json();
          localStorage.setItem('uploadedMarketData', JSON.stringify(data));
        }

        // Set app version
        localStorage.setItem('appVersion', APP_VERSION);
        
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeData();
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
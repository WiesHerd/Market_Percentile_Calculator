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
        // Preserve existing uploaded surveys
        const existingUploadedSurveys = localStorage.getItem('uploadedSurveys');
        
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
        
        // Restore uploaded surveys if they existed
        if (existingUploadedSurveys) {
          localStorage.setItem('uploadedSurveys', existingUploadedSurveys);
        }
        
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    initializeData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {isLoaded && (
          <>
            {/* Enhanced Header Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
              <div className="bg-blue-50 px-6 py-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm">
                      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-5 4h4m-3 4h2m-1 4h2M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5c0-1.1.9-2 2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-semibold text-gray-900">Provider Percentile Calculator</h1>
                      <p className="mt-2 text-gray-600 max-w-2xl">
                        Advanced analytics tool for healthcare compensation benchmarking and market positioning analysis
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculator Content */}
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
          </>
        )}
      </div>
    </div>
  );
} 
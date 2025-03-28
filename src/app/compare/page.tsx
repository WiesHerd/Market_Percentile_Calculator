'use client';

import { useState, useEffect } from 'react';
import { MarketData, MetricType } from '@/types/logs';
import { SpecialtyComparison } from '@/components/SpecialtyComparison';
import { SpecialtyComparisonView } from '@/components/SpecialtyComparisonView';
import Link from 'next/link';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { LoadingScreen } from '@/components/ui/loading-screen';

export default function ComparePage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('total');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'single' | 'compare'>('single');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to get uploaded surveys from localStorage
        const uploadedSurveys = localStorage.getItem('uploadedSurveys');
        let data: MarketData[] = [];
        
        if (uploadedSurveys) {
          const surveys = JSON.parse(uploadedSurveys);
          const aggregatedData = new Map<string, {
            specialty: string;
            tcc: { sum: number; count: number; }[];
            wrvu: { sum: number; count: number; }[];
            cf: { sum: number; count: number; }[];
          }>();

          // Process each survey
          surveys.forEach((survey: any) => {
            survey.data.forEach((row: any) => {
              const specialty = row[survey.mappings.specialty]?.trim();
              if (!specialty) return;

              if (!aggregatedData.has(specialty)) {
                aggregatedData.set(specialty, {
                  specialty,
                  tcc: Array(4).fill(null).map(() => ({ sum: 0, count: 0 })),
                  wrvu: Array(4).fill(null).map(() => ({ sum: 0, count: 0 })),
                  cf: Array(4).fill(null).map(() => ({ sum: 0, count: 0 }))
                });
              }

              const specialtyData = aggregatedData.get(specialty)!;

              // Aggregate TCC data
              const tccFields = [
                survey.mappings.tcc.p25,
                survey.mappings.tcc.p50,
                survey.mappings.tcc.p75,
                survey.mappings.tcc.p90
              ];
              tccFields.forEach((field, index) => {
                const value = parseFloat(row[field]);
                if (!isNaN(value) && value > 0) {
                  specialtyData.tcc[index].sum += value;
                  specialtyData.tcc[index].count += 1;
                }
              });

              // Aggregate WRVU data
              const wrvuFields = [
                survey.mappings.wrvu.p25,
                survey.mappings.wrvu.p50,
                survey.mappings.wrvu.p75,
                survey.mappings.wrvu.p90
              ];
              wrvuFields.forEach((field, index) => {
                const value = parseFloat(row[field]);
                if (!isNaN(value) && value > 0) {
                  specialtyData.wrvu[index].sum += value;
                  specialtyData.wrvu[index].count += 1;
                }
              });

              // Aggregate CF data
              const cfFields = [
                survey.mappings.cf.p25,
                survey.mappings.cf.p50,
                survey.mappings.cf.p75,
                survey.mappings.cf.p90
              ];
              cfFields.forEach((field, index) => {
                const value = parseFloat(row[field]);
                if (!isNaN(value) && value > 0) {
                  specialtyData.cf[index].sum += value;
                  specialtyData.cf[index].count += 1;
                }
              });
            });
          });

          // Convert aggregated data to MarketData format
          data = Array.from(aggregatedData.values()).map((item, index) => ({
            id: `aggregated_${index + 1}`,
            specialty: item.specialty,
            p25_total: item.tcc[0].count > 0 ? item.tcc[0].sum / item.tcc[0].count : 0,
            p50_total: item.tcc[1].count > 0 ? item.tcc[1].sum / item.tcc[1].count : 0,
            p75_total: item.tcc[2].count > 0 ? item.tcc[2].sum / item.tcc[2].count : 0,
            p90_total: item.tcc[3].count > 0 ? item.tcc[3].sum / item.tcc[3].count : 0,
            p25_wrvu: item.wrvu[0].count > 0 ? item.wrvu[0].sum / item.wrvu[0].count : 0,
            p50_wrvu: item.wrvu[1].count > 0 ? item.wrvu[1].sum / item.wrvu[1].count : 0,
            p75_wrvu: item.wrvu[2].count > 0 ? item.wrvu[2].sum / item.wrvu[2].count : 0,
            p90_wrvu: item.wrvu[3].count > 0 ? item.wrvu[3].sum / item.wrvu[3].count : 0,
            p25_cf: item.cf[0].count > 0 ? item.cf[0].sum / item.cf[0].count : 0,
            p50_cf: item.cf[1].count > 0 ? item.cf[1].sum / item.cf[1].count : 0,
            p75_cf: item.cf[2].count > 0 ? item.cf[2].sum / item.cf[2].count : 0,
            p90_cf: item.cf[3].count > 0 ? item.cf[3].sum / item.cf[3].count : 0,
            source: {
              type: 'aggregated_survey',
              name: 'Aggregated Survey Data',
              timestamp: new Date().toISOString()
            }
          }));
        }

        // If no survey data, show an error
        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No survey data available. Please upload survey data first.');
        }
        
        setMarketData(data);
      } catch (error) {
        console.error('Error loading market data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load market data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const formatValue = (value: number, metric: MetricType): string => {
    if (metric === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    } else if (metric === 'total') {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      });
    } else {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      });
    }
  };

  const handleSpecialtyChange = (specialty: string) => {
    setSelectedSpecialties(prev => {
      if (prev.includes(specialty)) {
        return prev.filter(s => s !== specialty);
      }
      if (prev.length >= 2) {
        return [prev[1], specialty];
      }
      return [...prev, specialty];
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <LoadingScreen message="Loading Comparison Data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full">
          <div className="text-center">
            <svg className="w-12 h-12 text-rose-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Data</h3>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mt-8 mb-6">
          <div className="px-6 py-8">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-50 rounded-lg p-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">
                    {mode === 'single' ? 'Single Specialty Analysis' : 'Compare Specialties'}
                  </h1>
                  <p className="mt-2 text-gray-600 max-w-2xl">
                    {mode === 'single' 
                      ? 'Comprehensive analysis of compensation metrics and market positioning'
                      : 'Compare compensation metrics and market positioning between different specialties'
                    }
                  </p>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Calculator
              </Link>
            </div>
          </div>
        </div>

        {/* Mode Selection and Specialty Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-4">
            {/* Mode Selection Buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => {
                  setMode('single');
                  setSelectedSpecialties(prev => prev.slice(0, 1));
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'single'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Single Specialty
              </button>
              <button
                onClick={() => setMode('compare')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mode === 'compare'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Compare Specialties
              </button>
            </div>

            {/* Specialty Selection */}
            <div className="flex-1">
              <div className="relative">
                <select
                  value={selectedSpecialties[0] || ''}
                  onChange={(e) => {
                    const specialty = e.target.value;
                    setSelectedSpecialties(prev => {
                      if (!specialty) return prev.slice(1);
                      return [specialty, ...prev.slice(1)];
                    });
                  }}
                  className="block w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm appearance-none bg-white"
                >
                  <option value="">Select a specialty{mode === 'single' ? '' : ' (1)'}</option>
                  {marketData.map((data) => (
                    <option 
                      key={data.id} 
                      value={data.specialty}
                      disabled={mode === 'compare' && selectedSpecialties[1] === data.specialty}
                    >
                      {data.specialty}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Second Specialty - Only show in compare mode */}
            {mode === 'compare' && (
              <div className="flex-1">
                <div className="relative">
                  <select
                    value={selectedSpecialties[1] || ''}
                    onChange={(e) => {
                      const specialty = e.target.value;
                      setSelectedSpecialties(prev => {
                        if (!specialty) return prev.slice(0, 1);
                        return [prev[0], specialty];
                      });
                    }}
                    className="block w-full rounded-lg border border-gray-300 pl-3 pr-10 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 sm:text-sm appearance-none bg-white"
                  >
                    <option value="">Select a specialty (2)</option>
                    {marketData.map((data) => (
                      <option 
                        key={data.id} 
                        value={data.specialty}
                        disabled={selectedSpecialties[0] === data.specialty}
                      >
                        {data.specialty}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analysis View */}
        {mode === 'single' ? (
          selectedSpecialties[0] ? (
            <SpecialtyComparison
              specialties={[selectedSpecialties[0]]}
              marketData={marketData}
              selectedMetric={selectedMetric}
              formatValue={formatValue}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-gray-600">
                Please select a specialty to view its market analysis
              </p>
            </div>
          )
        ) : (
          selectedSpecialties.length === 2 ? (
            <SpecialtyComparisonView
              specialties={selectedSpecialties}
              marketData={marketData}
              selectedMetric={selectedMetric}
              formatValue={formatValue}
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <p className="text-gray-600">
                Please select two different specialties to compare their metrics
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
} 
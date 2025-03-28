'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface SurveyData {
  specialty: string;
  tcc?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface UploadedSurvey {
  id: string;
  vendor: string;
  year: string;
  data: SurveyData[];
}

export default function ViewSurveysPage() {
  const [surveys, setSurveys] = useState<UploadedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<UploadedSurvey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAggregated, setShowAggregated] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadSurveys = async () => {
      try {
        setLoading(true);
        // Fetch surveys from the API
        const response = await fetch('/api/surveys');
        if (!response.ok) {
          throw new Error('Failed to fetch surveys');
        }
        const dbSurveys = await response.json();
        
        // Transform the data into the expected format
        const transformedSurveys: UploadedSurvey[] = dbSurveys.map((survey: any) => {
          // Get all unique specialties from the survey data
          const specialties = Array.from(new Set(
            survey.data
              .map((row: any) => String(row.specialty || ''))
              .filter(Boolean)
          )) as string[];

          // Create the transformed survey data
          return {
            id: survey.id,
            vendor: survey.vendor,
            year: survey.year,
            data: specialties.map((specialty) => {
              // Find the row that matches this specialty
              const row = survey.data.find((r: any) => 
                String(r.specialty) === specialty
              );

              if (!row) return { specialty };

              // Transform the data using the database fields
              return {
                specialty,
                tcc: {
                  p25: row.tccP25 || 0,
                  p50: row.tccP50 || 0,
                  p75: row.tccP75 || 0,
                  p90: row.tccP90 || 0
                },
                wrvu: {
                  p25: row.wrvuP25 || 0,
                  p50: row.wrvuP50 || 0,
                  p75: row.wrvuP75 || 0,
                  p90: row.wrvuP90 || 0
                },
                cf: {
                  p25: row.cfP25 || 0,
                  p50: row.cfP50 || 0,
                  p75: row.cfP75 || 0,
                  p90: row.cfP90 || 0
                }
              };
            })
          };
        });

        setSurveys(transformedSurveys);
        
        // Get surveyId from URL parameter
        const surveyId = searchParams.get('surveyId');
        if (surveyId) {
          const selectedSurvey = transformedSurveys.find(s => s.id === surveyId);
          setSelectedSurvey(selectedSurvey || transformedSurveys[0]);
        } else if (transformedSurveys.length > 0) {
          setSelectedSurvey(transformedSurveys[0]);
        }
      } catch (error) {
        console.error('Error loading surveys:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSurveys();
  }, [searchParams]);

  const formatValue = (value: number | undefined, type: 'tcc' | 'wrvu' | 'cf'): string => {
    if (value === undefined) return 'N/A';
    
    if (type === 'tcc') {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      });
    } else if (type === 'wrvu') {
      return value.toLocaleString('en-US', {
        maximumFractionDigits: 2
      });
    } else {
      return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };

  const formatVendorName = (vendor: string): string => {
    const vendorMap: Record<string, string> = {
      'mgma': 'MGMA',
      'MGMA': 'MGMA',
      'sullivan': 'SullivanCotter',
      'sullivancotter': 'SullivanCotter',
      'SULLIVANCOTTER': 'SullivanCotter',
      'SULLIVAN': 'SullivanCotter',
      'SULLIVAN COTTER': 'SullivanCotter',
      'SULLIVAN-COTTER': 'SullivanCotter',
      'gallagher': 'Gallagher',
      'GALLAGHER': 'Gallagher'
    };
    return vendorMap[vendor.toLowerCase()] || vendor;
  };

  const aggregateData = (): SurveyData[] => {
    // Create a map to store aggregated values for each specialty
    const specialtyMap = new Map<string, {
      tcc: Array<{ sum: number, count: number }>,
      wrvu: Array<{ sum: number, count: number }>,
      cf: Array<{ sum: number, count: number }>
    }>();

    // Process each survey
    surveys.forEach(survey => {
      survey.data.forEach(item => {
        if (!specialtyMap.has(item.specialty)) {
          specialtyMap.set(item.specialty, {
            tcc: Array(4).fill(null).map(() => ({ sum: 0, count: 0 })),
            wrvu: Array(4).fill(null).map(() => ({ sum: 0, count: 0 })),
            cf: Array(4).fill(null).map(() => ({ sum: 0, count: 0 }))
          });
        }

        const specialtyData = specialtyMap.get(item.specialty)!;

        // Aggregate TCC data
        if (item.tcc) {
          const values = [item.tcc.p25, item.tcc.p50, item.tcc.p75, item.tcc.p90];
          values.forEach((value, index) => {
            if (value && value > 0) {
              specialtyData.tcc[index].sum += value;
              specialtyData.tcc[index].count += 1;
            }
          });
        }

        // Aggregate WRVU data
        if (item.wrvu) {
          const values = [item.wrvu.p25, item.wrvu.p50, item.wrvu.p75, item.wrvu.p90];
          values.forEach((value, index) => {
            if (value && value > 0) {
              specialtyData.wrvu[index].sum += value;
              specialtyData.wrvu[index].count += 1;
            }
          });
        }

        // Aggregate CF data
        if (item.cf) {
          const values = [item.cf.p25, item.cf.p50, item.cf.p75, item.cf.p90];
          values.forEach((value, index) => {
            if (value && value > 0) {
              specialtyData.cf[index].sum += value;
              specialtyData.cf[index].count += 1;
            }
          });
        }
      });
    });

    // Convert aggregated data back to SurveyData format
    return Array.from(specialtyMap.entries()).map(([specialty, data]) => ({
      specialty,
      tcc: {
        p25: data.tcc[0].count > 0 ? data.tcc[0].sum / data.tcc[0].count : 0,
        p50: data.tcc[1].count > 0 ? data.tcc[1].sum / data.tcc[1].count : 0,
        p75: data.tcc[2].count > 0 ? data.tcc[2].sum / data.tcc[2].count : 0,
        p90: data.tcc[3].count > 0 ? data.tcc[3].sum / data.tcc[3].count : 0
      },
      wrvu: {
        p25: data.wrvu[0].count > 0 ? data.wrvu[0].sum / data.wrvu[0].count : 0,
        p50: data.wrvu[1].count > 0 ? data.wrvu[1].sum / data.wrvu[1].count : 0,
        p75: data.wrvu[2].count > 0 ? data.wrvu[2].sum / data.wrvu[2].count : 0,
        p90: data.wrvu[3].count > 0 ? data.wrvu[3].sum / data.wrvu[3].count : 0
      },
      cf: {
        p25: data.cf[0].count > 0 ? data.cf[0].sum / data.cf[0].count : 0,
        p50: data.cf[1].count > 0 ? data.cf[1].sum / data.cf[1].count : 0,
        p75: data.cf[2].count > 0 ? data.cf[2].sum / data.cf[2].count : 0,
        p90: data.cf[3].count > 0 ? data.cf[3].sum / data.cf[3].count : 0
      }
    }));
  };

  const filteredData = showAggregated
    ? aggregateData().filter(item =>
        item.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : selectedSurvey?.data.filter(item =>
        item.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-blue-50 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Uploaded Surveys</h1>
                  <p className="mt-2 text-gray-600 max-w-2xl">
                    View and manage uploaded compensation survey data
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {!showAggregated && (
                  <select
                    value={selectedSurvey?.id || ''}
                    onChange={(e) => {
                      const survey = surveys.find(s => s.id === e.target.value);
                      setSelectedSurvey(survey || null);
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {surveys.map(survey => (
                      <option key={survey.id} value={survey.id}>
                        {formatVendorName(survey.vendor)}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => setShowAggregated(!showAggregated)}
                  className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                    showAggregated
                      ? 'border-blue-600 text-blue-600 bg-blue-50 hover:bg-blue-100'
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  {showAggregated ? 'Show Individual Surveys' : 'Show Aggregated Data'}
                </button>
                <Link
                  href="/survey-management"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Survey Management
                </Link>
              </div>
            </div>
          </div>
        </div>

        {selectedSurvey && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-600">
              Note: This is synthetic data generated for illustration purposes only and does not represent actual survey information.
            </p>
          </div>
        )}

        {/* Data Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="relative">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search specialty..."
                  className="block w-64 rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="min-h-[400px] relative">
                <LoadingScreen message="Loading survey data..." />
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        Specialty
                      </th>
                      <th colSpan={4} scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                        Total Cash Compensation
                      </th>
                      <th colSpan={4} scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                        Work RVUs
                      </th>
                      <th colSpan={4} scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                        Conversion Factor
                      </th>
                    </tr>
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">
                        &nbsp;
                      </th>
                      {['tcc', 'wrvu', 'cf'].flatMap((metricType) => 
                        ['25', '50', '75', '90'].map((percentile, index) => (
                          <th
                            key={`${metricType}-${percentile}`}
                            scope="col"
                            className={`px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider ${
                              index === 0 ? 'border-l' : ''
                            }`}
                          >
                            {percentile}th
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((item, index) => (
                      <tr key={item.specialty} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit">
                          {item.specialty}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{item.tcc ? formatValue(item.tcc.p25, 'tcc') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.tcc ? formatValue(item.tcc.p50, 'tcc') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.tcc ? formatValue(item.tcc.p75, 'tcc') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.tcc ? formatValue(item.tcc.p90, 'tcc') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{item.wrvu ? formatValue(item.wrvu.p25, 'wrvu') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.wrvu ? formatValue(item.wrvu.p50, 'wrvu') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.wrvu ? formatValue(item.wrvu.p75, 'wrvu') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.wrvu ? formatValue(item.wrvu.p90, 'wrvu') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{item.cf ? formatValue(item.cf.p25, 'cf') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.cf ? formatValue(item.cf.p50, 'cf') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.cf ? formatValue(item.cf.p75, 'cf') : 'N/A'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{item.cf ? formatValue(item.cf.p90, 'cf') : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredData.length === 0 && (
                  <div className="text-center py-12">
                    <h3 className="text-sm font-medium text-gray-900">No specialties found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm ? 'Try adjusting your search terms' : 'No specialties available in this survey'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
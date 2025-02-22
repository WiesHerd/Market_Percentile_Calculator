'use client';

import { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, ArrowPathIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSurveyContext, SurveyProvider } from '@/context/SurveyContext';
import { MappingState } from '@/types/mapping';

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

function ViewSurveysContent() {
  const [surveys, setSurveys] = useState<UploadedSurvey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<UploadedSurvey | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAggregated, setShowAggregated] = useState(false);
  const searchParams = useSearchParams();
  const { specialtyMappings } = useSurveyContext();

  useEffect(() => {
    const loadSurveys = () => {
      try {
        setLoading(true);
        const storedSurveys = localStorage.getItem('uploadedSurveys');
        if (storedSurveys) {
          const parsedSurveys = JSON.parse(storedSurveys);
          // Transform the data into the expected format
          const transformedSurveys: UploadedSurvey[] = parsedSurveys.map((survey: any) => {
            // Get all unique specialties from the survey data
            const specialties = Array.from(new Set(
              survey.data
                .map((row: any) => String(row[survey.mappings.specialty] || ''))
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
                  String(r[survey.mappings.specialty]) === specialty
                );

                if (!row) return { specialty };

                // Transform the data using the column mappings
                return {
                  specialty,
                  tcc: {
                    p25: parseFloat(String(row[survey.mappings.tcc.p25] || '0')),
                    p50: parseFloat(String(row[survey.mappings.tcc.p50] || '0')),
                    p75: parseFloat(String(row[survey.mappings.tcc.p75] || '0')),
                    p90: parseFloat(String(row[survey.mappings.tcc.p90] || '0'))
                  },
                  wrvu: {
                    p25: parseFloat(String(row[survey.mappings.wrvu.p25] || '0')),
                    p50: parseFloat(String(row[survey.mappings.wrvu.p50] || '0')),
                    p75: parseFloat(String(row[survey.mappings.wrvu.p75] || '0')),
                    p90: parseFloat(String(row[survey.mappings.wrvu.p90] || '0'))
                  },
                  cf: {
                    p25: parseFloat(String(row[survey.mappings.cf.p25] || '0')),
                    p50: parseFloat(String(row[survey.mappings.cf.p50] || '0')),
                    p75: parseFloat(String(row[survey.mappings.cf.p75] || '0')),
                    p90: parseFloat(String(row[survey.mappings.cf.p90] || '0'))
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

  const aggregateSurveys = (): SurveyData[] => {
    // Get all unique specialties across all surveys
    const allSpecialties = new Set<string>();
    surveys.forEach(survey => {
      survey.data.forEach(item => {
        allSpecialties.add(item.specialty);
      });
    });

    return Array.from(allSpecialties).map(specialty => {
      // Find this specialty in all surveys
      const specialtyData = surveys.flatMap(survey =>
        survey.data.filter(item => item.specialty === specialty)
      );

      // Calculate averages for each metric and percentile
      const aggregated: SurveyData = {
        specialty,
        tcc: {
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0
        },
        wrvu: {
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0
        },
        cf: {
          p25: 0,
          p50: 0,
          p75: 0,
          p90: 0
        }
      };

      ['tcc', 'wrvu', 'cf'].forEach((metric) => {
        ['p25', 'p50', 'p75', 'p90'].forEach((percentile) => {
          const values = specialtyData
            .map(d => {
              const metricData = d[metric as keyof SurveyData];
              return metricData && typeof metricData === 'object' ? 
                (metricData as Record<string, number>)[percentile] : 
                undefined;
            })
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));
          
          if (values.length > 0) {
            const avg = values.reduce((a, b) => a + b, 0) / values.length;
            const metricObj = aggregated[metric as keyof SurveyData];
            if (metricObj && typeof metricObj === 'object') {
              (metricObj as Record<string, number>)[percentile] = avg;
            }
          }
        });
      });

      return aggregated;
    });
  };

  const filteredData = showAggregated 
    ? aggregateSurveys().filter(item =>
        item.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : (selectedSurvey?.data.filter(item =>
        item.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      ) || []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-8">
        <div className="pt-8 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Uploaded Surveys</h1>
            <p className="mt-2 text-lg text-gray-600">
              View and manage uploaded compensation survey data
            </p>
          </div>
          <div className="flex gap-4">
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
              <ChartBarIcon className="h-4 w-4 mr-2" />
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

        {selectedSurvey && !showAggregated && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-center">
            <p className="text-sm text-gray-600">
              Note: This is synthetic data generated for illustration purposes only and does not represent actual survey information.
            </p>
          </div>
        )}

        {showAggregated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
              <p className="text-sm text-blue-700">
                Showing averaged data across all surveys. Values represent the mean of each percentile across all available surveys.
              </p>
            </div>
          </div>
        )}

        {/* Data Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="max-w-xs w-full">
                <label htmlFor="search" className="sr-only">Search specialties</label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search specialty..."
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading survey data...</span>
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
                          <Link 
                            href={`/survey-analytics?specialty=${encodeURIComponent(
                              // Find parent specialty or use current if no mapping exists
                              Object.entries(specialtyMappings).find(([parent, mapping]) => 
                                mapping.mappedSpecialties.includes(item.specialty) || parent === item.specialty
                              )?.[0] || item.specialty
                            )}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {item.specialty}
                          </Link>
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

export default function ViewSurveysPage() {
  return (
    <SurveyProvider>
      <ViewSurveysContent />
    </SurveyProvider>
  );
} 
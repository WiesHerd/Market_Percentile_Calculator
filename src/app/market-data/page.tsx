'use client';

import { useState, useEffect } from 'react';
import { MarketData, DataSourceType } from '@/types/market-data';
import { ArrowUpTrayIcon, ArrowPathIcon, InformationCircleIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function MarketDataPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  const loadMarketIntelligenceData = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
      
      try {
        // First try to load CSV
        const csvResponse = await fetch(`${basePath}/data/market-reference-data.csv`);
        const csvText = await csvResponse.text();
        
        const Papa = (await import('papaparse')).default;
        const parsedData: MarketData[] = [];
        
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            results.data.forEach((row: any, index: number) => {
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
                p90_cf: parseFloat(row.p90_cf || '0'),
                source: {
                  type: 'market_intelligence' as DataSourceType,
                  name: 'Market Intelligence Data',
                  timestamp: new Date().toISOString(),
                  version: '1.0'
                }
              };
              parsedData.push(newData);
            });
          }
        });
        return parsedData;
      } catch (csvError) {
        // If CSV fails, try JSON
        const response = await fetch(`${basePath}/data/market-data.json`);
        if (!response.ok) {
          throw new Error(`Failed to load market data: ${response.statusText}`);
        }
        const data = await response.json();
        return data.map((item: MarketData) => ({
          ...item,
          source: {
            type: 'market_intelligence' as DataSourceType,
            name: 'Market Intelligence Data',
            timestamp: new Date().toISOString(),
            version: '1.0'
          }
        }));
      }
    } catch (err) {
      throw new Error('Failed to load market intelligence data');
    }
  };

  const loadAggregatedSurveyData = () => {
    const uploadedSurveys = localStorage.getItem('uploadedSurveys');
    if (!uploadedSurveys) return [];

    try {
      const surveys = JSON.parse(uploadedSurveys);
      const aggregatedData = new Map<string, {
        specialty: string;
        totals: number[];
        wrvus: number[];
        cfs: number[];
        dataPoints: number;
      }>();

      // Aggregate data from all surveys
      surveys.forEach((survey: any) => {
        survey.data.forEach((row: any) => {
          const specialty = row.specialty?.trim();
          if (!specialty) return;

          if (!aggregatedData.has(specialty)) {
            aggregatedData.set(specialty, {
              specialty,
              totals: [],
              wrvus: [],
              cfs: [],
              dataPoints: 0
            });
          }

          const specialtyData = aggregatedData.get(specialty)!;
          
          // Add values if they exist and are valid numbers
          if (!isNaN(row.total)) specialtyData.totals.push(Number(row.total));
          if (!isNaN(row.wrvu)) specialtyData.wrvus.push(Number(row.wrvu));
          if (!isNaN(row.cf)) specialtyData.cfs.push(Number(row.cf));
          specialtyData.dataPoints++;
        });
      });

      // Convert aggregated data to MarketData format
      return Array.from(aggregatedData.values()).map(data => {
        const calculatePercentiles = (values: number[]) => {
          if (values.length === 0) return { p25: 0, p50: 0, p75: 0, p90: 0 };
          values.sort((a, b) => a - b);
          return {
            p25: values[Math.floor(values.length * 0.25)] || 0,
            p50: values[Math.floor(values.length * 0.50)] || 0,
            p75: values[Math.floor(values.length * 0.75)] || 0,
            p90: values[Math.floor(values.length * 0.90)] || 0
          };
        };

        const totals = calculatePercentiles(data.totals);
        const wrvus = calculatePercentiles(data.wrvus);
        const cfs = calculatePercentiles(data.cfs);

        const marketData: MarketData = {
          id: `aggregated_${data.specialty}`,
          specialty: data.specialty,
          p25_total: totals.p25,
          p50_total: totals.p50,
          p75_total: totals.p75,
          p90_total: totals.p90,
          p25_wrvu: wrvus.p25,
          p50_wrvu: wrvus.p50,
          p75_wrvu: wrvus.p75,
          p90_wrvu: wrvus.p90,
          p25_cf: cfs.p25,
          p50_cf: cfs.p50,
          p75_cf: cfs.p75,
          p90_cf: cfs.p90,
          source: {
            type: 'aggregated_survey' as DataSourceType,
            name: 'Aggregated Survey Data',
            timestamp: new Date().toISOString()
          },
          dataPoints: data.dataPoints,
          confidence: Math.min(100, (data.dataPoints / 10) * 100) // Simple confidence calculation
        };

        return marketData;
      });
    } catch (err) {
      console.error('Error loading aggregated survey data:', err);
      return [];
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await loadMarketIntelligenceData();

      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No valid market data available');
      }

      setMarketData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load market data. Please try again later.');
      console.error('Error loading market data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setIsProcessing(false);
      return;
    }

    try {
      const text = await file.text();
      const Papa = (await import('papaparse')).default;
      
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const processedData: MarketData[] = [];
          let rowErrors: string[] = [];
          
          results.data.forEach((row: any, index: number) => {
            const specialty = row.specialty?.trim();
            if (!specialty) {
              rowErrors.push(`Row ${index + 1}: Missing specialty`);
              return;
            }

            try {
              const newData: MarketData = {
                id: `uploaded_${index}`,
                specialty,
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
                p90_cf: parseFloat(row.p90_cf || '0'),
                source: {
                  type: 'survey' as DataSourceType,
                  name: file.name,
                  timestamp: new Date().toISOString()
                }
              };

              // Validate the data
              const hasValidData = 
                !isNaN(newData.p25_total) && !isNaN(newData.p50_total) && 
                !isNaN(newData.p75_total) && !isNaN(newData.p90_total) &&
                !isNaN(newData.p25_wrvu) && !isNaN(newData.p50_wrvu) &&
                !isNaN(newData.p75_wrvu) && !isNaN(newData.p90_wrvu) &&
                !isNaN(newData.p25_cf) && !isNaN(newData.p50_cf) &&
                !isNaN(newData.p75_cf) && !isNaN(newData.p90_cf);

              if (hasValidData) {
                processedData.push(newData);
              } else {
                rowErrors.push(`Row ${index + 1}: Invalid data format`);
              }
            } catch (err) {
              rowErrors.push(`Row ${index + 1}: Error processing data`);
            }
          });

          if (rowErrors.length > 0) {
            setError(`Errors found in CSV:\n${rowErrors.join('\n')}`);
          }

          if (processedData.length > 0) {
            // Save to local storage
            localStorage.setItem('uploadedMarketData', JSON.stringify(processedData));
            setMarketData(processedData);
            // Switch to aggregated survey view
            setShowGuide(true);
          } else {
            setError('No valid data found in the CSV file');
          }
          setIsProcessing(false);
        },
        error: (error: any) => {
          setError(`Error parsing file: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } catch (err) {
      setError(`Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const formatValue = (value: number, type: 'total' | 'wrvu' | 'cf'): string => {
    if (type === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (type === 'total') {
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

  const filteredData = marketData.filter(row => 
    row.specialty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const downloadSampleCSV = () => {
    const headers = 'specialty,p25_TCC,p50_TCC,p75_TCC,p90_TCC,p25_wrvu,p50_wrvu,p75_wrvu,p90_wrvu,p25_cf,p50_cf,p75_cf,p90_cf\n';
    const sampleData = 'Family Medicine,220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25\n';
    const blob = new Blob([headers + sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'market_data_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto px-8">
        <div className="pt-8 pb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Market Data</h1>
            <p className="mt-2 text-lg text-gray-600">View and manage provider compensation data across specialties</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => loadData()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowGuide(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              View Guide
            </button>
            <button
              onClick={() => window.location.href = "/calculator"}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Calculator
            </button>
          </div>
        </div>

        {/* Data Disclosure Banner */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Data Disclosure</h3>
              <div className="mt-1 text-sm text-yellow-700">
                Please note that the preloaded market data is synthetic and for demonstration purposes only. 
                It does not represent actual survey trends or market benchmarks. 
                For accurate market data, please upload your own validated compensation survey data.
              </div>
            </div>
          </div>
        </div>

        {/* Market Data Table Section */}
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
                    <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                  loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}>
                  <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                  Upload CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>

            {showGuide && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">CSV Upload Guide</h3>
                <p className="text-sm text-gray-600 mb-3">
                  To upload your own market data, please ensure your CSV file follows this format:
                </p>
                <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                  <code className="text-xs text-gray-600">
                    specialty,p25_TCC,p50_TCC,p75_TCC,p90_TCC,p25_wrvu,p50_wrvu,p75_wrvu,p90_wrvu,p25_cf,p50_cf,p75_cf,p90_cf
                  </code>
                </div>
                <button
                  onClick={downloadSampleCSV}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowUpTrayIcon className="h-3 w-3 mr-1.5" />
                  Download Sample CSV
                </button>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading market data...</span>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Processing uploaded data...</span>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg text-red-700 text-sm whitespace-pre-line">
                {error}
              </div>
            )}

            {/* Data Table */}
            {!loading && !isProcessing && filteredData.length > 0 && (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 w-[200px]">
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
                      {['total', 'wrvu', 'cf'].flatMap((metricType) => 
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
                    {filteredData.map((row, index) => (
                      <tr key={row.specialty} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit">
                          {row.specialty}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{formatValue(row.p25_total, 'total')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p50_total, 'total')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p75_total, 'total')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p90_total, 'total')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{formatValue(row.p25_wrvu, 'wrvu')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p50_wrvu, 'wrvu')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p75_wrvu, 'wrvu')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p90_wrvu, 'wrvu')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900 border-l">{formatValue(row.p25_cf, 'cf')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p50_cf, 'cf')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p75_cf, 'cf')}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">{formatValue(row.p90_cf, 'cf')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && !isProcessing && filteredData.length === 0 && (
              <div className="text-center py-12">
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No market data available</h3>
                <p className="mt-1 text-sm text-gray-500">Upload a CSV file to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
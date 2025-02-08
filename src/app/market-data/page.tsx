'use client';

import { useState, useEffect } from 'react';
import { MarketData } from '@/types/logs';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function MarketDataPage() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadMarketData = async () => {
      try {
        setLoading(true);
        // Load from local storage first
        const storedData = localStorage.getItem('uploadedMarketData');
        let data: MarketData[] = storedData ? JSON.parse(storedData) : [];
        
        // If no stored data, fetch from CSV
        if (data.length === 0) {
          try {
            // First try to load the CSV file
            const csvResponse = await fetch('/Market_Percentile_Calculator/data/market-reference-data.csv');
            const csvText = await csvResponse.text();
            
            const Papa = (await import('papaparse')).default;
            const parsedData: MarketData[] = [];
            
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              complete: (results) => {
                results.data.forEach((row: any, index: number) => {
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
            data = parsedData;
          } catch (csvError) {
            // If CSV loading fails, fall back to JSON
            const response = await fetch('/Market_Percentile_Calculator/data/market-data.json');
            data = await response.json();
          }
        }
        
        setMarketData(data);
        setError(null);
      } catch (err) {
        setError('Failed to load market data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadMarketData();
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
                p90_cf: parseFloat(row.p90_cf || '0')
              };

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
          } else {
            setError((prev) => prev ? `${prev}\nNo valid data found in the CSV file` : 'No valid data found in the CSV file');
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Market Data</h1>
            <p className="mt-2 text-lg text-gray-600">View and manage compensation data across specialties</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Calculator
          </Link>
        </div>

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

              <label className={`inline-flex items-center px-4 py-2 ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
              } text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}>
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
                            } w-[${metricType === 'total' ? '85' : '65'}px]`}
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
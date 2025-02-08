'use client';



import { useState, useEffect, useMemo } from 'react';
import { MarketData, MetricType, MarketDataPercentileKey, CalculationHistory } from '@/types/logs';
import { CalculatorIcon, XMarkIcon, ArrowUpTrayIcon, TableCellsIcon, DocumentArrowUpIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PercentileGraph } from './PercentileGraph';
import { CalculationHistoryView } from './CalculationHistory';
import Papa from 'papaparse';
import Link from 'next/link';

interface UploadedData {
  specialty: string;
  value: number;
  metric: MetricType;
  percentileType: 'p25' | 'p50' | 'p75' | 'p90';
}

interface ParseError {
  message: string;
}

export default function PercentileCalculator() {
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('total');
  const [inputValue, setInputValue] = useState<string>('');
  const [calculatedPercentile, setCalculatedPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<UploadedData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDataTable, setShowDataTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [physicianName, setPhysicianName] = useState('');
  const [notes, setNotes] = useState('');
  const [calculationHistory, setCalculationHistory] = useState<CalculationHistory[]>([]);

  // Load market data and calculation history on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load market data
        const storedData = localStorage.getItem('uploadedMarketData');
        let data: MarketData[] = storedData ? JSON.parse(storedData) : [];
        
        if (data.length === 0) {
          try {
            // First try to load the CSV file
            const csvResponse = await fetch('/Market_Percentile_Calculator/data/market-reference-data.csv');
            const csvText = await csvResponse.text();
            
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
            const jsonResponse = await fetch('/Market_Percentile_Calculator/data/market-data.json');
            data = await jsonResponse.json();
          }
        }
        
        setMarketData(data);

        // Load calculation history
        const storedHistory = localStorage.getItem('calculationHistory');
        if (storedHistory) {
          setCalculationHistory(JSON.parse(storedHistory));
        }

        setError(null);
      } catch (err) {
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (selectedMetric !== 'wrvu') {
      value = value.replace(/[^0-9.]/g, '');
      if (value) {
        const number = parseFloat(value);
        if (!isNaN(number)) {
          value = number.toLocaleString('en-US', { maximumFractionDigits: 2 });
        }
      }
    } else {
      value = value.replace(/[^0-9.]/g, '');
    }
    setInputValue(value);
  };

  const handleInputBlur = () => {
    if (!inputValue) return;
    
    const number = parseFloat(inputValue.replace(/,/g, ''));
    if (isNaN(number)) return;

    if (selectedMetric !== 'wrvu') {
      setInputValue(number.toLocaleString('en-US', { maximumFractionDigits: 2 }));
    } else {
      setInputValue(number.toString());
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset states
    setIsProcessing(true);
    setError(null);
    setUploadedData([]);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      setIsProcessing(false);
      return;
    }

    try {
      const text = await file.text();
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

          if (processedData.length === 0) {
            setError((prev) => prev ? `${prev}\nNo valid data found in the CSV file` : 'No valid data found in the CSV file');
          } else {
            // Merge the uploaded data with existing market data
            const mergedData = [...marketData];
            
            processedData.forEach(newData => {
              const existingIndex = mergedData.findIndex(d => d.specialty === newData.specialty);
              if (existingIndex !== -1) {
                mergedData[existingIndex] = newData;
              } else {
                mergedData.push(newData);
              }
            });

            setMarketData(mergedData);
            setShowDataTable(true);
          }
          setIsProcessing(false);
        },
        error: (error: ParseError) => {
          setError(`Error parsing file: ${error.message}`);
          setIsProcessing(false);
        }
      });
    } catch (err) {
      setError(`Error reading file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const calculatePercentile = () => {
    if (!selectedSpecialty || !inputValue || !physicianName) {
      setError('Please fill in all required fields');
      return;
    }

    const specialtyData = marketData.find(d => d.specialty === selectedSpecialty);
    if (!specialtyData) {
      setError('Specialty data not found');
      return;
    }

    const cleanValue = inputValue.replace(/[^0-9.]/g, '');
    const value = parseFloat(cleanValue);
    
    if (isNaN(value)) {
      setError('Please enter a valid number');
      return;
    }

    const p25 = specialtyData[`p25_${selectedMetric}` as keyof MarketData] as number;
    const p50 = specialtyData[`p50_${selectedMetric}` as keyof MarketData] as number;
    const p75 = specialtyData[`p75_${selectedMetric}` as keyof MarketData] as number;
    const p90 = specialtyData[`p90_${selectedMetric}` as keyof MarketData] as number;

    let percentile: number;

    if (value <= p25) {
      percentile = (value / p25) * 25;
    } else if (value <= p50) {
      percentile = 25 + ((value - p25) / (p50 - p25)) * 25;
    } else if (value <= p75) {
      percentile = 50 + ((value - p50) / (p75 - p50)) * 25;
    } else if (value <= p90) {
      percentile = 75 + ((value - p75) / (p90 - p75)) * 15;
    } else {
      percentile = 90 + ((value - p90) / p90) * 10;
    }

    percentile = Math.min(100, Math.max(0, percentile));
    
    // Save calculation to history
    const newCalculation: CalculationHistory = {
      id: Date.now().toString(),
      physicianName,
      specialty: selectedSpecialty,
      metric: selectedMetric,
      value,
      percentile,
      timestamp: new Date().toISOString(),
      notes: notes.trim() || undefined
    };

    const updatedHistory = [newCalculation, ...calculationHistory];
    setCalculationHistory(updatedHistory);
    localStorage.setItem('calculationHistory', JSON.stringify(updatedHistory));
    
    setCalculatedPercentile(percentile);
    setError(null);
  };

  const clearInputs = () => {
    setSelectedSpecialty('');
    setSelectedMetric('total');
    setInputValue('');
    setCalculatedPercentile(null);
    setPhysicianName('');
    setNotes('');
    setError(null);
  };

  const deleteCalculation = (id: string) => {
    const updatedHistory = calculationHistory.filter(calc => calc.id !== id);
    setCalculationHistory(updatedHistory);
    localStorage.setItem('calculationHistory', JSON.stringify(updatedHistory));
  };

  const formatValue = (value: string | number, metric: MetricType = selectedMetric): string => {
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
    
    if (isNaN(numValue)) return '-';

    if (metric === 'wrvu') {
      return numValue.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (metric === 'total') {
      return numValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      });
    } else {
      return numValue.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
      });
    }
  };

  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case 'total':
        return 'Total Cash Compensation';
      case 'wrvu':
        return 'Work RVUs';
      case 'cf':
        return 'Conversion Factor';
      default:
        return '';
    }
  };

  const calculatePercentileForData = (data: UploadedData): number | null => {
    const specialtyData = marketData.find(d => d.specialty === data.specialty);
    if (!specialtyData) return null;

    const p25Key = `p25_${data.metric}` as MarketDataPercentileKey;
    const p50Key = `p50_${data.metric}` as MarketDataPercentileKey;
    const p75Key = `p75_${data.metric}` as MarketDataPercentileKey;
    const p90Key = `p90_${data.metric}` as MarketDataPercentileKey;

    const p25 = Number(specialtyData[p25Key]);
    const p50 = Number(specialtyData[p50Key]);
    const p75 = Number(specialtyData[p75Key]);
    const p90 = Number(specialtyData[p90Key]);

    if (isNaN(p25) || isNaN(p50) || isNaN(p75) || isNaN(p90)) return null;

    const value = data.value;
    let percentile: number;

    if (value <= p25) {
      percentile = (value / p25) * 25;
    } else if (value <= p50) {
      percentile = 25 + ((value - p25) / (p50 - p25)) * 25;
    } else if (value <= p75) {
      percentile = 50 + ((value - p50) / (p75 - p50)) * 25;
    } else if (value <= p90) {
      percentile = 75 + ((value - p75) / (p90 - p75)) * 15;
    } else {
      percentile = 90 + ((value - p90) / p90) * 10;
    }

    return Math.min(100, Math.max(0, percentile));
  };

  // Add a function to organize data by specialty
  const organizeDataBySpecialty = (data: UploadedData[]) => {
    const organized = new Map<string, {
      specialty: string;
      tcc: { [key: string]: number };
      wrvu: { [key: string]: number };
      cf: { [key: string]: number };
    }>();

    data.forEach(item => {
      if (!organized.has(item.specialty)) {
        organized.set(item.specialty, {
          specialty: item.specialty,
          tcc: {},
          wrvu: {},
          cf: {}
        });
      }

      const specialtyData = organized.get(item.specialty)!;
      switch (item.metric) {
        case 'total':
          specialtyData.tcc[item.percentileType] = item.value;
          break;
        case 'wrvu':
          specialtyData.wrvu[item.percentileType] = item.value;
          break;
        case 'cf':
          specialtyData.cf[item.percentileType] = item.value;
          break;
      }
    });

    return Array.from(organized.values());
  };

  // Add a function to format values based on metric type
  const formatTableValue = (value: number | undefined, metric: 'tcc' | 'wrvu' | 'cf'): string => {
    if (value === undefined) return '-';
    
    if (metric === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    } else if (metric === 'tcc') {
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

  // Update the filteredSpecialties to use marketData instead of uploadedData
  const filteredSpecialties = useMemo(() => {
    if (!searchTerm.trim()) return marketData;
    return marketData.filter(row => 
      row.specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [marketData, searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Physician Compensation Calculator</h1>
          <p className="mt-2 text-lg text-gray-600">Calculate and analyze physician compensation percentiles across specialties</p>
        </div>

        <div className="space-y-6">
          {/* Input Card */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Calculate Percentile</h2>
                <Link
                  href="/market-data"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <TableCellsIcon className="w-4 h-4 mr-2" />
                  View Market Data
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Physician Name */}
                <div className="space-y-1.5">
                  <label htmlFor="physicianName" className="block text-sm font-medium text-gray-700">
                    Physician Name
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <input
                    type="text"
                    id="physicianName"
                    value={physicianName}
                    onChange={(e) => setPhysicianName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                    placeholder="Enter physician name"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <input
                    type="text"
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Specialty Select */}
                <div className="space-y-1.5">
                  <label htmlFor="specialty" className="block text-sm font-medium text-gray-700">
                    Specialty
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="specialty"
                      value={selectedSpecialty}
                      onChange={(e) => {
                        setSelectedSpecialty(e.target.value);
                        setCalculatedPercentile(null);
                      }}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm appearance-none"
                    >
                      <option value="">Select a specialty</option>
                      {marketData.map((data) => (
                        <option key={data.id} value={data.specialty}>
                          {data.specialty}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Metric Select */}
                <div className="space-y-1.5">
                  <label htmlFor="metric" className="block text-sm font-medium text-gray-700">
                    Metric
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="metric"
                      value={selectedMetric}
                      onChange={(e) => {
                        setSelectedMetric(e.target.value as MetricType);
                        setCalculatedPercentile(null);
                      }}
                      className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm appearance-none"
                    >
                      <option value="total">Total Cash Compensation</option>
                      <option value="wrvu">Work RVUs</option>
                      <option value="cf">Conversion Factor</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Value Input */}
                <div className="space-y-1.5">
                  <label htmlFor="value" className="block text-sm font-medium text-gray-700">
                    Value
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  <div className="relative rounded-lg shadow-sm">
                    {selectedMetric !== 'wrvu' && (
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                    )}
                    <input
                      type="text"
                      id="value"
                      value={inputValue}
                      onChange={handleInputChange}
                      onBlur={handleInputBlur}
                      className={`block w-full rounded-lg border border-gray-300 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm ${
                        selectedMetric !== 'wrvu' ? 'pl-7' : 'pl-3'
                      }`}
                      placeholder={selectedMetric === 'wrvu' ? 'Enter RVUs' : 'Enter value'}
                    />
                  </div>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={clearInputs}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={calculatePercentile}
                  disabled={!selectedSpecialty || !selectedMetric || !inputValue || !physicianName}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CalculatorIcon className="w-4 h-4 mr-2" />
                  Calculate Percentile
                </button>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Results Section */}
          {calculatedPercentile !== null && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Results</h2>
                
                {/* Results Message */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-blue-900">
                    {physicianName}'s {getMetricLabel(selectedMetric)} of {formatValue(inputValue)} for {selectedSpecialty} is at the{' '}
                    <span className="font-semibold">{calculatedPercentile.toFixed(1)}th</span> percentile.
                  </p>
                </div>

                {/* Graph */}
                <PercentileGraph
                  marketData={marketData}
                  selectedSpecialty={selectedSpecialty}
                  selectedMetric={selectedMetric}
                  inputValue={inputValue}
                  calculatedPercentile={calculatedPercentile}
                  formatValue={formatValue}
                  getMetricLabel={getMetricLabel}
                />
              </div>
            </div>
          )}

          {/* Calculation History */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Calculation History</h2>
                <button
                  onClick={() => setCalculationHistory([])}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Clear History
                </button>
              </div>
              <CalculationHistoryView
                history={calculationHistory}
                onDelete={deleteCalculation}
                formatValue={formatValue}
                getMetricLabel={getMetricLabel}
                marketData={marketData}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
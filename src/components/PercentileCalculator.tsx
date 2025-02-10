'use client';



import { useState, useEffect, useMemo } from 'react';
import { MarketData, MetricType, MarketDataPercentileKey, CalculationHistory } from '@/types/logs';
import { CalculatorIcon, XMarkIcon, ArrowUpTrayIcon, TableCellsIcon, DocumentArrowUpIcon, TrashIcon, DocumentTextIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PercentileGraph } from './PercentileGraph';
import { CalculationHistoryView } from './CalculationHistory';
import Papa from 'papaparse';
import Link from 'next/link';
import Image from 'next/image';
import { performComplianceChecks, createAuditLog, getFairMarketValue, formatComplianceMessage } from '@/utils/compliance';
import { ComplianceInfo } from './ComplianceInfo';

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
  const [physicianName, setPhysicianName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [calculationHistory, setCalculationHistory] = useState<CalculationHistory[]>([]);
  const [showInitialChoice, setShowInitialChoice] = useState(true);
  const [hasUserMadeChoice, setHasUserMadeChoice] = useState(false);
  const [showTemplateGuide, setShowTemplateGuide] = useState(false);
  const [fte, setFte] = useState('1.0');

  // Load initial values from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSelectedSpecialty(localStorage.getItem('selectedSpecialty') || '');
      setSelectedMetric((localStorage.getItem('selectedMetric') as MetricType) || 'total');
      setInputValue(localStorage.getItem('inputValue') || '');
      setPhysicianName(localStorage.getItem('physicianName') || '');
      setNotes(localStorage.getItem('notes') || '');
      
      const savedPercentile = localStorage.getItem('calculatedPercentile');
      if (savedPercentile) {
        setCalculatedPercentile(parseFloat(savedPercentile));
      }
      
      const savedHistory = localStorage.getItem('calculationHistory');
      if (savedHistory) {
        setCalculationHistory(JSON.parse(savedHistory));
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('selectedSpecialty', selectedSpecialty);
  }, [selectedSpecialty]);

  useEffect(() => {
    localStorage.setItem('selectedMetric', selectedMetric);
  }, [selectedMetric]);

  useEffect(() => {
    localStorage.setItem('inputValue', inputValue);
  }, [inputValue]);

  useEffect(() => {
    if (calculatedPercentile !== null) {
      localStorage.setItem('calculatedPercentile', calculatedPercentile.toString());
    } else {
      localStorage.removeItem('calculatedPercentile');
    }
  }, [calculatedPercentile]);

  useEffect(() => {
    localStorage.setItem('physicianName', physicianName);
  }, [physicianName]);

  useEffect(() => {
    localStorage.setItem('notes', notes);
  }, [notes]);

  const handleUsePreloadedData = () => {
    localStorage.setItem('dataChoiceMade', 'true');
    setShowInitialChoice(false);
    setHasUserMadeChoice(true);
    loadData();
  };

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

  const handleInitialFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

          if (processedData.length > 0) {
            localStorage.setItem('uploadedMarketData', JSON.stringify(processedData));
            localStorage.setItem('dataChoiceMade', 'true');
            setMarketData(processedData);
            setShowInitialChoice(false);
            setHasUserMadeChoice(true);
          } else {
            setError('No valid data found in the CSV file');
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

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const choiceMade = localStorage.getItem('dataChoiceMade');
      if (!choiceMade) {
        setShowInitialChoice(true);
        setLoading(false);
        return;
      }

      const storedData = localStorage.getItem('uploadedMarketData');
      let data: MarketData[] = storedData ? JSON.parse(storedData) : [];
      
      if (data.length === 0) {
        try {
          const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
          const csvResponse = await fetch(`${basePath}/data/market-reference-data.csv`);
          if (!csvResponse.ok) {
            throw new Error(`Failed to fetch CSV data: ${csvResponse.statusText}`);
          }
          const csvText = await csvResponse.text();
          
          const Papa = (await import('papaparse')).default;
          const parsedData: MarketData[] = [];
          
          await new Promise<void>((resolve) => {
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
                    p90_cf: parseFloat(row.p90_cf || '0')
                  };
                  parsedData.push(newData);
                });
                data = parsedData;
                resolve();
              },
              error: (error: ParseError) => {
                throw new Error(`Failed to parse CSV: ${error.message}`);
              }
            });
          });
        } catch (csvError) {
          console.warn('Failed to load CSV, falling back to JSON:', csvError);
          const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
          const jsonResponse = await fetch(`${basePath}/data/market-data.json`);
          if (!jsonResponse.ok) {
            throw new Error(`Failed to fetch JSON data: ${jsonResponse.statusText}`);
          }
          data = await jsonResponse.json();
        }
      }
      
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
    let value = parseFloat(cleanValue);
    const fteValue = parseFloat(fte);
    
    if (isNaN(value) || isNaN(fteValue)) {
      setError('Please enter valid numbers');
      return;
    }

    // Normalize the value to 1.0 FTE if it's TCC or wRVU
    if (selectedMetric === 'total' || selectedMetric === 'wrvu') {
      if (fteValue > 0 && fteValue < 1.0) {
        value = value / fteValue; // Normalize to 1.0 FTE equivalent
      }
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

    // Store both actual and normalized values for history
    const actualValue = parseFloat(cleanValue);
    const normalizedValue = value;

    // Perform compliance checks with normalized value
    const complianceChecks = performComplianceChecks(
      selectedSpecialty,
      selectedMetric,
      normalizedValue,
      percentile,
      marketData
    );

    // Get Fair Market Value data if available
    const fairMarketValue = getFairMarketValue(selectedSpecialty);

    // Create audit log with both actual and normalized values
    const auditLog = createAuditLog('calculation', {
      specialty: selectedSpecialty,
      metric: selectedMetric,
      actualValue,
      normalizedValue,
      fte: fteValue,
      percentile,
      complianceFlags: complianceChecks,
      fairMarketValue,
    });
    
    // Save calculation to history with both values
    const newCalculation: CalculationHistory = {
      id: Date.now().toString(),
      physicianName,
      specialty: selectedSpecialty,
      metric: selectedMetric,
      value: normalizedValue,
      actualValue,
      normalizedValue,
      fte: fteValue,
      percentile,
      timestamp: new Date().toISOString(),
      notes: notes || undefined,
      complianceChecks,
      fairMarketValue,
      auditId: auditLog.id
    };

    const updatedHistory = [newCalculation, ...calculationHistory];
    setCalculationHistory(updatedHistory);
    localStorage.setItem('calculationHistory', JSON.stringify(updatedHistory));
    setCalculatedPercentile(percentile);

    // Show compliance alerts if any
    if (complianceChecks.length > 0) {
      const messages = complianceChecks.map(formatComplianceMessage);
      messages.forEach(message => {
        // You can implement a toast or alert system here
        console.log(`${message.title}: ${message.description} (${message.severity})`);
      });
    }
  };

  const clearInputs = () => {
    setSelectedSpecialty('');
    setSelectedMetric('total');
    setInputValue('');
    setCalculatedPercentile(null);
    setPhysicianName('');
    setNotes('');
    setError(null);
    
    // Clear related localStorage items
    localStorage.removeItem('selectedSpecialty');
    localStorage.removeItem('selectedMetric');
    localStorage.removeItem('inputValue');
    localStorage.removeItem('calculatedPercentile');
    localStorage.removeItem('physicianName');
    localStorage.removeItem('notes');
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

  const clearAllData = () => {
    // Clear all states
    clearInputs();
    setCalculationHistory([]);
    setMarketData([]);
    
    // Clear all localStorage
    localStorage.clear();
    
    // Reload the page to reset the app to its initial state
    window.location.reload();
  };

  const handleSaveToHistory = () => {
    if (calculatedPercentile === null || !marketData || !inputValue) return;
    
    const cleanValue = inputValue.replace(/[^0-9.]/g, '');
    const actualValue = parseFloat(cleanValue);
    const fteValue = parseFloat(fte);
    let normalizedValue = actualValue;
    
    // Normalize the value to 1.0 FTE if it's TCC or wRVU
    if ((selectedMetric === 'total' || selectedMetric === 'wrvu') && fteValue > 0 && fteValue < 1.0) {
      normalizedValue = actualValue / fteValue;
    }
    
    const newHistoryItem: CalculationHistory = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      physicianName: physicianName || 'Unknown',
      specialty: selectedSpecialty || 'Unknown',
      metric: selectedMetric,
      value: normalizedValue,
      actualValue: actualValue,
      normalizedValue: normalizedValue,
      fte: fteValue,
      percentile: calculatedPercentile,
      notes: notes || undefined
    };

    setCalculationHistory(prev => [newHistoryItem, ...prev]);
    localStorage.setItem('calculationHistory', JSON.stringify([newHistoryItem, ...calculationHistory]));
  };

  if (showInitialChoice) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Data Source</h2>
            <p className="text-gray-600 mb-6">
              Would you like to use our preloaded market data or upload your own data?
            </p>
            <div className="space-y-4">
              <button
                onClick={handleUsePreloadedData}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Use Preloaded Market Data
              </button>
              <div className="relative">
                <label className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center justify-center">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleInitialFileUpload}
                    className="hidden"
                  />
                  Upload My Own Data (CSV)
                </label>
              </div>
              <button
                onClick={() => setShowTemplateGuide(!showTemplateGuide)}
                className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center"
              >
                <DocumentTextIcon className="w-4 h-4 mr-2" />
                {showTemplateGuide ? 'Hide CSV Guide' : 'View CSV Template & Guide'}
              </button>
            </div>

            {showTemplateGuide && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">CSV File Format</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="font-medium text-gray-700 mb-2">Required Columns:</div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>• specialty (text)</div>
                          <div>• p25_TCC, p50_TCC, p75_TCC, p90_TCC (numbers)</div>
                          <div>• p25_wrvu, p50_wrvu, p75_wrvu, p90_wrvu (numbers)</div>
                          <div>• p25_cf, p50_cf, p75_cf, p90_cf (decimals)</div>
                        </div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-medium text-blue-900 mb-2">Example Row:</div>
                        <code className="text-xs bg-white p-2 rounded block overflow-x-auto">
                          Family Medicine,220000,250000,280000,320000,4200,4800,5400,6200,45.50,48.75,52.00,56.25
                        </code>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={downloadSampleCSV}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center"
                  >
                    <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                    Download Sample CSV
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {isProcessing && (
              <div className="mt-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Processing...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-red-500">
                Fields marked with an asterisk (*) are required.
              </div>
              <Link
                href={process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator/market-data' : '/market-data'}
                className="inline-flex items-center justify-center w-[180px] px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <TableCellsIcon className="w-4 h-4 mr-2" />
                View Market Data
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                  placeholder="Enter physician name"
                />
              </div>

              {/* FTE Input */}
              <div className="space-y-1.5">
                <label htmlFor="fte" className="block text-sm font-medium text-gray-700">
                  FTE (0.10 - 1.00)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="number"
                  id="fte"
                  value={fte}
                  onChange={(e) => setFte(e.target.value)}
                  onBlur={() => {
                    const fteNum = parseFloat(fte);
                    if (isNaN(fteNum) || fteNum < 0.1 || fteNum > 1.0) {
                      setFte('1.00');
                    } else {
                      setFte(fteNum.toFixed(2));
                    }
                  }}
                  min="0.10"
                  max="1.00"
                  step="0.01"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 sm:text-sm"
                  placeholder="1.00"
                />
                {(selectedMetric === 'total' || selectedMetric === 'wrvu') && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Values will be normalized to 1.0 FTE
                  </div>
                )}
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
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <XMarkIcon className="w-4 h-4 mr-1.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={calculatePercentile}
                disabled={!selectedSpecialty || !selectedMetric || !inputValue || !physicianName}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalculatorIcon className="w-4 h-4 mr-1.5" />
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
          <div className="text-lg leading-relaxed text-gray-900">
            <span className="font-medium">{physicianName}</span> ranks in the <span className="text-blue-600 font-semibold">{(calculatedPercentile || 0).toFixed(1)}th percentile</span> for {selectedSpecialty.toLowerCase()} compensation{fte !== '1.0' ? ` (${formatValue(inputValue)} at ${parseFloat(fte).toFixed(2)} FTE)` : ` at ${formatValue(inputValue)}`}.
            {(selectedMetric === 'total' || selectedMetric === 'wrvu') && fte !== '1.0' && (
              <div className="mt-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg flex items-start">
                <svg className="w-5 h-5 text-blue-500 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-medium">Normalized to 1.0 FTE for comparison:</span> {formatValue(parseFloat(inputValue.replace(/[^0-9.]/g, '')) / parseFloat(fte))}
                  <br />
                  <span className="text-sm text-gray-500">Survey data is based on 1.0 FTE, so we normalize your input for accurate comparison.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Market Data Graph */}
        {calculatedPercentile !== null && marketData && marketData.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-sm">
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
        )}

        {/* Calculation History */}
        {calculationHistory.length > 0 && (
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
        )}
      </div>
    </div>
  );
} 
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { MarketData, MetricType, CustomMarketData } from '@/types/market-data';
import { CalculationHistory as BaseCalculationHistory, ComplianceCheck, FairMarketValue } from '@/types/logs';
import { CalculatorIcon, XMarkIcon, ArrowUpTrayIcon, TableCellsIcon, DocumentArrowUpIcon, TrashIcon, DocumentTextIcon, ExclamationTriangleIcon, ArrowPathIcon, PlusCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PercentileGraph } from './PercentileGraph';
import { CalculationHistoryView } from './CalculationHistory';
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

interface TCCComponent {
  id: string;
  name: string;
  value: string;
  notes: string;
  normalize: boolean;
  isPercentage?: boolean;
  baseComponentId?: string;
}

interface CalculationHistory extends BaseCalculationHistory {
  tccComponents?: TCCComponent[];
}

interface Props {
  onDataSourceSelected?: () => void;
}

export default function PercentileCalculator({ onDataSourceSelected }: Props) {
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
  const [showCustomDataModal, setShowCustomDataModal] = useState(false);
  const [customDataForm, setCustomDataForm] = useState<CustomMarketData>({
    specialty: '',
    p25_total: 0,
    p50_total: 0,
    p75_total: 0,
    p90_total: 0,
    p25_wrvu: 0,
    p50_wrvu: 0,
    p75_wrvu: 0,
    p90_wrvu: 0,
    p25_cf: 0,
    p50_cf: 0,
    p75_cf: 0,
    p90_cf: 0
  });
  const [tccComponents, setTccComponents] = useState<TCCComponent[]>([
    { id: '1', name: 'Base Pay', value: '', notes: '', normalize: true, isPercentage: false }
  ]);

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

  // Call onDataSourceSelected when data is loaded
  useEffect(() => {
    if (marketData.length > 0 && !showInitialChoice) {
      onDataSourceSelected?.();
    }
  }, [marketData.length, showInitialChoice, onDataSourceSelected]);

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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          const parsedData = results.data as any[];
          const validData = parsedData
            .filter(row => row.specialty && row.p50_total)
            .map(row => ({
              id: uuidv4(),
              specialty: row.specialty,
              p25_total: parseFloat(row.p25_total) || 0,
              p50_total: parseFloat(row.p50_total) || 0,
              p75_total: parseFloat(row.p75_total) || 0,
              p90_total: parseFloat(row.p90_total) || 0,
              p25_wrvu: parseFloat(row.p25_wrvu) || 0,
              p50_wrvu: parseFloat(row.p50_wrvu) || 0,
              p75_wrvu: parseFloat(row.p75_wrvu) || 0,
              p90_wrvu: parseFloat(row.p90_wrvu) || 0,
              p25_cf: parseFloat(row.p25_cf) || 0,
              p50_cf: parseFloat(row.p50_cf) || 0,
              p75_cf: parseFloat(row.p75_cf) || 0,
              p90_cf: parseFloat(row.p90_cf) || 0
            }));

          if (validData.length === 0) {
            setError('No valid data found in the file');
            return;
          }

          setMarketData(prev => {
            const updated = [...prev.filter(d => !validData.some(vd => vd.specialty === d.specialty)), ...validData];
            localStorage.setItem('marketData', JSON.stringify(updated));
            return updated;
          });

          if (onDataSourceSelected) {
            onDataSourceSelected();
          }
        } catch (error) {
          console.error('Error parsing file:', error);
          setError('Error parsing file. Please check the format and try again.');
        }
      },
      header: true
    });
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
      auditId: auditLog.id,
      tccComponents: selectedMetric === 'total' ? tccComponents : undefined
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

    const p25Key = `p25_${data.metric}` as keyof MarketData;
    const p50Key = `p50_${data.metric}` as keyof MarketData;
    const p75Key = `p75_${data.metric}` as keyof MarketData;
    const p90Key = `p90_${data.metric}` as keyof MarketData;

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
      notes: notes || undefined,
      tccComponents: selectedMetric === 'total' ? tccComponents : undefined
    };

    setCalculationHistory(prev => [newHistoryItem, ...prev]);
    localStorage.setItem('calculationHistory', JSON.stringify([newHistoryItem, ...calculationHistory]));
  };

  const handleCustomDataChange = (field: keyof CustomMarketData, value: string | number) => {
    if (field === 'specialty') {
      setCustomDataForm(prev => ({
        ...prev,
        [field]: String(value)
      }));
    } else {
      const numericValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      setCustomDataForm(prev => ({
        ...prev,
        [field]: numericValue
      }));
    }
  };

  const handleCustomDataSubmit = () => {
    if (!customDataForm.specialty) {
      setError('Please enter a specialty name');
      return;
    }

    const newMarketData: MarketData = {
      id: uuidv4(),
      ...customDataForm
    };

    setMarketData(prev => {
      const updated = [...prev.filter(d => d.specialty !== newMarketData.specialty), newMarketData];
      localStorage.setItem('marketData', JSON.stringify(updated));
      return updated;
    });

    setShowCustomDataModal(false);
    setSelectedSpecialty(newMarketData.specialty);
  };

  const CustomDataModal = () => (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Add Custom Market Data</h2>
            <button
              onClick={() => setShowCustomDataModal(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialty Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                defaultValue={customDataForm.specialty}
                onBlur={(e) => handleCustomDataChange('specialty', e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter specialty name"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Cash Compensation */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Total Cash Compensation</h3>
                <div className="space-y-3">
                  {['25th', '50th', '75th', '90th'].map((percentile, index) => (
                    <div key={`tcc-${percentile}`}>
                      <label className="block text-sm text-gray-700 mb-1">{percentile} Percentile</label>
                      <div className="relative rounded-lg">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          defaultValue={customDataForm[`p${percentile.slice(0, 2)}_total` as keyof CustomMarketData]}
                          onBlur={(e) => handleCustomDataChange(`p${percentile.slice(0, 2)}_total` as keyof CustomMarketData, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 pl-7 pr-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work RVUs */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Work RVUs</h3>
                <div className="space-y-3">
                  {['25th', '50th', '75th', '90th'].map((percentile) => (
                    <div key={`wrvu-${percentile}`}>
                      <label className="block text-sm text-gray-700 mb-1">{percentile} Percentile</label>
                      <input
                        type="number"
                        defaultValue={customDataForm[`p${percentile.slice(0, 2)}_wrvu` as keyof CustomMarketData]}
                        onBlur={(e) => handleCustomDataChange(`p${percentile.slice(0, 2)}_wrvu` as keyof CustomMarketData, e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Conversion Factor */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Conversion Factor</h3>
                <div className="space-y-3">
                  {['25th', '50th', '75th', '90th'].map((percentile) => (
                    <div key={`cf-${percentile}`}>
                      <label className="block text-sm text-gray-700 mb-1">{percentile} Percentile</label>
                      <div className="relative rounded-lg">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={customDataForm[`p${percentile.slice(0, 2)}_cf` as keyof CustomMarketData]}
                          onBlur={(e) => handleCustomDataChange(`p${percentile.slice(0, 2)}_cf` as keyof CustomMarketData, e.target.value)}
                          className="block w-full rounded-lg border border-gray-300 pl-7 pr-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={() => setShowCustomDataModal(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleCustomDataSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Save Market Data
          </button>
        </div>
      </div>
    </div>
  );

  const addTccComponent = () => {
    setTccComponents((prev: TCCComponent[]) => [
      ...prev,
      { id: uuidv4(), name: '', value: '', notes: '', normalize: true, isPercentage: false }
    ]);
  };

  const removeTccComponent = (id: string) => {
    setTccComponents((prev: TCCComponent[]) => prev.filter(comp => comp.id !== id));
    updateTotalTcc();
  };

  const handleTccValueChange = (id: string, value: string) => {
    // Allow numbers, decimal point, and percentage symbol
    const cleanValue = value.replace(/[^0-9.%]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (cleanValue.match(/\./g) || []).length;
    if (decimalCount > 1) return;
    
    // Update the component with the cleaned value
    updateTccComponent(id, 'value', cleanValue);
  };

  const handleTccValueBlur = (id: string, value: string) => {
    const component = tccComponents.find(comp => comp.id === id);
    if (!component) return;

    // Remove any non-numeric characters except dots and percentage
    const cleanValue = value.replace(/[^0-9.%]/g, '');
    const isPercentage = component.isPercentage;
    
    // Parse the numeric value
    let numericValue = parseFloat(cleanValue) || 0;
    
    // If it's a percentage, ensure it's within reasonable bounds
    if (isPercentage) {
      numericValue = Math.min(Math.max(numericValue, 0), 100);
    }
    
    // Format with commas for display
    const formattedValue = isPercentage 
      ? `${numericValue.toFixed(1)}%`
      : numericValue.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
    
    updateTccComponent(id, 'value', formattedValue);
    setTimeout(updateTotalTcc, 0);
  };

  const updateTccComponent = (id: string, field: keyof TCCComponent, value: string) => {
    setTccComponents((prev: TCCComponent[]) => 
      prev.map(comp => 
        comp.id === id ? { ...comp, [field]: value } : comp
      )
    );
  };

  const updateTotalTcc = () => {
    const fteValue = parseFloat(fte);
    let total = 0;
    
    // First, get the base pay value
    const baseComponent = tccComponents.find(comp => comp.name.toLowerCase().includes('base'));
    const basePayValue = baseComponent 
      ? parseFloat(baseComponent.value.replace(/[^0-9.]/g, '')) || 0 
      : 0;

    // Calculate total including percentage-based components
    tccComponents.forEach(comp => {
      const cleanValue = comp.value.replace(/[^0-9.%]/g, '');
      let value = 0;

      if (comp.isPercentage) {
        // If it's a percentage, calculate based on base pay
        const percentage = parseFloat(cleanValue) || 0;
        value = (basePayValue * percentage) / 100;
      } else {
        // If it's a dollar value, use it directly
        value = parseFloat(cleanValue) || 0;
      }
      
      // Apply FTE normalization if needed
      if (comp.normalize && fteValue > 0 && fteValue < 1.0) {
        value = value / fteValue;
      }
      
      total += value;
    });
    
    // Format the total with proper number formatting
    const formattedTotal = total.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setInputValue(formattedTotal);
  };

  const toggleValueType = (id: string) => {
    setTccComponents(prev => prev.map(component => {
      if (component.id === id) {
        const isCurrentlyPercentage = component.value.includes('%');
        const numericValue = parseFloat(component.value.replace(/[^0-9.]/g, '') || '0');
        
        // Find base component to calculate percentage/value
        const baseComponent = prev.find(c => c.name.toLowerCase().includes('base'));
        const baseValue = baseComponent ? parseFloat(baseComponent.value.replace(/[^0-9.]/g, '') || '0') : 0;
        
        let newValue;
        if (isCurrentlyPercentage) {
          // Converting from percentage to dollar
          newValue = ((numericValue / 100) * baseValue).toString();
        } else {
          // Converting from dollar to percentage
          newValue = ((numericValue / baseValue) * 100).toFixed(1);
        }
        
        return {
          ...component,
          value: newValue,
          isPercentage: !isCurrentlyPercentage
        };
      }
      return component;
    }));
  };

  const toggleNormalization = (id: string) => {
    setTccComponents((prev: TCCComponent[]) => 
      prev.map(comp => 
        comp.id === id ? { ...comp, normalize: !comp.normalize } : comp
      )
    );
    setTimeout(updateTotalTcc, 0);
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
    <div className="space-y-8">
      {/* Calculator Form */}
      <div className="space-y-6 sm:space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* First Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Provider Information</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="physician" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Physician Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="physician"
                  value={physicianName}
                  onChange={(e) => setPhysicianName(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200 ease-in-out sm:text-sm shadow-sm"
                  placeholder="Enter physician name"
                />
                <div className="mb-10"></div>
              </div>

              <div>
                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Specialty <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="specialty"
                    value={selectedSpecialty}
                    onChange={(e) => {
                      setSelectedSpecialty(e.target.value);
                      setCalculatedPercentile(null);
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200 ease-in-out sm:text-sm shadow-sm appearance-none"
                  >
                    <option value="">Select a specialty</option>
                    {filteredSpecialties.map((row) => (
                      <option key={row.specialty} value={row.specialty}>
                        {row.specialty}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Compensation Details</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="fte" className="block text-sm font-medium text-gray-700 mb-1.5">
                  FTE (0.10 - 1.00) <span className="text-rose-500">*</span>
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
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                  placeholder="1.00"
                />
                <div className="mb-10"></div>
              </div>

              <div>
                <label htmlFor="metric" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Metric <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="metric"
                    value={selectedMetric}
                    onChange={(e) => {
                      setSelectedMetric(e.target.value as MetricType);
                      setCalculatedPercentile(null);
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors duration-200 ease-in-out sm:text-sm shadow-sm appearance-none"
                  >
                    <option value="total">Total Cash Compensation</option>
                    <option value="wrvu">Work RVUs</option>
                    <option value="cf">Conversion Factor</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Third Column */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Value & Notes</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1.5">
                  {getMetricLabel(selectedMetric)} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg">
                  {selectedMetric !== 'wrvu' && (
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                  )}
                  <input
                    type="text"
                    id="value"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className={`block w-full rounded-lg border border-gray-300 py-2 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm ${
                      selectedMetric !== 'wrvu' ? 'pl-8 pr-4' : 'px-4'
                    }`}
                    placeholder={selectedMetric === 'wrvu' ? 'Enter RVUs' : 'Enter value'}
                    readOnly={selectedMetric === 'total'}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm resize-none"
                  placeholder="Add any notes about this calculation..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* TCC Components Section */}
        {selectedMetric === 'total' && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Total Cash Compensation Components</h3>
                <p className="text-xs text-gray-500 mt-1">Add individual components to calculate total compensation</p>
              </div>
              <button
                type="button"
                onClick={addTccComponent}
                className="inline-flex items-center px-2 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Component
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {tccComponents.map((component) => (
                <div key={component.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="text"
                    value={component.name}
                    onChange={(e) => updateTccComponent(component.id, 'name', e.target.value)}
                    placeholder="Component Name"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <div className="flex-none">
                    {component.isPercentage ? (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-32">
                          <input
                            type="text"
                            value={component.value}
                            onChange={(e) => handleTccValueChange(component.id, e.target.value)}
                            onBlur={(e) => handleTccValueBlur(component.id, e.target.value)}
                            placeholder="Percentage"
                            className="w-full rounded-lg border border-gray-300 px-3 pr-8 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-500">%</span>
                          </div>
                        </div>
                        <div className="relative w-40">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-500">$</span>
                          </div>
                          <input
                            type="text"
                            value={(() => {
                              const baseComponent = tccComponents.find(c => c.name.toLowerCase().includes('base'));
                              const baseValue = baseComponent ? parseFloat(baseComponent.value.replace(/[^0-9.]/g, '') || '0') : 0;
                              const percentage = parseFloat(component.value.replace(/[^0-9.]/g, '') || '0');
                              const dollarValue = (percentage / 100) * baseValue;
                              return dollarValue.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              });
                            })()}
                            readOnly
                            className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-gray-600 bg-gray-50"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative w-48">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                          <span className="text-gray-500">$</span>
                        </div>
                        <input
                          type="text"
                          value={component.value}
                          onChange={(e) => handleTccValueChange(component.id, e.target.value)}
                          onBlur={(e) => handleTccValueBlur(component.id, e.target.value)}
                          placeholder="Value"
                          className="w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                        />
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={component.notes}
                    onChange={(e) => updateTccComponent(component.id, 'notes', e.target.value)}
                    placeholder="Notes"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleValueType(component.id)}
                      className={`px-2 py-1 rounded ${
                        component.isPercentage ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      } text-sm font-medium hover:bg-opacity-75 transition-colors`}
                      disabled={component.name.toLowerCase().includes('base')}
                    >
                      {component.isPercentage ? '%' : '$'}
                    </button>
                    <button
                      onClick={() => toggleNormalization(component.id)}
                      className={`px-2 py-1 rounded ${
                        component.normalize ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      } text-sm font-medium hover:bg-opacity-75 transition-colors`}
                    >
                      FTE {component.normalize ? '✓' : ''}
                    </button>
                    <button
                      onClick={() => removeTccComponent(component.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 border-t border-gray-200">
              <div className="text-sm font-medium text-gray-900">Total TCC:</div>
              <div className="text-base font-bold text-gray-900">{formatValue(parseFloat(inputValue.replace(/[^0-9.]/g, '')) || 0, 'total')}</div>
            </div>
          </div>
        )}

        {/* Add Custom Market Data Button */}
        {showCustomDataModal && <CustomDataModal />}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={clearInputs}
            className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            <XMarkIcon className="w-4 h-4 mr-2" />
            Clear
          </button>
          <button
            type="button"
            onClick={calculatePercentile}
            disabled={!selectedSpecialty || !selectedMetric || !inputValue || !physicianName}
            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <CalculatorIcon className="w-4 h-4 mr-2" />
            Calculate Percentile
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-rose-400 mr-2" />
              <div className="text-sm text-rose-700">{error}</div>
            </div>
          </div>
        )}

        {/* Results Section */}
        {calculatedPercentile !== null && selectedSpecialty && physicianName && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="space-y-4">
              <div className="text-lg leading-relaxed text-gray-900">
                <span className="font-medium">{physicianName}</span> ranks in the{' '}
                <span className="text-blue-600 font-semibold">{(calculatedPercentile || 0).toFixed(1)}th percentile</span> for{' '}
                {selectedSpecialty.toLowerCase()} compensation
                {fte !== '1.0' ? ` (${formatValue(inputValue)} at ${parseFloat(fte).toFixed(2)} FTE)` : ` at ${formatValue(inputValue)}`}.
              </div>

              {(selectedMetric === 'total' || selectedMetric === 'wrvu') && fte !== '1.0' && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-500 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-blue-900">
                        Normalized to 1.0 FTE for comparison: {formatValue(parseFloat(inputValue.replace(/[^0-9.]/g, '')) / parseFloat(fte))}
                      </div>
                      <p className="mt-1 text-sm text-blue-700">
                        Survey data is based on 1.0 FTE, so we normalize your input for accurate comparison.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Market Data Graph */}
        {calculatedPercentile !== null && marketData && marketData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
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
        {calculationHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Calculation History</h2>
                <button
                  onClick={() => setCalculationHistory([])}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { MarketData, MetricType, CustomMarketData } from '@/types/market-data';
import { CalculationHistory, ComplianceCheck as ComplianceCheckType, FairMarketValue } from '@/types/logs';
import { CalculatorIcon, XMarkIcon, ArrowUpTrayIcon, TableCellsIcon, DocumentArrowUpIcon, TrashIcon, DocumentTextIcon, ExclamationTriangleIcon, ArrowPathIcon, PlusCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { PercentileGraph } from './PercentileGraph';
import { CalculationHistoryView } from './CalculationHistory';
import { performComplianceChecks, createAuditLog, getFairMarketValue, formatComplianceMessage } from '@/utils/compliance';
import { ComplianceInfo } from './ComplianceInfo';
import { Switch } from './Switch';

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
  amount: number;
  notes: string;
  normalize: boolean;
  isBase?: boolean;
  isPercentage?: boolean;
  baseComponentId?: string;
}

interface TierCalculation {
  threshold: number;
  wRVUsInTier: number;
  incentiveAmount: number;
  range: string;
}

interface ComplianceCheck {
  name: string;
  result: boolean;
  details: string;
}

interface ModelingCalculation {
  modelType: 'base-plus-productivity' | 'tiered-productivity';
  basePayAmount: number;
  actualProductivity: number;
  productivityThreshold?: number;
  conversionFactor?: number;
  tierRates?: {
    threshold: number;
    conversionFactor: number;
  }[];
  projectedEarnings: number;
  incentiveAmount: number;
}

interface BaseCalculationHistory {
  id: string;
  timestamp: string;
  specialty: string;
  metric: MetricType;
  value: number;
  percentile: number;
  notes?: string;
  tccComponents?: TCCComponent[];
  complianceChecks?: ComplianceCheckType[];
  modelingCalculation?: ModelingCalculation;
}

interface ExtendedCalculationHistory extends Omit<BaseCalculationHistory, 'complianceChecks'> {
  physician: string;
  physicianName: string;
  actualValue: number;
  normalizedValue: number;
  fte: number;
  tccComponents?: TCCComponent[];
  complianceChecks?: ComplianceCheckType[];
  modelingCalculation?: ModelingCalculation;
}

interface Props {
  onDataSourceSelected?: () => void;
}

interface modelingState {
  modelType: 'base-plus-productivity' | 'tiered-productivity';
  basePayAmount: string;
  actualProductivity: string;
  productivityThreshold: string;
  conversionFactor: string;
  tierRates: {
    threshold: number;
    conversionFactor: number;
  }[];
  tierCalculations: {
    range: string;
    wRVUsInTier: number;
    incentiveAmount: number;
  }[];
  projectedEarnings: number;
  incentiveAmount: number;
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
  const [calculationHistory, setCalculationHistory] = useState<ExtendedCalculationHistory[]>([]);
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
    { id: '1', name: 'Base Pay', value: '', amount: 0, notes: '', normalize: true, isBase: true, isPercentage: false }
  ]);
  const [activeTab, setActiveTab] = useState<'calculator' | 'modeling' | 'history'>('calculator');
  const [modelingState, setModelingState] = useState<modelingState>({
    modelType: 'base-plus-productivity',
    basePayAmount: '',
    actualProductivity: '',
    productivityThreshold: '',
    conversionFactor: '',
    tierRates: [
      { threshold: 0, conversionFactor: 45.00 },
      { threshold: 5000, conversionFactor: 50.00 }
    ],
    tierCalculations: [],
    projectedEarnings: 0,
    incentiveAmount: 0
  });
  const [use50thPercentileCF, setUse50thPercentileCF] = useState(false);
  const [cf50, setCf50] = useState(0);

  // Add useEffect to load calculation history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('calculationHistory');
    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory);
        setCalculationHistory(parsedHistory);
      } catch (error) {
        console.error('Error loading calculation history:', error);
      }
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
    setError(null);

        // Get uploaded surveys from localStorage
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
        if (onDataSourceSelected) {
          onDataSourceSelected();
        }
      } catch (error) {
        console.error('Error loading market data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load market data');
    } finally {
      setLoading(false);
    }
  };

    loadData();
  }, [onDataSourceSelected]);

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
      complianceFlags: complianceChecks
    });
    
    // Save calculation to history with both values
    const newCalculation: ExtendedCalculationHistory = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      physician: physicianName,
      physicianName: physicianName,
      specialty: selectedSpecialty,
      metric: selectedMetric,
      value: normalizedValue,
      actualValue: actualValue,
      normalizedValue: normalizedValue,
      fte: parseFloat(fte),
      percentile: calculatedPercentile || 0, // Ensure it's never null
      notes: notes || undefined,
      tccComponents: selectedMetric === 'total' ? tccComponents.map(comp => ({
        id: comp.id,
        name: comp.name,
        value: comp.value,
        amount: comp.amount,
        notes: comp.notes,
        normalize: comp.normalize,
        isBase: comp.isBase,
        isPercentage: comp.isPercentage,
        baseComponentId: comp.baseComponentId
      })) : undefined,
      modelingCalculation: selectedMetric === 'total' ? {
        modelType: modelingState.modelType,
        basePayAmount: parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0'),
        actualProductivity: parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0'),
        productivityThreshold: modelingState.modelType === 'base-plus-productivity' 
          ? parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        conversionFactor: modelingState.modelType === 'base-plus-productivity'
          ? parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        tierRates: modelingState.modelType === 'tiered-productivity' 
          ? modelingState.tierRates
          : undefined,
        projectedEarnings: modelingState.projectedEarnings,
        incentiveAmount: modelingState.incentiveAmount
      } : undefined,
      complianceChecks
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
      return numValue.toLocaleString('en-US', { 
        minimumFractionDigits: 1,
        maximumFractionDigits: 1 
      });
    } else if (metric === 'total') {
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
    // Preserve uploaded surveys
    const uploadedSurveys = localStorage.getItem('uploadedSurveys');
    
    // Clear all states
    clearInputs();
    setCalculationHistory([]);
    setMarketData([]);
    
    // Clear localStorage except for uploaded surveys
    localStorage.clear();
    
    // Restore uploaded surveys
    if (uploadedSurveys) {
      localStorage.setItem('uploadedSurveys', uploadedSurveys);
    }
    
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
    
    const newHistoryItem: ExtendedCalculationHistory = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      physician: physicianName,
      physicianName: physicianName,
      specialty: selectedSpecialty,
      metric: selectedMetric,
      value: normalizedValue,
      actualValue: actualValue,
      normalizedValue: normalizedValue,
      fte: parseFloat(fte),
      percentile: calculatedPercentile || 0, // Ensure it's never null
      notes: notes || undefined,
      tccComponents: selectedMetric === 'total' ? tccComponents.map(comp => ({
        id: comp.id,
        name: comp.name,
        value: comp.value,
        amount: comp.amount,
        notes: comp.notes,
        normalize: comp.normalize,
        isBase: comp.isBase,
        isPercentage: comp.isPercentage,
        baseComponentId: comp.baseComponentId
      })) : undefined,
      modelingCalculation: selectedMetric === 'total' ? {
        modelType: modelingState.modelType,
        basePayAmount: parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0'),
        actualProductivity: parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0'),
        productivityThreshold: modelingState.modelType === 'base-plus-productivity' 
          ? parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        conversionFactor: modelingState.modelType === 'base-plus-productivity'
          ? parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        tierRates: modelingState.modelType === 'tiered-productivity' 
          ? modelingState.tierRates
          : undefined,
        projectedEarnings: modelingState.projectedEarnings,
        incentiveAmount: modelingState.incentiveAmount
      } : undefined
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
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-30">
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
      { id: uuidv4(), name: '', value: '', amount: 0, notes: '', normalize: true, isBase: false, isPercentage: false }
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

  // Add calculation functions
  const calculateProjectedEarnings = useCallback(() => {
    // Parse base values
    const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0');
    const actualProductivityValue = parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0');

    if (modelingState.modelType === 'tiered-productivity') {
      // Sort tiers by threshold to ensure proper calculation
      const sortedTiers = [...modelingState.tierRates].sort((a, b) => a.threshold - b.threshold);
      let remainingRVUs = actualProductivityValue;
      let totalIncentive = 0;
      const tierCalculations = [];

      // Calculate RVUs and incentive for each tier
      for (let i = 0; i < sortedTiers.length; i++) {
        const currentTier = sortedTiers[i];
        const nextTier = sortedTiers[i + 1];
        const tierThreshold = currentTier.threshold;
        const nextThreshold = nextTier ? nextTier.threshold : Infinity;
        
        // Calculate RVUs in this tier
        let wRVUsInTier = 0;
        
        if (remainingRVUs > tierThreshold) {
          // If there's a next tier, cap the RVUs at the next threshold
          if (nextTier) {
            wRVUsInTier = Math.min(remainingRVUs - tierThreshold, nextThreshold - tierThreshold);
          } else {
            // For the last tier, use all remaining RVUs above the threshold
            wRVUsInTier = remainingRVUs - tierThreshold;
          }

          // Calculate incentive for this tier
          const tierIncentive = wRVUsInTier * currentTier.conversionFactor;
          
          // Update running totals
          totalIncentive += tierIncentive;

          // Add tier calculation
          tierCalculations.push({
            range: i === sortedTiers.length - 1 ? `${tierThreshold.toLocaleString()}+` : `${tierThreshold.toLocaleString()} - ${nextThreshold.toLocaleString()}`,
            wRVUsInTier,
            incentiveAmount: tierIncentive
          });
        }
      }

      // Update state with calculations
      setModelingState(prev => ({
        ...prev,
        incentiveAmount: totalIncentive,
        projectedEarnings: basePayValue + totalIncentive,
        tierCalculations
      }));
    }
  }, [modelingState.basePayAmount, modelingState.actualProductivity, modelingState.modelType, modelingState.tierRates]);

  // Add input handling functions
  const handleModelingInputChange = (field: keyof typeof modelingState, value: string) => {
    const updatedState = { ...modelingState };
    updatedState[field] = value;

    // Calculate productivity threshold when base pay or conversion factor changes
    if (field === 'basePayAmount' || field === 'conversionFactor') {
      const basePayNum = parseFloat(updatedState.basePayAmount.replace(/[^0-9.]/g, '')) || 0;
      const cfNum = parseFloat(updatedState.conversionFactor.replace(/[^0-9.]/g, '')) || 0;
      
      // Only calculate if both values are valid and non-zero
      if (basePayNum > 0 && cfNum > 0) {
        const threshold = basePayNum / cfNum;
        updatedState.productivityThreshold = threshold.toFixed(2);
      } else {
        updatedState.productivityThreshold = '';
      }
    }

    setModelingState(updatedState);
  };

  const handleModelingInputBlur = (field: keyof typeof modelingState, value: string) => {
    // Parse and format the value
    const numValue = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
    const formattedValue = numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // Get current values from state
    const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0');
    const actualProductivityValue = parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0');
    const threshold = parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0');
    const conversionFactor = parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0');

    // Calculate incentive
    const productivityAboveThreshold = Math.max(0, actualProductivityValue - threshold);
    const incentiveAmount = productivityAboveThreshold * conversionFactor;

    // Update state with new values and calculated incentive
    setModelingState({
      ...modelingState,
      [field]: formattedValue,
      incentiveAmount,
      projectedEarnings: basePayValue + incentiveAmount
    });
  };

  // Add new function to save modeling calculations to history
  const saveModelingToHistory = () => {
    if (!physicianName) {
      setError('Please enter a physician name');
      return;
    }

    if (!selectedSpecialty) {
      setError('Please select a specialty');
      return;
    }

    if (!modelingState.projectedEarnings) {
      setError('No earnings calculated to save');
      return;
    }

    // Calculate percentile based on market data
    const specialtyData = marketData.find(d => d.specialty === selectedSpecialty);
    if (!specialtyData) {
      setError('Specialty data not found');
      return;
    }

    const value = modelingState.projectedEarnings;
    const p25 = specialtyData.p25_total;
    const p50 = specialtyData.p50_total;
    const p75 = specialtyData.p75_total;
    const p90 = specialtyData.p90_total;

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

    const newCalculation: ExtendedCalculationHistory = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      physician: physicianName,
      physicianName: physicianName,
      specialty: selectedSpecialty,
      metric: 'total',
      value: modelingState.projectedEarnings,
      actualValue: modelingState.projectedEarnings,
      normalizedValue: modelingState.projectedEarnings,
      fte: parseFloat(fte),
      percentile: percentile,
      notes: `${modelingState.modelType === 'base-plus-productivity' ? 'Base + Productivity' : 'Tiered Productivity'} Model\nBase Pay: $${modelingState.basePayAmount}\nActual wRVUs: ${modelingState.actualProductivity}`,
      modelingCalculation: {
        modelType: modelingState.modelType,
        basePayAmount: parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0'),
        actualProductivity: parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0'),
        productivityThreshold: modelingState.modelType === 'base-plus-productivity' 
          ? parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        conversionFactor: modelingState.modelType === 'base-plus-productivity'
          ? parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0')
          : undefined,
        tierRates: modelingState.modelType === 'tiered-productivity' 
          ? modelingState.tierRates
          : undefined,
        projectedEarnings: modelingState.projectedEarnings,
        incentiveAmount: modelingState.incentiveAmount
      }
    };

    setCalculationHistory(prev => {
      const newHistory = [newCalculation, ...prev];
      localStorage.setItem('calculationHistory', JSON.stringify(newHistory));
      return newHistory;
    });

    // Clear error if successful
    setError(null);
  };

  // Add useEffect for automatic calculation
  useEffect(() => {
    if (modelingState.modelType === 'base-plus-productivity') {
      const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0');
      const actualProductivityValue = parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0');
      const threshold = parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0');
      const conversionFactor = parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0');

      const productivityAboveThreshold = Math.max(0, actualProductivityValue - threshold);
      const incentiveAmount = productivityAboveThreshold * conversionFactor;

      setModelingState(prev => ({
        ...prev,
        incentiveAmount,
        projectedEarnings: basePayValue + incentiveAmount
      }));
    } else if (modelingState.modelType === 'tiered-productivity') {
      calculateProjectedEarnings();
    }
  }, [modelingState.basePayAmount, modelingState.actualProductivity, modelingState.productivityThreshold, modelingState.conversionFactor, modelingState.modelType, modelingState.tierRates, calculateProjectedEarnings]);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h2>
            <p className="text-gray-600 mb-6">
              Please wait while we load the market data.
            </p>
            {error && (
              <div className="mt-4 p-4 bg-red-50 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {[
            { name: 'TCC Calculator', value: 'calculator' },
            { name: 'Compensation Modeling', value: 'modeling' },
            { name: 'History', value: 'history' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value as typeof activeTab)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Calculator Tab Content */}
      {activeTab === 'calculator' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Calculator Form */}
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                {/* Header with Save Button */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Results</h3>
                  <button
                    onClick={handleSaveToHistory}
                    disabled={calculatedPercentile === null || !marketData || !inputValue}
                    className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DocumentTextIcon className="w-4 h-4 mr-1.5" />
                    Save
                  </button>
                </div>

                {/* Main Results Content */}
                <div className="space-y-6">
                  {/* Percentile Result */}
                  <div className="text-lg leading-relaxed text-gray-900">
                    <span className="font-medium">{physicianName}</span> ranks in the{' '}
                    <span className="text-blue-600 font-semibold">{(calculatedPercentile || 0).toFixed(1)}th percentile</span> for{' '}
                    {selectedSpecialty.toLowerCase()} compensation
                    {fte !== '1.0' ? ` (${formatValue(inputValue)} at ${parseFloat(fte).toFixed(2)} FTE)` : ` at ${formatValue(inputValue)}`}.
                  </div>

                  {/* FTE Normalization Info */}
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

              {/* Market Data Graph */}
              {marketData && marketData.length > 0 && (
                <div className="border-t border-gray-200">
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
      )}

      {/* Modeling Tab Content */}
      {activeTab === 'modeling' && (
        <div className="space-y-8">
          {/* Model Type Selection */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Compensation Model</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { id: 'base-plus-productivity', name: 'Base + Productivity', description: 'Base salary plus productivity bonus' },
                { id: 'tiered-productivity', name: 'Tiered Productivity', description: 'Multiple productivity thresholds with different rates' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setModelingState(prev => ({
                    ...prev,
                    modelType: type.id as typeof prev.modelType
                  }))}
                  className={`
                    flex flex-col items-start p-4 rounded-lg border text-left
                    ${modelingState.modelType === type.id
                      ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500 ring-offset-2'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                    transition-all duration-200
                  `}
                >
                  <span className="text-base font-medium mb-1">{type.name}</span>
                  <span className="text-sm opacity-75">{type.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Configuration Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Key Components and Metrics */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-6">Key Components</h3>
                
                {/* Physician Name */}
                <div className="mb-6">
                  <label htmlFor="physician" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Physician Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="physician"
                    value={physicianName}
                    onChange={(e) => setPhysicianName(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                    placeholder="Enter physician name"
                  />
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Base Pay Amount */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base Pay Amount
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <span className="text-gray-500">$</span>
                      </div>
                      <input
                        type="text"
                        value={modelingState.basePayAmount}
                        onChange={(e) => handleModelingInputChange('basePayAmount', e.target.value)}
                        onBlur={(e) => handleModelingInputBlur('basePayAmount', e.target.value)}
                        className="block w-full rounded-lg border border-gray-300 pl-7 pr-3 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* FTE Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      FTE (0.10 - 1.00) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
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
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                      placeholder="1.00"
                    />
                  </div>

                  {/* Specialty Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialty
                    </label>
                    <select
                      value={selectedSpecialty}
                      onChange={(e) => setSelectedSpecialty(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                    >
                      <option value="">Select specialty</option>
                      {marketData.map((data) => (
                        <option key={data.specialty} value={data.specialty}>
                          {data.specialty}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Actual Work RVUs */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual Work RVUs
                  </label>
                  <input
                    type="text"
                    value={modelingState.actualProductivity}
                    onChange={(e) => handleModelingInputChange('actualProductivity', e.target.value)}
                    onBlur={(e) => handleModelingInputBlur('actualProductivity', e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                    placeholder="Enter actual work RVUs"
                  />
                </div>

                {/* Base + Productivity Configuration */}
                {modelingState.modelType === 'base-plus-productivity' && (
                  <div className="mt-6">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900">Productivity Bonus Configuration</h4>
                      <p className="text-xs text-gray-500 mt-1">Configure the conversion factor to automatically calculate the productivity threshold</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Conversion Factor */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Conversion Factor
                        </label>
                        <div className="space-y-2">
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                              <span className="text-gray-500">$</span>
                            </div>
                            <input
                              type="text"
                              value={modelingState.conversionFactor}
                              onChange={(e) => {
                                handleModelingInputChange('conversionFactor', e.target.value);
                                // Calculate threshold when CF changes
                                const cf = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                                const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '')) || 0;
                                if (cf > 0) {
                                  const calculatedThreshold = Math.round(basePayValue / cf);
                                  setModelingState(prev => ({
                                    ...prev,
                                    conversionFactor: e.target.value,
                                    productivityThreshold: calculatedThreshold.toLocaleString()
                                  }));
                                }
                              }}
                              onBlur={(e) => handleModelingInputBlur('conversionFactor', e.target.value)}
                              className="block w-full rounded-lg border-2 border-gray-300 pl-7 pr-3 py-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                              placeholder="0.00"
                            />
                          </div>
                          
                          {selectedSpecialty && (
                            <div className="flex items-center justify-between px-1 py-2">
                              <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={modelingState.conversionFactor === marketData.find(d => d.specialty === selectedSpecialty)?.p50_cf.toFixed(2)}
                                    onChange={(e) => {
                                      const data = marketData.find(d => d.specialty === selectedSpecialty);
                                      if (data?.p50_cf && e.target.checked) {
                                        const cf = data.p50_cf.toFixed(2);
                                        const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '')) || 0;
                                        const calculatedThreshold = Math.round(basePayValue / data.p50_cf);
                                        setModelingState(prev => ({
                                          ...prev,
                                          conversionFactor: cf,
                                          productivityThreshold: calculatedThreshold.toString()
                                        }));
                                      } else {
                                        // When toggle is turned off, reset to zero
                                        setModelingState(prev => ({
                                          ...prev,
                                          conversionFactor: "0",
                                          productivityThreshold: "0"
                                        }));
                                      }
                                    }}
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                </label>
                                <span className="text-sm text-gray-600">Use 50th percentile CF</span>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                ${marketData.find(d => d.specialty === selectedSpecialty)?.p50_cf.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Productivity Threshold (Calculated) */}
                      <div>
                        <label htmlFor="productivityThreshold" className="block text-sm font-medium text-gray-700">
                          Productivity Threshold (Calculated)
                        </label>
                        <input
                          type="text"
                          id="productivityThreshold"
                          value={(() => {
                            const basePayValue = parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '')) || 0;
                            const cfValue = parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '')) || 0;
                            if (basePayValue > 0 && cfValue > 0) {
                              return (basePayValue / cfValue).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              });
                            }
                            return '';
                          })()}
                          readOnly
                          className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-blue-500 sm:text-sm shadow-sm"
                          placeholder="Enter base pay and conversion factor to calculate"
                        />
                        <p className="mt-1 text-sm text-gray-500">
                          Automatically calculated as Base Pay / Conversion Factor
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tier Configuration - Only show for tiered-productivity */}
                {modelingState.modelType === 'tiered-productivity' && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Tiered Conversion Factors</h4>
                        <p className="text-xs text-gray-500 mt-1">Configure different conversion factors for wRVU thresholds</p>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            const lastTier = modelingState.tierRates[modelingState.tierRates.length - 1];
                            setModelingState(prev => ({
                              ...prev,
                              tierRates: [
                                ...prev.tierRates,
                                {
                                  threshold: lastTier.threshold + 2500,
                                  conversionFactor: Math.min(100, lastTier.conversionFactor + 5)
                                }
                              ]
                            }));
                          }}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                        >
                          <PlusIcon className="w-4 h-4 mr-1" />
                          Add Tier
                        </button>
                        {modelingState.tierRates.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              setModelingState(prev => ({
                                ...prev,
                                tierRates: prev.tierRates.slice(0, -1)
                              }));
                            }}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                          >
                            <XMarkIcon className="w-4 h-4 mr-1" />
                            Remove Last Tier
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {modelingState.tierRates.map((tier, index) => {
                        const calculation = modelingState.tierCalculations?.[index] || {
                          wRVUsInTier: 0,
                          incentiveAmount: 0,
                          range: index === modelingState.tierRates.length - 1
                            ? `${tier.threshold.toLocaleString()}+`
                            : `${tier.threshold.toLocaleString()} - ${modelingState.tierRates[index + 1].threshold.toLocaleString()}`
                        };

                        return (
                          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                            {/* Threshold */}
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-500 mb-1 whitespace-nowrap">
                                {index === 0 ? 'Starting' : 'Above'} Threshold
                              </label>
                              <div className="relative h-[38px]">
                                <input
                                  type="text"
                                  value={tier.threshold.toLocaleString()}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value.replace(/[^0-9]/g, '')) || 0;
                                    const updatedTiers = [...modelingState.tierRates];
                                    updatedTiers[index] = { ...tier, threshold: value };
                                    setModelingState(prev => ({
                                      ...prev,
                                      tierRates: updatedTiers
                                    }));
                                  }}
                                  className="block w-full h-full rounded-lg border border-gray-300 px-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                />
                              </div>
                            </div>

                            {/* Conversion Factor */}
                            <div className="md:col-span-2">
                              <label className="block text-xs text-gray-500 mb-1 whitespace-nowrap">
                                CF Rate
                              </label>
                              <div className="relative h-[38px]">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                  <span className="text-gray-500">$</span>
                                </div>
                                <input
                                  type="text"
                                  value={tier.conversionFactor.toFixed(2)}
                                  onChange={(e) => {
                                    const value = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
                                    const updatedTiers = [...modelingState.tierRates];
                                    updatedTiers[index] = { ...tier, conversionFactor: value };
                                    setModelingState(prev => ({
                                      ...prev,
                                      tierRates: updatedTiers
                                    }));
                                  }}
                                  className="block w-full h-full rounded-lg border border-gray-300 pl-7 pr-3 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm"
                                />
                              </div>
                            </div>

                            {/* Tier Details */}
                            <div className="md:col-span-8">
                              <label className="block text-xs text-gray-500 mb-1">
                                Tier Details
                              </label>
                              <div className="bg-white p-3 rounded-lg border border-gray-200">
                                <div className="grid grid-cols-3 gap-4">
                                  <div>
                                    <div className="text-xs text-gray-500">Range</div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {calculation.range}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">wRVUs in Tier</div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {calculation.wRVUsInTier.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                      })}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">Tier Incentive</div>
                                    <div className="text-sm font-medium text-green-600">
                                      ${calculation.incentiveAmount.toLocaleString('en-US', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-medium text-gray-900">Projected Earnings</h3>
                <button
                  onClick={saveModelingToHistory}
                  disabled={!modelingState.projectedEarnings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <DocumentTextIcon className="w-4 h-4 mr-1.5" />
                  Save
                </button>
              </div>

              <div className="space-y-6">
                {/* Total Compensation */}
                <div className="pb-6 border-b border-gray-200">
                  <div className="text-4xl font-bold text-gray-900">
                    {modelingState.projectedEarnings > 0
                      ? modelingState.projectedEarnings.toLocaleString('en-US', {
                          style: 'currency',
                          currency: 'USD',
                          maximumFractionDigits: 0
                        })
                      : ''}
                  </div>
                  {modelingState.projectedEarnings > 0 && selectedSpecialty && (
                    <div className="space-y-3">
                      {/* Change from base pay */}
                      <div className="flex items-center text-sm">
                        <span className={`font-medium ${
                          modelingState.projectedEarnings > parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0')
                            ? 'text-emerald-600'
                            : 'text-gray-600'
                        }`}>
                          {((modelingState.projectedEarnings / parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0') - 1) * 100).toFixed(1)}% 
                        </span>
                        <span className="ml-1 text-gray-500">from base pay</span>
                      </div>

                      {/* Percentile Information */}
                      {(() => {
                        const specialtyData = marketData.find(d => d.specialty === selectedSpecialty);
                        if (!specialtyData) return null;

                        // Normalize values to 1.0 FTE
                        const fteValue = parseFloat(fte);
                        const normalizedEarnings = modelingState.projectedEarnings / fteValue;
                        const normalizedWRVUs = parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0') / fteValue;

                        // Calculate TCC percentile
                        let calculatedTccPercentile = 0;
                        if (normalizedEarnings <= specialtyData.p25_total) {
                          calculatedTccPercentile = (normalizedEarnings / specialtyData.p25_total) * 25;
                        } else if (normalizedEarnings <= specialtyData.p50_total) {
                          calculatedTccPercentile = 25 + ((normalizedEarnings - specialtyData.p25_total) / (specialtyData.p50_total - specialtyData.p25_total)) * 25;
                        } else if (normalizedEarnings <= specialtyData.p75_total) {
                          calculatedTccPercentile = 50 + ((normalizedEarnings - specialtyData.p50_total) / (specialtyData.p75_total - specialtyData.p50_total)) * 25;
                        } else if (normalizedEarnings <= specialtyData.p90_total) {
                          calculatedTccPercentile = 75 + ((normalizedEarnings - specialtyData.p75_total) / (specialtyData.p90_total - specialtyData.p75_total)) * 15;
                        } else {
                          calculatedTccPercentile = 90 + ((normalizedEarnings - specialtyData.p90_total) / specialtyData.p90_total) * 10;
                        }

                        // Calculate wRVU percentile
                        let calculatedWrvuPercentile = 0;
                        if (normalizedWRVUs <= specialtyData.p25_wrvu) {
                          calculatedWrvuPercentile = (normalizedWRVUs / specialtyData.p25_wrvu) * 25;
                        } else if (normalizedWRVUs <= specialtyData.p50_wrvu) {
                          calculatedWrvuPercentile = 25 + ((normalizedWRVUs - specialtyData.p25_wrvu) / (specialtyData.p50_wrvu - specialtyData.p25_wrvu)) * 25;
                        } else if (normalizedWRVUs <= specialtyData.p75_wrvu) {
                          calculatedWrvuPercentile = 50 + ((normalizedWRVUs - specialtyData.p50_wrvu) / (specialtyData.p75_wrvu - specialtyData.p50_wrvu)) * 25;
                        } else if (normalizedWRVUs <= specialtyData.p90_wrvu) {
                          calculatedWrvuPercentile = 75 + ((normalizedWRVUs - specialtyData.p75_wrvu) / (specialtyData.p90_wrvu - specialtyData.p75_wrvu)) * 15;
                        } else {
                          calculatedWrvuPercentile = 90 + ((normalizedWRVUs - specialtyData.p90_wrvu) / specialtyData.p90_wrvu) * 10;
                        }

                        // Ensure percentiles stay within 0-100 range
                        calculatedTccPercentile = Math.max(0, Math.min(100, calculatedTccPercentile));
                        calculatedWrvuPercentile = Math.max(0, Math.min(100, calculatedWrvuPercentile));

                        return (
                          <div className="border-t border-gray-200 pt-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">TCC Percentile</span>
                                {fteValue < 1 && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                                    Normalized to 1.0 FTE
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-blue-600">
                                {calculatedTccPercentile.toFixed(1)}th
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <span className="text-sm font-medium text-gray-900">wRVU Percentile</span>
                                {fteValue < 1 && (
                                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
                                    Normalized to 1.0 FTE
                                  </span>
                                )}
                              </div>
                              <span className="text-sm font-semibold text-blue-600">
                                {calculatedWrvuPercentile.toFixed(1)}th
                              </span>
                            </div>

                            <div className="text-xs text-gray-500 mt-2">
                              Percentiles based on {selectedSpecialty} market data
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Calculation Breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Calculation Breakdown</h4>
                  <dl className="space-y-2">
                    {/* Base Pay */}
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Base Pay:</dt>
                      <dd className="text-gray-900">
                        ${parseFloat(modelingState.basePayAmount.replace(/[^0-9.]/g, '') || '0').toLocaleString()}
                      </dd>
                    </div>

                    {/* Productivity Details */}
                    <div className="flex justify-between text-sm">
                      <dt className="text-gray-500">Actual wRVUs:</dt>
                      <dd className="text-gray-900">{parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0').toLocaleString()}</dd>
                    </div>

                    {modelingState.modelType === 'base-plus-productivity' ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Productivity Threshold:</dt>
                          <dd className="text-gray-900">{parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0').toLocaleString()}</dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">wRVUs Above Threshold:</dt>
                          <dd className={`font-medium ${
                            parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0') > parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0')
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {Math.max(0, parseFloat(modelingState.actualProductivity.replace(/[^0-9.]/g, '') || '0') - parseFloat(modelingState.productivityThreshold.replace(/[^0-9.]/g, '') || '0')).toLocaleString()}
                          </dd>
                        </div>
                        <div className="flex justify-between text-sm">
                          <dt className="text-gray-500">Conversion Factor:</dt>
                          <dd className="text-gray-900">
                            ${parseFloat(modelingState.conversionFactor.replace(/[^0-9.]/g, '') || '0').toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </dd>
                        </div>
                      </>
                    ) : (
                      modelingState.tierCalculations.map((calc, index) => (
                        <React.Fragment key={index}>
                          <div className="flex justify-between text-sm">
                            <dt className="text-gray-500">Tier {index + 1} ({calc.range}):</dt>
                            <dd className="text-gray-900">{calc.wRVUsInTier.toLocaleString()} RVUs @ ${modelingState.tierRates[index].conversionFactor.toFixed(2)}</dd>
                          </div>
                          {calc.incentiveAmount > 0 && (
                            <div className="flex justify-between text-sm pl-4">
                              <dt className="text-gray-500">Tier {index + 1} Incentive:</dt>
                              <dd className="text-green-600">${calc.incentiveAmount.toLocaleString()}</dd>
                            </div>
                          )}
                        </React.Fragment>
                      ))
                    )}

                    {/* Incentive Amount */}
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <div className="flex justify-between text-sm font-medium">
                        <dt className="text-gray-700">Productivity Incentive:</dt>
                        <dd className="text-green-600">
                          ${(modelingState.incentiveAmount || 0).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </dd>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {modelingState.modelType === 'base-plus-productivity'
                          ? 'Calculated as: wRVUs above threshold × Conversion Factor'
                          : 'Sum of incentives from all applicable tiers'}
                      </p>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          {selectedSpecialty && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Market Data Benchmarks</h4>
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Metric
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        25th
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        50th
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        75th
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        90th
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {[
                      { label: 'Total Cash Compensation', key: 'total' },
                      { label: 'Work RVUs', key: 'wrvu' },
                      { label: 'Conversion Factor', key: 'cf' }
                    ].map(({ label, key }) => {
                      const data = marketData.find(d => d.specialty === selectedSpecialty);
                      return (
                        <tr key={key} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {label}
                          </td>
                          {['25', '50', '75', '90'].map((percentile) => {
                            const value = data?.[`p${percentile}_${key}` as keyof MarketData];
                            return (
                              <td key={percentile} className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                {key === 'total'
                                  ? value?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
                                  : key === 'wrvu'
                                  ? value?.toLocaleString('en-US', { maximumFractionDigits: 1 })
                                  : value?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {calculationHistory.length > 0 ? (
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
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No calculation history</h3>
              <p className="mt-1 text-sm text-gray-500">
                Start by making some calculations in the TCC Calculator tab.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 
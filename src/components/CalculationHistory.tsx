'use client';

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ExclamationTriangleIcon, InformationCircleIcon, PrinterIcon, TrashIcon, ClockIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MarketData, MetricType } from '@/types/market-data';
import { ComplianceCheck, FairMarketValue } from '@/types/logs';

interface TCCComponent {
  id: string;
  name: string;
  value: string;
  notes: string;
  normalize: boolean;
  isPercentage?: boolean;
}

interface CalculationHistoryItem {
  id: string;
  timestamp: string;
  physicianName: string;
  specialty: string;
  metric: MetricType;
  value: number;
  actualValue: number;
  normalizedValue: number;
  fte: number;
  percentile: number;
  notes?: string;
  complianceChecks?: ComplianceCheck[];
  fairMarketValue?: FairMarketValue;
  tccComponents?: TCCComponent[];
}

interface Props {
  history: CalculationHistoryItem[];
  onDelete: (id: string) => void;
  formatValue: (value: string | number, metric?: MetricType) => string;
  getMetricLabel: (metric: MetricType) => string;
  marketData: MarketData[];
}

export function CalculationHistoryView({ history, onDelete, formatValue, getMetricLabel, marketData }: Props) {
  const [selectedReport, setSelectedReport] = useState<CalculationHistoryItem | null>(null);
  const [showComplianceDetails, setShowComplianceDetails] = useState<string | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [selectedFteRange, setSelectedFteRange] = useState<string>('all');

  // Get unique specialties from history
  const specialties = useMemo(() => {
    const unique = new Set(history.map(item => item.specialty));
    return Array.from(unique).sort();
  }, [history]);

  // Filter history based on selections
  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesSpecialty = selectedSpecialty === 'all' || item.specialty === selectedSpecialty;
      const matchesFte = selectedFteRange === 'all' || 
        (selectedFteRange === 'full' && item.fte === 1.0) ||
        (selectedFteRange === 'part' && item.fte < 1.0);
      return matchesSpecialty && matchesFte;
    });
  }, [history, selectedSpecialty, selectedFteRange]);

  const handlePrint = async (calculation: CalculationHistoryItem) => {
    try {
      localStorage.removeItem('printReportData');
      const printData = { calculation, marketData };
      localStorage.setItem('printReportData', JSON.stringify(printData));
      const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
      const printWindow = window.open(`${basePath}/print-report`, '_blank');
      if (!printWindow) {
        throw new Error('Pop-up window was blocked. Please allow pop-ups for this site.');
      }
      printWindow.focus();
    } catch (error) {
      console.error('Error preparing print report:', error);
      alert('There was an error preparing the print report: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const getTableMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case 'total':
        return 'TCC';
      case 'wrvu':
        return 'wRVUs';
      case 'cf':
        return 'CF';
      default:
        return '';
    }
  };

  if (!Array.isArray(history) || history.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No calculations yet</h3>
        <p className="mt-1 text-sm text-gray-500">Start by calculating a percentile above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <label htmlFor="specialty" className="text-sm font-medium text-gray-700">
            Specialty:
          </label>
          <select
            id="specialty"
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Specialties</option>
            {specialties.map(specialty => (
              <option key={specialty} value={specialty}>{specialty}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="fte" className="text-sm font-medium text-gray-700">
            FTE:
          </label>
          <select
            id="fte"
            value={selectedFteRange}
            onChange={(e) => setSelectedFteRange(e.target.value)}
            className="text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All FTE</option>
            <option value="full">1.0 FTE</option>
            <option value="part">Part-time</option>
          </select>
        </div>

        {(selectedSpecialty !== 'all' || selectedFteRange !== 'all') && (
          <button
            onClick={() => {
              setSelectedSpecialty('all');
              setSelectedFteRange('all');
            }}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
          >
            <XMarkIcon className="h-4 w-4" />
            <span>Clear filters</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Physician
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Specialty
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Metric
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Value
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                Percentile
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredHistory.map((calc) => (
              <React.Fragment key={calc.id}>
                <tr className={`hover:bg-gray-50 transition-colors ${showComplianceDetails === calc.id ? 'bg-gray-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {calc.metric === 'total' && (
                        <button
                          onClick={() => setShowComplianceDetails(showComplianceDetails === calc.id ? null : calc.id)}
                          className={`mr-2 p-1 rounded-full transition-colors ${
                            showComplianceDetails === calc.id 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                          }`}
                        >
                          <ChevronDownIcon 
                            className={`h-4 w-4 transition-transform duration-200 ${
                              showComplianceDetails === calc.id ? 'transform rotate-180' : ''
                            }`}
                          />
                        </button>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {calc.physicianName || 'Unknown'}
                        </div>
                        {calc.notes && (
                          <div className="text-xs text-gray-500 mt-0.5 italic">{calc.notes}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{calc.specialty || 'Unknown'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{getTableMetricLabel(calc.metric)}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-end">
                        <span className="font-medium text-gray-900">
                          {typeof calc.actualValue === 'number' && !isNaN(calc.actualValue) 
                            ? formatValue(calc.actualValue, calc.metric) 
                            : 'N/A'
                          }
                        </span>
                        <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {typeof calc.fte === 'number' && !isNaN(calc.fte) ? `${calc.fte.toFixed(2)} FTE` : '1.00 FTE'}
                        </span>
                      </div>
                      {(calc.metric === 'total' || calc.metric === 'wrvu') && calc.fte !== 1.0 && (
                        <div className="text-xs text-gray-500">
                          {typeof calc.value === 'number' && !isNaN(calc.value) 
                            ? `${formatValue(calc.value, calc.metric)} @ 1.0 FTE` 
                            : 'N/A'
                          }
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {typeof calc.percentile === 'number' && !isNaN(calc.percentile) 
                          ? `${calc.percentile.toFixed(1)}th` 
                          : 'N/A'
                        }
                      </div>
                      {calc.complianceChecks?.some(check => check?.type === 'flag') && (
                        <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handlePrint(calc)}
                        className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                        title="Print report"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDelete(calc.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                        title="Delete calculation"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Expanded Details Row */}
                {showComplianceDetails === calc.id && calc.metric === 'total' && (
                  <tr className="bg-gray-50">
                    <td colSpan={6} className="px-4 py-4">
                      {/* TCC Components */}
                      {Array.isArray(calc.tccComponents) && calc.tccComponents.length > 0 && (
                        <div className="space-y-4">
                          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg bg-white">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Component</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                                {calc.fte !== 1.0 && (
                                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">@ 1.0 FTE</th>
                                )}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {calc.tccComponents.map((component, index) => {
                                const value = parseFloat(component.value?.replace(/[^0-9.]/g, '') || '0');
                                const isBaseComponent = component.name.toLowerCase().includes('base');
                                const normalizedValue = component.normalize ? value / calc.fte : value;
                                
                                return (
                                  <tr key={component.id || index} className={isBaseComponent ? 'bg-blue-50/10' : ''}>
                                    <td className="px-4 py-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-sm text-gray-900">{component.name}</span>
                                        {component.normalize && (
                                          <span className="px-1 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                                            FTE
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                      <span className="text-sm text-gray-900">
                                        {component.isPercentage ? `${value}%` : formatValue(value, 'total')}
                                      </span>
                                    </td>
                                    {calc.fte !== 1.0 && (
                                      <td className="px-4 py-2 text-right">
                                        {component.normalize ? (
                                          <span className="text-sm text-gray-900">
                                            {component.isPercentage ? `${value}%` : formatValue(normalizedValue, 'total')}
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                              {/* Total Row */}
                              <tr className="bg-gray-50 font-medium">
                                <td className="px-4 py-2 text-sm text-gray-900">Total</td>
                                <td className="px-4 py-2 text-right text-sm text-gray-900">
                                  {formatValue(calc.actualValue, 'total')}
                                </td>
                                {calc.fte !== 1.0 && (
                                  <td className="px-4 py-2 text-right text-sm text-blue-600">
                                    {formatValue(calc.value, 'total')}
                                  </td>
                                )}
                              </tr>
                            </tbody>
                          </table>

                          {/* Compliance Checks */}
                          {calc.complianceChecks?.length > 0 && (
                            <div className="space-y-2">
                              {calc.complianceChecks.map((check) => (
                                <div
                                  key={check.id}
                                  className={`flex items-center px-3 py-2 rounded text-xs ${
                                    check.type === 'flag'
                                      ? 'bg-red-50 text-red-700'
                                      : check.type === 'warning'
                                      ? 'bg-yellow-50 text-yellow-700'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {check.type === 'flag' ? (
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  ) : check.type === 'warning' ? (
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  ) : (
                                    <InformationCircleIcon className="h-3 w-3 mr-1.5 flex-shrink-0" />
                                  )}
                                  {check.message}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ExclamationTriangleIcon, InformationCircleIcon, PrinterIcon, TrashIcon, ClockIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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

  const handlePrint = async (calculation: CalculationHistoryItem) => {
    try {
      // Clear any existing print data first
      localStorage.removeItem('printReportData');

      // Prepare the data
      const printData = {
        calculation,
        marketData
      };

      // Log the data size
      const dataSize = new Blob([JSON.stringify(printData)]).size;
      console.log('Print data size:', dataSize, 'bytes');

      // Store data in localStorage
      try {
        localStorage.setItem('printReportData', JSON.stringify(printData));
        console.log('Data successfully stored in localStorage');

        // Open the print report in a new window/tab AFTER data is stored
        const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
        console.log('Opening print window with path:', `${basePath}/print-report`);
        const printWindow = window.open(`${basePath}/print-report`, '_blank');
        
        if (!printWindow) {
          throw new Error('Pop-up window was blocked. Please allow pop-ups for this site.');
        }

        // Focus the new window
        printWindow.focus();
      } catch (storageError) {
        console.error('Error storing data in localStorage:', storageError);
        throw new Error('Failed to store print data. The data might be too large.');
      }

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
    <div>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr className="bg-gray-50">
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Physician
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Specialty
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentile
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th scope="col" className="relative px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {history.map((calc) => {
              if (!calc || typeof calc !== 'object') return null;
              
              return (
                <React.Fragment key={calc.id}>
                  <tr
                    className={`group hover:bg-gray-50 transition-colors ${showComplianceDetails === calc.id ? 'bg-gray-50' : ''}`}
                    onClick={() => setShowComplianceDetails(showComplianceDetails === calc.id ? null : calc.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        {calc.metric === 'total' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowComplianceDetails(showComplianceDetails === calc.id ? null : calc.id);
                            }}
                            className={`mr-2 p-1 rounded-full transition-colors ${
                              showComplianceDetails === calc.id 
                                ? 'bg-blue-100 text-blue-600' 
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }`}
                            title={showComplianceDetails === calc.id ? "Hide details" : "Show details"}
                          >
                            <ChevronDownIcon 
                              className={`h-4 w-4 transition-transform duration-200 ${
                                showComplianceDetails === calc.id ? 'transform rotate-180' : ''
                              }`}
                            />
                          </button>
                        ) : (
                          <div className="w-6 mr-2" /> /* Placeholder to maintain alignment */
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{calc.specialty || 'Unknown'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getTableMetricLabel(calc.metric)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="font-medium text-gray-900">
                            {typeof calc.actualValue === 'number' && !isNaN(calc.actualValue) ? formatValue(calc.actualValue, calc.metric) : 'N/A'}
                          </span>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                            {typeof calc.fte === 'number' && !isNaN(calc.fte) ? `${calc.fte.toFixed(2)} FTE` : '1.00 FTE'}
                          </span>
                        </div>
                        {(calc.metric === 'total' || calc.metric === 'wrvu') && calc.fte !== 1.0 && (
                          <div className="flex items-center justify-end text-xs">
                            <span className="text-gray-700 font-medium">
                              {typeof calc.value === 'number' && !isNaN(calc.value) ? formatValue(calc.value, calc.metric) : 'N/A'}
                            </span>
                            <span className="ml-1 text-gray-500">normalized @ 1.0 FTE</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {typeof calc.percentile === 'number' && !isNaN(calc.percentile) ? `${calc.percentile.toFixed(1)}th` : 'N/A'}
                      </div>
                      {calc.complianceChecks && Array.isArray(calc.complianceChecks) && calc.complianceChecks.length > 0 && (
                        <div className="inline-flex ml-2">
                          {calc.complianceChecks.some(check => check?.type === 'flag') && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                          )}
                          {calc.complianceChecks.some(check => check?.type === 'warning') && (
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {format(new Date(calc.timestamp), 'MMM d, yyyy h:mm a')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {calc.metric === 'total' && Array.isArray(calc.tccComponents) && calc.tccComponents.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowComplianceDetails(showComplianceDetails === calc.id ? null : calc.id);
                            }}
                            className={`text-sm flex items-center px-2 py-1 rounded transition-colors ${
                              showComplianceDetails === calc.id
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-500 hover:text-gray-700 group-hover:bg-gray-50'
                            }`}
                          >
                            <span className="mr-1">{showComplianceDetails === calc.id ? 'Hide' : 'View'} Details</span>
                            <ChevronDownIcon 
                              className={`h-3 w-3 transition-transform duration-200 ${
                                showComplianceDetails === calc.id ? 'transform rotate-180' : ''
                              }`}
                            />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePrint(calc);
                          }}
                          className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-1"
                          title="Print report"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(calc.id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-full p-1"
                          title="Delete calculation"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* TCC Components Breakdown */}
                  {showComplianceDetails === calc.id && calc.metric === 'total' && Array.isArray(calc.tccComponents) && calc.tccComponents.length > 0 && (
                    <tr className="animate-fadeIn">
                      <td colSpan={7} className="px-4 py-3">
                        {/* Compact Summary Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900">Components</h4>
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600"
                              title="Components breakdown with FTE adjustments where applicable"
                            >
                              <InformationCircleIcon className="h-4 w-4" />
                            </button>
                          </div>
                          {calc.fte !== 1.0 && (
                            <div className="flex items-center text-sm">
                              <span className="text-gray-700 font-medium">{calc.fte.toFixed(2)} FTE</span>
                              <span className="mx-2 text-gray-400">→</span>
                              <span className="text-gray-700 font-medium">1.0 FTE Normalized</span>
                            </div>
                          )}
                        </div>

                        {/* Compact Components Table */}
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead>
                              <tr>
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Component</th>
                                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Value</th>
                                {calc.fte !== 1.0 && (
                                  <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Normalized</th>
                                )}
                                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                              {calc.tccComponents.map((component, index) => {
                                if (!component || typeof component !== 'object') return null;
                                
                                const value = parseFloat(component.value?.replace(/[^0-9.]/g, '') || '0');
                                const isBaseComponent = component.name.toLowerCase().includes('base');
                                const isOverhead = component.name.toLowerCase().includes('overhead');
                                const normalizedValue = component.normalize ? value / (calc.fte || 1) : value;
                                
                                // Calculate dollar value if it's a percentage
                                const baseComponent = calc.tccComponents?.find(c => 
                                  c.name.toLowerCase().includes('base')
                                );
                                const baseValue = baseComponent ? parseFloat(baseComponent.value?.replace(/[^0-9.]/g, '') || '0') : 0;
                                const dollarValue = component.isPercentage ? (value / 100) * baseValue : value;
                                const normalizedDollarValue = component.normalize ? dollarValue / (calc.fte || 1) : dollarValue;
                                
                                return (
                                  <tr 
                                    key={component.id || index}
                                    className={`hover:bg-gray-50 transition-colors ${isBaseComponent ? 'bg-blue-50/10 font-medium' : ''}`}
                                  >
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      <div className="flex items-center">
                                        <span className="text-sm text-gray-900">
                                          {component.name}
                                        </span>
                                        {component.normalize && (
                                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-gray-100 text-gray-700">
                                            FTE
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-right">
                                      <div className="flex flex-col items-end">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-sm text-gray-900">
                                            {component.isPercentage ? `${value}%` : formatValue(value, 'total')}
                                          </span>
                                          {component.isPercentage && (
                                            <span className="text-sm text-gray-500">
                                              ({formatValue(dollarValue, 'total')})
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    {calc.fte !== 1.0 && (
                                      <td className="px-3 py-2 whitespace-nowrap text-right">
                                        {component.normalize ? (
                                          <div className="flex flex-col items-end">
                                            <span className="text-sm text-gray-700">
                                              {component.isPercentage ? `${value}%` : formatValue(normalizedValue, 'total')}
                                            </span>
                                            {component.isPercentage && (
                                              <span className="text-xs text-gray-500">
                                                {formatValue(normalizedDollarValue, 'total')}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-sm text-gray-400">-</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {isOverhead ? (
                                        <span>Based on Base Pay</span>
                                      ) : component.notes ? (
                                        component.notes
                                      ) : null}
                                    </td>
                                  </tr>
                                );
                              })}
                              {/* Total Row */}
                              <tr className="border-t border-gray-200 font-medium">
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">Total</td>
                                <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-gray-900">
                                  {formatValue(calc.actualValue || 0, 'total')}
                                </td>
                                {calc.fte !== 1.0 && (
                                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm text-blue-600">
                                    {formatValue(calc.value || 0, 'total')}
                                  </td>
                                )}
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                  {calc.fte !== 1.0 ? `Normalized from ${calc.fte.toFixed(2)} FTE` : ''}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Compliance Warning - Only show if there are issues */}
                        {Array.isArray(calc.complianceChecks) && calc.complianceChecks.length > 0 && (
                          <div className="mt-3">
                            {calc.complianceChecks.map((check) => {
                              if (!check || typeof check !== 'object') return null;
                              
                              return (
                                <div
                                  key={check.id}
                                  className={`flex items-center px-3 py-2 rounded-md text-sm ${
                                    check.type === 'flag'
                                      ? 'text-red-600'
                                      : check.type === 'warning'
                                      ? 'text-yellow-600'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  {check.type === 'flag' ? (
                                    <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                  ) : check.type === 'warning' ? (
                                    <ExclamationTriangleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                  ) : (
                                    <InformationCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                                  )}
                                  {check.message}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
'use client';

import { CalculationHistory, MarketData } from '@/types/logs';
import { ClockIcon, TrashIcon, PrinterIcon, DocumentTextIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useState } from 'react';
import Link from 'next/link';
import React from 'react';

interface CalculationHistoryProps {
  history: CalculationHistory[];
  marketData: MarketData[];
  onDelete: (id: string) => void;
  formatValue: (value: number, metric: 'total' | 'wrvu' | 'cf') => string;
  getMetricLabel: (metric: 'total' | 'wrvu' | 'cf') => string;
}

export function CalculationHistoryView({
  history,
  marketData,
  onDelete,
  formatValue,
  getMetricLabel
}: CalculationHistoryProps) {
  const [selectedReport, setSelectedReport] = useState<CalculationHistory | null>(null);
  const [showComplianceDetails, setShowComplianceDetails] = useState<string | null>(null);

  const handlePrint = (calculation: CalculationHistory) => {
    // Store the calculation data in sessionStorage
    sessionStorage.setItem('printCalculation', JSON.stringify({
      calculation,
      marketData
    }));

    // Open the print report in a new window/tab with the correct base path
    const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';
    const printWindow = window.open(`${basePath}/print-report`, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  const getTableMetricLabel = (metric: 'total' | 'wrvu' | 'cf'): string => {
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

  if (history.length === 0) {
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
            {history.map((calc) => (
              <React.Fragment key={calc.id}>
                <tr
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setShowComplianceDetails(showComplianceDetails === calc.id ? null : calc.id)}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {calc.physicianName}
                      </div>
                      {calc.notes && (
                        <div className="text-xs text-gray-500 mt-0.5 italic">{calc.notes}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{calc.specialty}</div>
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
                          <span className="text-blue-600 font-medium">
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
                    {calc.complianceChecks && calc.complianceChecks.length > 0 && (
                      <div className="inline-flex ml-2">
                        {calc.complianceChecks.some(check => check.type === 'flag') && (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                        {calc.complianceChecks.some(check => check.type === 'warning') && (
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
                {showComplianceDetails === calc.id && (
                  (calc.complianceChecks?.length ?? 0) > 0 || calc.fairMarketValue
                ) && (
                  <tr className="bg-gray-50">
                    <td colSpan={7} className="px-4 py-3">
                      <div className="text-sm">
                        {calc.complianceChecks?.map((check) => (
                          <div
                            key={check.id}
                            className={`flex items-center space-x-2 mb-2 ${
                              check.type === 'flag'
                                ? 'text-red-700'
                                : check.type === 'warning'
                                ? 'text-yellow-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {check.type === 'flag' ? (
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            ) : check.type === 'warning' ? (
                              <ExclamationTriangleIcon className="h-4 w-4" />
                            ) : (
                              <InformationCircleIcon className="h-4 w-4" />
                            )}
                            <span>{check.message}</span>
                          </div>
                        ))}
                        {calc.fairMarketValue && (
                          <div className="mt-2 text-gray-600">
                            <span className="font-medium">Fair Market Value Range: </span>
                            {calc.fairMarketValue.min?.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }) || 'N/A'} - {calc.fairMarketValue.max?.toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                              maximumFractionDigits: 0,
                            }) || 'N/A'}
                            <span className="text-gray-500 ml-2">
                              (Source: {calc.fairMarketValue.source || 'Unknown'})
                            </span>
                          </div>
                        )}
                      </div>
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
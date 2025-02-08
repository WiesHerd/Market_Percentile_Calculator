'use client';

import { CalculationHistory, MarketData } from '@/types/logs';
import { ClockIcon, TrashIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { useState } from 'react';

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

  const handlePrint = (calculation: CalculationHistory) => {
    // Store the data and open print preview
    sessionStorage.setItem('printCalculation', JSON.stringify({
      calculation,
      marketData
    }));
    
    // Open in new window and focus
    const printWindow = window.open('/print-report', '_blank');
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
              <tr
                key={calc.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{calc.physicianName}</div>
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
                  <div className="text-sm font-medium text-gray-900">
                    {formatValue(calc.value, calc.metric)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {calc.percentile.toFixed(1)}th
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {format(new Date(calc.timestamp), 'MMM d, yyyy h:mm a')}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      onClick={() => handlePrint(calc)}
                      className="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full p-1"
                      title="Print report"
                    >
                      <PrinterIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(calc.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 rounded-full p-1"
                      title="Delete calculation"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
'use client';

import { useEffect, useState } from 'react';
import { CalculationHistory, MarketData } from '@/types/logs';
import { format } from 'date-fns';
import { PrintReportGraph } from '@/components/PrintReportGraph';

export default function PrintReport() {
  const [data, setData] = useState<{
    calculation: CalculationHistory;
    marketData: MarketData[];
    timestamp: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Get the data from localStorage
      const storedData = localStorage.getItem('printReportData');

      if (!storedData) {
        console.error('No print data found in localStorage');
        setError(
          'No calculation data found. This page cannot be accessed directly.\n\n' +
          'To generate a report:\n' +
          '1. Go to the calculator page\n' +
          '2. Find your calculation in the history\n' +
          '3. Click the printer icon next to it\n\n' +
          'If you clicked the print icon and still see this message, please:\n' +
          '• Check if pop-ups are blocked\n' +
          '• Try clicking the print icon again\n' +
          '• Ensure your browser allows pop-ups'
        );
        return;
      }

      // Parse the data
      const decodedData = JSON.parse(storedData);
      
      if (!decodedData.calculation || !decodedData.marketData || !decodedData.timestamp) {
        console.error('Invalid data structure:', decodedData);
        setError(
          'Invalid data format.\n\n' +
          'This could be due to:\n' +
          '• Corrupted data format\n' +
          '• Invalid data structure\n\n' +
          'Please try generating a new report from the calculator page.'
        );
        return;
      }

      // Check if the data is too old (more than 5 minutes)
      const now = new Date().getTime();
      if (now - decodedData.timestamp > 5 * 60 * 1000) {
        setError(
          'The print data has expired.\n\n' +
          'For security reasons, print data is only valid for 5 minutes.\n' +
          'Please generate a new report from the calculator page.'
        );
        return;
      }

      // Set the data
      setData(decodedData);

      // Clear the print data from localStorage
      localStorage.removeItem('printReportData');

    } catch (err) {
      console.error('Error loading print data:', err);
      setError(
        'Error loading calculation data.\n\n' +
        'This could be due to:\n' +
        '• Corrupted data\n' +
        '• Invalid data format\n' +
        '• Browser limitations\n\n' +
        'Please try generating a new report from the calculator page.'
      );
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Cannot Generate Report</h1>
            <div className="text-gray-600 mb-6 whitespace-pre-line">{error}</div>
            <button
              onClick={() => window.location.href = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '/'}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Calculator
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full space-y-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-4 text-xl font-medium text-gray-900">Loading report...</h2>
          </div>
        </div>
      </div>
    );
  }

  const { calculation, marketData } = data;
  const specialtyData = marketData.find(d => d.specialty === calculation.specialty);

  const formatValue = (value: number, metric: 'total' | 'wrvu' | 'cf'): string => {
    if (metric === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    } else if (metric === 'total') {
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

  const getMetricLabel = (metric: 'total' | 'wrvu' | 'cf'): string => {
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

  const handlePrint = () => {
    window.print();
  };

  const basePath = process.env.NODE_ENV === 'production' ? '/Market_Percentile_Calculator' : '';

  return (
    <div className="print-container">
      <div className="print-content max-w-[8.5in] mx-auto">
        {/* Navigation Buttons - Hidden in print */}
        <div className="screen-only mb-8">
          <div className="flex justify-between items-center">
            {/* Back Button - Secondary Action */}
            <button
              onClick={() => window.location.href = `${basePath}/`}
              className="w-40 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>

            {/* Print Button - Primary Action */}
            <button
              onClick={handlePrint}
              className="w-40 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Report
            </button>
          </div>
        </div>

        {/* Header */}
        <div className="mb-4 border-b border-gray-300 pb-2">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1 text-left">Provider Compensation Analysis</h1>
              <div className="flex items-center gap-2 text-base">
                <span className="font-medium text-gray-800">{calculation.physicianName}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{calculation.specialty}</span>
              </div>
            </div>
            <div className="flex items-center justify-center bg-blue-600 w-12 h-12 rounded-lg">
              <span className="text-white font-bold text-xl">WH</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-white rounded border border-gray-300 p-2 shadow-sm">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {calculation.metric === 'total' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : calculation.metric === 'wrvu' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
              {getMetricLabel(calculation.metric)}
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatValue(calculation.value || 0, calculation.metric)}
            </div>
          </div>
          <div className="bg-white rounded border border-gray-300 p-2 shadow-sm">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Market Position
            </div>
            <div className="flex items-baseline mt-1">
              <span className="text-xl font-bold text-blue-600">{(calculation.percentile || 0).toFixed(1)}</span>
              <span className="text-sm text-blue-600 ml-1">th percentile</span>
            </div>
          </div>
        </div>

        {/* Graph Section */}
        <div className="mb-4 bg-white rounded border border-gray-300 shadow-sm overflow-hidden w-full">
          <div className="px-2 py-1 border-b border-gray-300 bg-gray-50">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Distribution Analysis</div>
          </div>
          <div className="p-2">
            <div className="h-[280px] w-full">
              <PrintReportGraph
                marketData={marketData}
                selectedSpecialty={calculation.specialty}
                selectedMetric={calculation.metric}
                inputValue={(calculation.value || 0).toString()}
                calculatedPercentile={calculation.percentile || 0}
                formatValue={(value) => {
                  const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
                  return formatValue(numValue, calculation.metric);
                }}
                getMetricLabel={getMetricLabel}
              />
            </div>
          </div>
        </div>

        {/* Market Reference Data Section */}
        {specialtyData && (
          <div className="mb-4 bg-white rounded border border-gray-300 shadow-sm overflow-hidden w-full">
            <div className="px-2 py-1 border-b border-gray-300 bg-gray-50">
              <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Market Reference Data</div>
            </div>
            <div className="p-2">
              <table className="min-w-full border border-gray-200 rounded-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="w-1/4 px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider text-left border-r border-gray-200">
                      Percentile
                    </th>
                    <th className="w-1/4 px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right border-r border-gray-200">
                      Total Cash<br />Compensation
                    </th>
                    <th className="w-1/4 px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right border-r border-gray-200">
                      Work RVUs
                    </th>
                    <th className="w-1/4 px-3 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">
                      Conversion<br />Factor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {[25, 50, 75, 90].map((percentile) => {
                    const total = Number(specialtyData[`p${percentile}_total` as keyof MarketData]);
                    const wrvu = Number(specialtyData[`p${percentile}_wrvu` as keyof MarketData]);
                    const cf = Number(specialtyData[`p${percentile}_cf` as keyof MarketData]);
                    
                    return (
                      <tr 
                        key={percentile} 
                        className={percentile === 90 ? 'bg-blue-50' : 'bg-white'}
                      >
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 border-r border-gray-200">
                          {percentile}th Percentile
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right border-r border-gray-200">
                          {formatValue(total, 'total')}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right border-r border-gray-200">
                          {wrvu.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 text-right">
                          ${cf.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FTE Normalization Disclosure */}
        {calculation.fte !== 1.0 && (calculation.metric === 'total' || calculation.metric === 'wrvu') && (
          <div className="mb-4 bg-blue-50 rounded border border-blue-200 p-2">
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">FTE Normalization Note:</div>
              <p>
                The entered value of {formatValue(calculation.actualValue || 0, calculation.metric)} 
                at {calculation.fte.toFixed(2)} FTE has been normalized to {formatValue(calculation.value || 0, calculation.metric)} 
                at 1.0 FTE for market comparison purposes.
                {calculation.metric === 'wrvu' ? ' (Work RVUs)' : ' (Total Cash Compensation)'}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 pt-1 border-t border-gray-300">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="font-medium">Provider Percentile Calculator</div>
            <div>Generated on {format(new Date(), 'MMMM d, yyyy h:mm a')}</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media screen {
          .print-container {
            background: #f8fafc;
            min-height: 11in;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin: 0 auto;
            padding: 0.75rem;
          }
          .print-content {
            display: flex;
            flex-direction: column;
            min-height: 9.5in;
            justify-content: space-between;
          }
          .screen-only {
            display: block;
          }
        }

        @media print {
          @page {
            size: letter portrait;
            margin: 0.3in;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: white;
          }

          .print-container {
            width: 100%;
            height: 100%;
            background: white;
            padding: 0;
          }

          .print-content {
            display: flex;
            flex-direction: column;
            height: 100%;
            justify-content: space-between;
          }

          .screen-only {
            display: none !important;
          }

          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
} 
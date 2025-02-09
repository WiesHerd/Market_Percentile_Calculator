'use client';

import { CalculationHistory, MarketData, MetricType } from '@/types/logs';
import { format } from 'date-fns';
import { PercentileGraph } from './PercentileGraph';

interface ProviderReportProps {
  calculation: CalculationHistory;
  marketData: MarketData[];
  formatValue: (value: number, metric: MetricType) => string;
  getMetricLabel: (metric: MetricType) => string;
}

export function ProviderReport({
  calculation,
  marketData,
  formatValue,
  getMetricLabel
}: ProviderReportProps) {
  const specialtyData = marketData.find(d => d.specialty === calculation.specialty);
  if (!specialtyData) return null;

  const formatValueWrapper = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return formatValue(numValue, calculation.metric);
  };
  
  return (
    <div className="print-only">
      <div className="report-page bg-white p-8">
        {/* App Title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Physician Compensation Calculator</h1>
          <p className="text-gray-600 mt-2">Calculate and analyze physician compensation percentiles across specialties</p>
        </div>

        {/* Provider Summary */}
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">{calculation.physicianName}</h2>
              <p className="text-lg text-gray-600 mt-1">{calculation.specialty}</p>
              <p className="text-gray-600 mt-1">{getMetricLabel(calculation.metric)}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">
                {calculation.percentile.toFixed(1)}th
                <span className="text-base font-normal ml-1">percentile</span>
              </div>
              <p className="text-lg text-gray-600 mt-1">
                {formatValue(calculation.value, calculation.metric)}
              </p>
            </div>
          </div>
          {calculation.notes && (
            <p className="text-gray-600 italic mt-4 text-sm">{calculation.notes}</p>
          )}
        </div>

        {/* Value Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white rounded border border-gray-300 p-3 shadow-sm">
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
              {getMetricLabel(calculation.metric)} at {calculation.fte.toFixed(2)} FTE
            </div>
            <div className="text-xl font-bold text-gray-900 mt-1">
              {formatValue(calculation.actualValue, calculation.metric)}
            </div>
            {(calculation.metric === 'total' || calculation.metric === 'wrvu') && calculation.fte !== 1.0 && (
              <div className="text-sm text-blue-600 mt-1">
                {formatValue(calculation.value, calculation.metric)} @ 1.0 FTE
              </div>
            )}
          </div>
          <div className="bg-white rounded border border-gray-300 p-3 shadow-sm">
            <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Percentile Result
            </div>
            <div className="text-xl font-bold text-blue-600 mt-1">
              {calculation.percentile.toFixed(1)}th
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {calculation.metric === 'cf' ? 
                'Conversion Factor is compared directly' : 
                'Based on 1.0 FTE equivalent value'}
            </div>
          </div>
        </div>

        {/* Graph */}
        <div className="mb-6" style={{ height: '450px' }}>
          <PercentileGraph
            marketData={marketData}
            selectedSpecialty={calculation.specialty}
            selectedMetric={calculation.metric}
            inputValue={calculation.value.toString()}
            calculatedPercentile={calculation.percentile}
            formatValue={formatValueWrapper}
            getMetricLabel={getMetricLabel}
          />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8 pt-4 border-t">
          Generated on {format(new Date(calculation.timestamp), 'MMMM d, yyyy')}
        </div>
      </div>
    </div>
  );
}

// Add print styles
const printStyles = `
  @media print {
    /* Hide everything except the report */
    body > *:not(.print-only) {
      display: none !important;
    }
    
    /* Report page settings */
    @page {
      size: letter portrait;
      margin: 0.5in;
    }

    /* Report styles */
    .print-only {
      display: block !important;
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
      background: white;
    }

    .report-page {
      width: 8.5in;
      min-height: 11in;
      margin: 0 auto;
      background: white;
      position: relative;
    }

    /* Ensure colors print properly */
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* Remove any scroll bars */
    html, body {
      height: 100%;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden;
    }
  }

  /* Hide report in normal view */
  @media screen {
    .print-only {
      display: none;
    }
  }
`;

// Add the styles to the document
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = printStyles;
  document.head.appendChild(style);
} 
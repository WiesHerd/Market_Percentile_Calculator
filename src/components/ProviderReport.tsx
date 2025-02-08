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
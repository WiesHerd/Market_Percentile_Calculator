'use client';

import React from 'react';
import { MarketData, MetricType } from '@/types/logs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';

interface PercentileGraphProps {
  marketData: MarketData[];
  selectedSpecialty: string;
  selectedMetric: MetricType;
  inputValue: string;
  calculatedPercentile: number;
  formatValue: (value: string | number) => string;
  getMetricLabel: (metric: MetricType) => string;
}

export function PercentileGraph({
  marketData,
  selectedSpecialty,
  selectedMetric,
  inputValue,
  calculatedPercentile,
  formatValue,
  getMetricLabel
}: PercentileGraphProps) {
  // Early return if any required props are missing
  if (!marketData || !selectedSpecialty || !selectedMetric || !inputValue || calculatedPercentile === null) {
    return null;
  }

  const data = marketData.find(d => d.specialty === selectedSpecialty);
  if (!data) return null;

  const p25 = data[`p25_${selectedMetric}` as keyof MarketData] as number;
  const p50 = data[`p50_${selectedMetric}` as keyof MarketData] as number;
  const p75 = data[`p75_${selectedMetric}` as keyof MarketData] as number;
  const p90 = data[`p90_${selectedMetric}` as keyof MarketData] as number;

  // Validate that all required values are present
  if ([p25, p50, p75, p90].some(v => v === undefined || v === null || isNaN(v))) {
    console.error('Missing or invalid market data values');
    return null;
  }

  // Create curve data points for smooth visualization
  const curveData = [
    { percentile: 0, value: p25 * 0.8 }, // Start at 80% of p25 for better curve
    { percentile: 25, value: p25 },
    { percentile: 50, value: p50 },
    { percentile: 75, value: p75 },
    { percentile: 90, value: p90 },
    { percentile: 100, value: p90 * 1.1 } // Extend slightly beyond p90
  ];

  const inputValueNum = parseFloat(inputValue.replace(/[^0-9.]/g, ''));
  if (isNaN(inputValueNum)) {
    console.error('Invalid input value');
    return null;
  }

  const formatYAxis = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '';
    
    if (selectedMetric === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    } else if (selectedMetric === 'total') {
      return `$${((value || 0) / 1000).toFixed(0)}K`;
    } else {
      return `$${(value || 0).toFixed(2)}`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Market Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-base font-semibold text-gray-900 mb-3">
          Market Reference Data - <span className="text-blue-600">{selectedSpecialty}</span>
        </div>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-r">
                  Metric
                </th>
                {[25, 50, 75, 90].map((percentile) => (
                  <th key={percentile} scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-r last:border-r-0">
                    {percentile}th
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  Total Cash Compensation
                </td>
                {[25, 50, 75, 90].map((percentile) => {
                  const value = data[`p${percentile}_total` as keyof MarketData] as number;
                  return (
                    <td key={percentile} className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium border-r last:border-r-0 ${percentile === 50 ? 'text-blue-600' : 'text-gray-900'}`}>
                      {value.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        maximumFractionDigits: 0
                      })}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  Work RVUs
                </td>
                {[25, 50, 75, 90].map((percentile) => {
                  const value = data[`p${percentile}_wrvu` as keyof MarketData] as number;
                  return (
                    <td key={percentile} className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium border-r last:border-r-0 ${percentile === 50 ? 'text-blue-600' : 'text-gray-900'}`}>
                      {value.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                    </td>
                  );
                })}
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 border-r">
                  Conversion Factor
                </td>
                {[25, 50, 75, 90].map((percentile) => {
                  const value = data[`p${percentile}_cf` as keyof MarketData] as number;
                  return (
                    <td key={percentile} className={`px-4 py-3 whitespace-nowrap text-sm text-right font-medium border-r last:border-r-0 ${percentile === 50 ? 'text-blue-600' : 'text-gray-900'}`}>
                      {value.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Graph */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="text-base font-semibold text-gray-900 mb-3">
          DISTRIBUTION ANALYSIS
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={curveData} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
              </linearGradient>
            </defs>

            {/* Background shading */}
            <ReferenceArea x1={0} x2={100} fill="#f8fafc" fillOpacity={0.2} />
            
            <XAxis 
              dataKey="percentile" 
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: '#64748b' }}
              ticks={[0, 25, 50, 75, 90, 100]}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
            />
            
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={formatYAxis}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={{ stroke: '#e2e8f0' }}
              width={70}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={1.5}
              fill="url(#colorValue)"
            />

            {/* Key percentile markers */}
            {[25, 50, 75, 90].map((percentile) => {
              const value = data[`p${percentile}_${selectedMetric}` as keyof MarketData] as number;
              return (
                <ReferenceDot
                  key={percentile}
                  x={percentile}
                  y={value}
                  r={4}
                  fill="#6366f1"
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  <Label
                    value={formatYAxis(value)}
                    position="top"
                    offset={10}
                    style={{
                      fontSize: '12px',
                      fill: '#6366f1',
                      fontWeight: 500
                    }}
                  />
                </ReferenceDot>
              );
            })}
            
            {/* User's value reference line */}
            <ReferenceLine
              x={calculatedPercentile}
              stroke="#dc2626"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{
                value: `${formatYAxis(inputValueNum)} (${(calculatedPercentile || 0).toFixed(1)}th)`,
                position: 'left',
                fill: '#dc2626',
                fontSize: 12,
                fontWeight: 500,
                dx: -10,
                dy: -10
              }}
            />
            <ReferenceDot
              x={calculatedPercentile}
              y={inputValueNum}
              r={4}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={2}
            />

            {/* Tooltips */}
            <Tooltip
              formatter={(value: number) => [formatYAxis(value)]}
              labelFormatter={(label: number) => `${label}th Percentile`}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e2e8f0',
                borderRadius: '0.375rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem'
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 
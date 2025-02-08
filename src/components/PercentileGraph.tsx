'use client';

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
  const data = marketData.find(d => d.specialty === selectedSpecialty);
  if (!data) return null;

  const p25 = data[`p25_${selectedMetric}` as keyof MarketData] as number;
  const p50 = data[`p50_${selectedMetric}` as keyof MarketData] as number;
  const p75 = data[`p75_${selectedMetric}` as keyof MarketData] as number;
  const p90 = data[`p90_${selectedMetric}` as keyof MarketData] as number;

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

  // Calculate the value at the calculated percentile using linear interpolation
  const getValueAtPercentile = (percentile: number) => {
    if (percentile <= 25) {
      return p25 * 0.8 + (p25 - p25 * 0.8) * (percentile / 25);
    } else if (percentile <= 50) {
      return p25 + (p50 - p25) * ((percentile - 25) / 25);
    } else if (percentile <= 75) {
      return p50 + (p75 - p50) * ((percentile - 50) / 25);
    } else if (percentile <= 90) {
      return p75 + (p90 - p75) * ((percentile - 75) / 15);
    } else {
      return p90 + (p90 * 0.1) * ((percentile - 90) / 10);
    }
  };

  const formatYAxis = (value: number) => {
    if (selectedMetric === 'wrvu') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
    } else if (selectedMetric === 'total') {
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  return (
    <div className="w-full h-[300px] bg-white rounded-lg shadow-sm border border-gray-200 p-3 mx-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={curveData} margin={{ top: 20, right: 35, left: 65, bottom: 25 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.05}/>
            </linearGradient>
          </defs>

          {/* Background shading for percentile ranges */}
          <ReferenceArea x1={0} x2={25} fill="#f8fafc" fillOpacity={0.4} />
          <ReferenceArea x1={25} x2={50} fill="#f1f5f9" fillOpacity={0.4} />
          <ReferenceArea x1={50} x2={75} fill="#f8fafc" fillOpacity={0.4} />
          <ReferenceArea x1={75} x2={90} fill="#f1f5f9" fillOpacity={0.4} />
          <ReferenceArea x1={90} x2={100} fill="#f8fafc" fillOpacity={0.4} />
          
          <XAxis 
            dataKey="percentile" 
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#64748b' }}
            ticks={[0, 25, 50, 75, 90, 100]}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            label={{ 
              value: 'Percentile', 
              position: 'insideBottom',
              offset: -15,
              style: { 
                textAnchor: 'middle',
                fontSize: '11px',
                fontWeight: 500,
                fill: '#475569'
              }
            }}
          />
          
          <YAxis
            tick={{ fontSize: 10, fill: '#64748b' }}
            tickFormatter={formatYAxis}
            axisLine={{ stroke: '#cbd5e1' }}
            tickLine={{ stroke: '#cbd5e1' }}
            width={50}
            label={{ 
              value: getMetricLabel(selectedMetric),
              angle: -90,
              position: 'left',
              offset: 40,
              style: { 
                textAnchor: 'middle',
                fontSize: '11px',
                fontWeight: 500,
                fill: '#475569'
              }
            }}
          />
          
          {/* Key percentile markers */}
          {[25, 50, 75, 90].map((percentile) => {
            const value = data[`p${percentile}_${selectedMetric}` as keyof MarketData] as number;
            return (
              <ReferenceDot
                key={percentile}
                x={percentile}
                y={value}
                r={3}
                fill="#6366f1"
                stroke="#ffffff"
                strokeWidth={2}
              >
                <Label
                  value={formatYAxis(value)}
                  position="top"
                  offset={8}
                  style={{
                    fontSize: '9px',
                    fill: '#4f46e5',
                    fontWeight: 500,
                    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
                    backgroundColor: 'white',
                    padding: '1px 3px',
                    borderRadius: '2px'
                  }}
                />
              </ReferenceDot>
            );
          })}
          
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            strokeWidth={2.5}
            fill="url(#colorValue)"
          />
          
          {/* Reference line for calculated percentile */}
          {calculatedPercentile !== null && (
            <g>
              <ReferenceLine
                segment={[
                  { x: calculatedPercentile, y: 0 },
                  { x: calculatedPercentile, y: getValueAtPercentile(calculatedPercentile) }
                ]}
                stroke="#dc2626"
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  position: 'insideBottomRight',
                  offset: 15,
                  value: selectedMetric === 'total' 
                    ? `$${(inputValueNum / 1000).toFixed(0)}K (${calculatedPercentile.toFixed(1)}th)`
                    : `${formatValue(inputValueNum)} (${calculatedPercentile.toFixed(1)}th)`,
                  fill: '#dc2626',
                  fontSize: 13,
                  fontWeight: 600,
                  style: {
                    backgroundColor: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
                  }
                }}
              />
              <circle
                cx={calculatedPercentile}
                cy={getValueAtPercentile(calculatedPercentile)}
                r={4}
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </g>
          )}
          
          <Tooltip 
            formatter={(value: number) => [formatValue(value), getMetricLabel(selectedMetric)]}
            labelFormatter={(label: number) => `${label}th Percentile`}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}
            itemStyle={{
              color: '#1e293b',
              fontSize: '0.875rem'
            }}
            labelStyle={{
              color: '#64748b',
              fontSize: '0.75rem',
              marginBottom: '0.25rem'
            }}
            cursor={{ stroke: '#94a3b8', strokeWidth: 1 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
} 
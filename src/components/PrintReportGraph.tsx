import { MarketData, MetricType } from '@/types/logs';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceDot,
  ReferenceLine,
  ReferenceArea,
  Label
} from 'recharts';

interface PrintReportGraphProps {
  marketData: MarketData[];
  selectedSpecialty: string;
  selectedMetric: MetricType;
  inputValue: string;
  calculatedPercentile: number;
  formatValue: (value: string | number) => string;
  getMetricLabel: (metric: MetricType) => string;
}

export function PrintReportGraph({
  marketData,
  selectedSpecialty,
  selectedMetric,
  inputValue,
  calculatedPercentile,
  formatValue,
  getMetricLabel
}: PrintReportGraphProps) {
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
      return `$${(value / 1000).toFixed(0)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={curveData} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
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
        
        {/* Reference line for calculated percentile */}
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
      </AreaChart>
    </ResponsiveContainer>
  );
} 
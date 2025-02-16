import { MarketData, MetricType } from '@/types/logs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, ChartBarIcon } from '@heroicons/react/24/outline';

interface SpecialtyComparisonViewProps {
  specialties: string[];
  marketData: MarketData[];
  selectedMetric: MetricType;
  formatValue: (value: number, metric: MetricType) => string;
}

export function SpecialtyComparisonView({
  specialties,
  marketData,
  selectedMetric,
  formatValue
}: SpecialtyComparisonViewProps) {
  const [specialty1, specialty2] = specialties;
  const data1 = marketData.find(d => d.specialty === specialty1);
  const data2 = marketData.find(d => d.specialty === specialty2);

  if (!data1 || !data2) return null;

  // Calculate market statistics for all metrics
  const getMarketStats = (metric: MetricType) => {
    const percentiles = ['p25', 'p50', 'p75', 'p90'];
    return percentiles.map(percentile => {
      const value1 = data1[`${percentile}_${metric}` as keyof MarketData] as number;
      const value2 = data2[`${percentile}_${metric}` as keyof MarketData] as number;
      const diff = ((value2 - value1) / value1) * 100;
      return {
        percentile: percentile.slice(1),
        specialty1: { name: specialty1, value: value1 },
        specialty2: { name: specialty2, value: value2 },
        difference: { value: diff, formatted: `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` }
      };
    });
  };

  const tccStats = getMarketStats('total');
  const wrvuStats = getMarketStats('wrvu');
  const cfStats = getMarketStats('cf');

  const getMedianStats = (stats: ReturnType<typeof getMarketStats>) => stats[1];
  const tccMedian = getMedianStats(tccStats);
  const wrvuMedian = getMedianStats(wrvuStats);
  const cfMedian = getMedianStats(cfStats);

  return (
    <div className="space-y-4">
      {/* Market Analysis Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Market Analysis: {specialty1} vs {specialty2}</h2>
        </div>
        
        <div className="p-4 space-y-4">
          {/* TCC Analysis */}
          <div className="border-l-4 border-blue-500 pl-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Total Cash Compensation (TCC)</h3>
                <p className="text-sm text-gray-600">
                  {specialty1} {Math.abs(tccMedian.difference.value) > 0 ? 
                    tccMedian.difference.value > 0 ? 'earns less than' : 'earns more than' : 
                    'earns the same as'} {specialty2} by {Math.abs(tccMedian.difference.value).toFixed(1)}%. 
                  This represents a median compensation difference of {formatValue(Math.abs(tccMedian.specialty1.value - tccMedian.specialty2.value), 'total')} annually.
                </p>
              </div>
              <div className="ml-4 bg-gray-50 p-2 rounded text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty1}:</span>
                    <span className="font-medium">{formatValue(tccMedian.specialty1.value, 'total')}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty2}:</span>
                    <span className="font-medium">{formatValue(tccMedian.specialty2.value, 'total')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Work RVUs Analysis */}
          <div className="border-l-4 border-green-500 pl-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Work RVUs (Productivity)</h3>
                <p className="text-sm text-gray-600">
                  In terms of productivity, {specialty1} {Math.abs(wrvuMedian.difference.value) > 0 ? 
                    wrvuMedian.difference.value > 0 ? 'generates less' : 'generates more' : 
                    'generates the same'} work RVUs than {specialty2} by {Math.abs(wrvuMedian.difference.value).toFixed(1)}%. 
                  This represents a difference of {Math.abs(wrvuMedian.specialty1.value - wrvuMedian.specialty2.value).toFixed(0)} RVUs at the median level.
                </p>
              </div>
              <div className="ml-4 bg-gray-50 p-2 rounded text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty1}:</span>
                    <span className="font-medium">{formatValue(wrvuMedian.specialty1.value, 'wrvu')} RVUs</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty2}:</span>
                    <span className="font-medium">{formatValue(wrvuMedian.specialty2.value, 'wrvu')} RVUs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversion Factor Analysis */}
          <div className="border-l-4 border-purple-500 pl-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Conversion Factor (Pay per RVU)</h3>
                <p className="text-sm text-gray-600">
                  The conversion factor shows that {specialty1} {Math.abs(cfMedian.difference.value) > 0 ? 
                    cfMedian.difference.value > 0 ? 'receives less' : 'receives more' : 
                    'receives the same'} compensation per RVU than {specialty2} by {Math.abs(cfMedian.difference.value).toFixed(1)}%. 
                  This translates to a difference of {formatValue(Math.abs(cfMedian.specialty1.value - cfMedian.specialty2.value), 'cf')} per RVU.
                </p>
              </div>
              <div className="ml-4 bg-gray-50 p-2 rounded text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty1}:</span>
                    <span className="font-medium">{formatValue(cfMedian.specialty1.value, 'cf')} per RVU</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-600">{specialty2}:</span>
                    <span className="font-medium">{formatValue(cfMedian.specialty2.value, 'cf')} per RVU</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="mt-4 bg-gray-50 p-3 rounded-lg">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Key Insights</h3>
            <p className="text-sm text-gray-600">
              {(() => {
                const tccHigher = tccMedian.difference.value < 0;
                const wrvuHigher = wrvuMedian.difference.value < 0;
                const cfHigher = cfMedian.difference.value < 0;
                
                let insight = '';
                
                if (tccHigher && !wrvuHigher && cfHigher) {
                  insight = `${specialty1}'s higher total compensation (${Math.abs(tccMedian.difference.value).toFixed(1)}% higher) 
                    is primarily driven by a significantly higher conversion factor (${Math.abs(cfMedian.difference.value).toFixed(1)}% higher), 
                    which more than offsets their lower productivity (${Math.abs(wrvuMedian.difference.value).toFixed(1)}% lower RVUs).`;
                } else if (tccHigher && wrvuHigher && !cfHigher) {
                  insight = `${specialty1}'s higher total compensation (${Math.abs(tccMedian.difference.value).toFixed(1)}% higher) 
                    is achieved through higher productivity (${Math.abs(wrvuMedian.difference.value).toFixed(1)}% more RVUs), 
                    despite a lower conversion factor (${Math.abs(cfMedian.difference.value).toFixed(1)}% lower).`;
                } else if (!tccHigher && !wrvuHigher && !cfHigher) {
                  insight = `${specialty2} shows higher values across all metrics, with ${Math.abs(tccMedian.difference.value).toFixed(1)}% higher compensation, 
                    ${Math.abs(wrvuMedian.difference.value).toFixed(1)}% higher productivity, and a ${Math.abs(cfMedian.difference.value).toFixed(1)}% higher conversion factor.`;
                } else {
                  insight = `The relationship between metrics shows mixed patterns. While ${specialty1} ${tccHigher ? 'earns more' : 'earns less'} overall, 
                    this is influenced by ${wrvuHigher ? 'higher' : 'lower'} productivity and ${cfHigher ? 'higher' : 'lower'} rates per RVU.`;
                }
                
                return insight;
              })()}
            </p>
          </div>
        </div>
      </div>

      {/* Metric Comparisons */}
      {[
        { title: 'Total Cash Compensation', metric: 'total' as const, stats: tccStats },
        { title: 'Work RVUs', metric: 'wrvu' as const, stats: wrvuStats },
        { title: 'Conversion Factor', metric: 'cf' as const, stats: cfStats }
      ].map(({ title, metric, stats }) => (
        <div key={metric} className="bg-white rounded-xl shadow-sm border border-gray-200 w-full">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-indigo-600" />
                <h2 className="text-xl font-semibold text-gray-900">{title} Analysis</h2>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-8">
              {/* Chart */}
              <div>
                <div className="h-[400px] bg-white rounded-lg p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={['p25', 'p50', 'p75', 'p90'].map(percentile => {
                        const value1 = data1[`${percentile}_${metric}` as keyof MarketData] as number;
                        const value2 = data2[`${percentile}_${metric}` as keyof MarketData] as number;
                        return {
                          percentile: `${percentile.slice(1)}th`,
                          [specialty1]: value1,
                          [specialty2]: value2,
                          difference: value2 - value1
                        };
                      })} 
                      margin={{ top: 40, right: 20, bottom: 20, left: 40 }}
                      barGap={2}
                      barSize={32}
                    >
                      <defs>
                        <linearGradient id="colorBar1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#4338CA" stopOpacity={1} />
                          <stop offset="100%" stopColor="#4338CA" stopOpacity={0.8} />
                        </linearGradient>
                        <linearGradient id="colorBar2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818CF8" stopOpacity={1} />
                          <stop offset="100%" stopColor="#818CF8" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#E5E7EB" 
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="percentile" 
                        tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis 
                        tickFormatter={
                          metric === 'total' 
                            ? (value) => `$${(value/1000)}K`
                            : metric === 'cf'
                              ? (value) => `$${value}`
                              : (value) => value.toLocaleString()
                        }
                        tick={{ fill: '#4B5563', fontSize: 12, fontWeight: 500 }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        tickLine={false}
                        dx={-8}
                        width={55}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(229, 231, 235, 0.4)' }}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-900 mb-2">{label} Percentile</p>
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-gray-600 mr-4">{entry.name}:</span>
                                    <span className="text-sm font-medium text-gray-900">
                                      {formatValue(entry.value, metric)}
                                    </span>
                                  </div>
                                ))}
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Difference:</span>
                                    <span className={`text-sm font-medium ${
                                      (payload && payload[1] && payload[0] && payload[1].value - payload[0].value > 0)
                                        ? 'text-emerald-600' 
                                        : 'text-rose-600'
                                    }`}>
                                      {formatValue(Math.abs(payload[1].value - payload[0].value), metric)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey={specialty1} 
                        fill="url(#colorBar1)"
                        name={specialty1}
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey={specialty1}
                          position="top"
                          formatter={(value: number) => 
                            metric === 'total' 
                              ? `$${(value/1000).toFixed(0)}K`
                              : metric === 'cf'
                                ? `$${value.toFixed(2)}`
                                : value.toLocaleString()
                          }
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 500,
                            fill: '#4B5563',
                            letterSpacing: '-0.01em'
                          }}
                        />
                      </Bar>
                      <Bar 
                        dataKey={specialty2} 
                        fill="url(#colorBar2)"
                        name={specialty2}
                        radius={[4, 4, 0, 0]}
                      >
                        <LabelList
                          dataKey={specialty2}
                          position="top"
                          formatter={(value: number) => 
                            metric === 'total' 
                              ? `$${(value/1000).toFixed(0)}K`
                              : metric === 'cf'
                                ? `$${value.toFixed(2)}`
                                : value.toLocaleString()
                          }
                          style={{ 
                            fontSize: '11px', 
                            fontWeight: 500,
                            fill: '#4B5563',
                            letterSpacing: '-0.01em'
                          }}
                        />
                      </Bar>
                      <ReferenceLine
                        y={0}
                        stroke="#E5E7EB"
                        strokeWidth={1}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 flex items-center justify-between px-4">
                  <div className="flex items-center space-x-8">
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-indigo-700 rounded-sm mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">{specialty1}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-4 h-4 bg-indigo-400 rounded-sm mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">{specialty2}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 italic">
                    Values shown at each percentile benchmark
                  </div>
                </div>
              </div>

              {/* Percentile Data */}
              <div className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-500">Percentile</div>
                      </div>
                      <div className="col-span-4">
                        <div className="text-sm font-medium text-gray-900">{specialty1}</div>
                      </div>
                      <div className="col-span-4">
                        <div className="text-sm font-medium text-gray-900">{specialty2}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-500 text-right">Difference</div>
                      </div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {stats.map((stat) => (
                      <div key={stat.percentile} className="px-4 py-3 bg-white">
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-2">
                            <div className="text-sm font-medium text-gray-900">{stat.percentile}th</div>
                          </div>
                          <div className="col-span-4">
                            <div className="text-base font-medium text-gray-900">
                              {formatValue(stat.specialty1.value, metric)}
                            </div>
                          </div>
                          <div className="col-span-4">
                            <div className="text-base font-medium text-gray-900">
                              {formatValue(stat.specialty2.value, metric)}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex flex-col items-end">
                              <div className={`
                                inline-flex items-center px-2.5 py-1 rounded-md text-sm font-medium
                                ${stat.difference.value >= 0 
                                  ? 'bg-emerald-50 text-emerald-700' 
                                  : 'bg-rose-50 text-rose-700'
                                }
                              `}>
                                {stat.difference.value < 0 ? (
                                  <ArrowTrendingDownIcon className="w-3.5 h-3.5 mr-1" />
                                ) : (
                                  <ArrowTrendingUpIcon className="w-3.5 h-3.5 mr-1" />
                                )}
                                {stat.difference.formatted}
                              </div>
                              <div className={`
                                text-sm mt-1
                                ${stat.difference.value >= 0 
                                  ? 'text-emerald-600' 
                                  : 'text-rose-600'
                                }
                              `}>
                                {metric === 'total' && (
                                  <span className="text-xs text-gray-500 mr-0.5">$</span>
                                )}
                                {formatValue(Math.abs(stat.specialty2.value - stat.specialty1.value), metric)
                                  .replace('$', '')
                                  .replace(',', ',\u00A0')}
                                {metric === 'wrvu' && (
                                  <span className="text-xs text-gray-500 ml-0.5">RVUs</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
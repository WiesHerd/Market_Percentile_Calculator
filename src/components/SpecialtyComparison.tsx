'use client';

import { MarketData, MetricType } from '@/types/logs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ScatterChart,
  Scatter,
  Line,
  LabelList
} from 'recharts';
import { useEffect, useState } from 'react';

interface SpecialtyComparisonProps {
  specialties: string[];
  marketData: MarketData[];
  selectedMetric: MetricType;
  formatValue: (value: number, metric: MetricType) => string;
}

interface MetricTooltipProps {
  title: string;
  description: string;
  calculation: string;
  interpretation: string;
}

interface UnifiedMetrics {
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    stdDev: number;
    cv: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    stdDev: number;
    cv: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    stdDev: number;
    cv: number;
  };
  correlations: {
    tccWrvu: number;
    tccCf: number;
    wrvuCf: number;
    r2: number;
  };
  ratioDistribution: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  variation: number;
  tooltipContent: MetricTooltipProps;
  onClick: () => void;
  metricType: 'tcc' | 'wrvu' | 'cf';
}

function MetricIcon({ type }: { type: 'tcc' | 'wrvu' | 'cf' }) {
  switch (type) {
    case 'tcc':
      return (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'wrvu':
      return (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    case 'cf':
      return (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      );
  }
}

function MetricCard({ title, value, unit, variation, tooltipContent, onClick, metricType }: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTooltip(!showTooltip);
  };

  return (
    <div 
      className="relative overflow-visible bg-white rounded-xl border border-gray-200/75 shadow-sm hover:shadow-md transition-all duration-300"
      onClick={onClick}
    >
      <GradientBackground />
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-sm font-medium text-gray-500">
            {title}
            <div className="relative inline-block ml-1">
              <div onClick={handleInfoClick}>
                <InfoIcon onClick={() => {}} />
              </div>
              {showTooltip && (
                <div className="absolute z-[9999]" style={{
                  top: 'calc(100% + 8px)',
                  left: '50%',
                  transform: 'translateX(-50%)'
                }}>
                  <MetricTooltip 
                    {...tooltipContent}
                    isVisible={showTooltip}
                    onClose={() => setShowTooltip(false)}
                  />
                </div>
              )}
            </div>
          </h3>
          <MetricIcon type={metricType} />
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {metricType === 'tcc' || metricType === 'cf' ? '$' : ''}{typeof value === 'number' ? value.toLocaleString() : value}
              <span className="text-sm font-medium text-gray-500 ml-1">{metricType === 'wrvu' ? 'wRVUs' : ''}</span>
            </div>
            <div className="text-xs font-medium text-gray-500 mt-0.5">Median Value</div>
          </div>
          
          <div className="flex items-end justify-between">
            <div>
              <div className="text-lg font-bold text-indigo-600">
                {variation.toFixed(1)}
                <span className="text-sm font-medium ml-0.5">%</span>
              </div>
              <div className="flex items-center text-[10px] font-medium text-gray-500 mt-0.5">
                Coefficient of Variation
              </div>
            </div>
            <div className="text-xs font-medium text-gray-500">Variability</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GradientBackground() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-white to-blue-50/50 rounded-lg -z-10" />
  );
}

function InfoIcon({ onClick }: { onClick: () => void }) {
  return (
    <svg 
      className="info-icon w-4 h-4 ml-1.5 text-gray-400 hover:text-indigo-500 transition-all duration-200 cursor-pointer" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      onClick={onClick}
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1.5} 
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );
}

function MetricTooltip({ title, description, calculation, interpretation, isVisible, onClose }: MetricTooltipProps & { isVisible: boolean; onClose: () => void }) {
  if (!isVisible) return null;

  return (
    <div className="metric-tooltip absolute z-[9999] bg-white rounded-lg shadow-xl w-96 border border-gray-200 mt-2" 
         style={{ minWidth: '320px' }}>
      <div className="relative">
        {/* Close button */}
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Arrow */}
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-white border-l border-t border-gray-200"></div>
        
        <div className="relative bg-white rounded-lg p-4 text-left">
          {/* Header */}
          <div className="mb-4">
            <h4 className="text-base font-semibold text-gray-900 mb-1.5">{title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
          </div>
          
          {/* Calculation Section */}
          <div className="mb-4">
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">How to Read This</div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-line">
                {calculation}
              </div>
            </div>
          </div>
          
          {/* Interpretation Section */}
          <div>
            <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">What the Values Mean</div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="text-sm text-gray-600 leading-relaxed">
                {interpretation}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTrendAnalysis(ratioDistribution: { p25: number; p50: number; p75: number; p90: number }) {
  const trend = {
    direction: ratioDistribution.p90 > ratioDistribution.p25 ? 'increasing' : 'decreasing',
    percentChange: ((ratioDistribution.p90 - ratioDistribution.p25) / ratioDistribution.p25 * 100).toFixed(1),
    spreadRange: (ratioDistribution.p25 - ratioDistribution.p90).toFixed(2),
    medianValue: ratioDistribution.p50.toFixed(2),
  };

  const getTrendDescription = () => {
    if (trend.direction === 'decreasing') {
      return {
        summary: "Decreasing compensation rate at higher volumes",
        implication: "This suggests a regressive payment structure where providers with higher work volumes receive lower per-unit compensation.",
        consideration: "This structure might need review as it could discourage increased productivity.",
        action: "Consider evaluating if this aligns with compensation goals and provider incentives."
      };
    } else {
      return {
        summary: "Increasing compensation rate at higher volumes",
        implication: "This indicates a progressive payment structure that rewards higher work volumes.",
        consideration: "This structure encourages productivity and may help with provider retention.",
        action: "Monitor to ensure the increase remains sustainable and aligned with market standards."
      };
    }
  };

  return {
    ...trend,
    analysis: getTrendDescription()
  };
}

function DynamicTrendExplanation({ ratioDistribution }: { ratioDistribution: { p25: number; p50: number; p75: number; p90: number } }) {
  const analysis = getTrendAnalysis(ratioDistribution);
  
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Trend Analysis</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          analysis.direction === 'increasing' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
        }`}>
          {analysis.direction === 'increasing' ? '↗ Increasing' : '↘ Decreasing'} Rate
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Rate Spread</div>
          <div className="text-sm font-medium text-gray-900">${Math.abs(Number(analysis.spreadRange))}</div>
          <div className="text-xs text-gray-500 mt-1">Difference between 25th and 90th percentile</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1">Percent Change</div>
          <div className="text-sm font-medium text-gray-900">{Math.abs(Number(analysis.percentChange))}%</div>
          <div className="text-xs text-gray-500 mt-1">Total variation across percentiles</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Key Observation</div>
            <p className="text-sm text-gray-600">{analysis.analysis.summary}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">What This Means</div>
            <p className="text-sm text-gray-600">{analysis.analysis.implication}</p>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900 mb-1">Consideration</div>
            <p className="text-sm text-gray-600">{analysis.analysis.consideration}</p>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm text-indigo-600 font-medium">{analysis.analysis.action}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpecialtyComparison({
  specialties,
  marketData,
  selectedMetric,
  formatValue
}: SpecialtyComparisonProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  
  const isSingleMode = specialties.length === 1;
  const [specialty1] = specialties;
  const specialty2 = specialties[1];
  
  // Get data from the same source as market-data page
  const data1 = marketData.find(d => d.specialty === specialty1);
  const data2 = isSingleMode ? null : marketData.find(d => d.specialty === specialty2);

  if (!data1 || (!isSingleMode && !data2)) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600">No data available for the selected specialty.</div>
      </div>
    );
  }

  // Calculate unified metrics
  const calculateUnifiedMetrics = (data: MarketData): UnifiedMetrics | null => {
    try {
      const calculateStats = (p25: number, p50: number, p75: number, p90: number) => {
        if ([p25, p50, p75, p90].some(v => v === undefined || v === null || isNaN(v))) {
          return null;
        }
        const stdDev = (p75 - p25) / 1.34896;
        return {
          p25,
          p50,
          p75,
          p90,
          stdDev,
          cv: (stdDev / p50) * 100
        };
      };

      const tcc = calculateStats(
        data.p25_total,
        data.p50_total,
        data.p75_total,
        data.p90_total
      );

      const wrvu = calculateStats(
        data.p25_wrvu,
        data.p50_wrvu,
        data.p75_wrvu,
        data.p90_wrvu
      );

      const cf = calculateStats(
        data.p25_cf,
        data.p50_cf,
        data.p75_cf,
        data.p90_cf
      );

      if (!tcc || !wrvu || !cf) return null;

      // Calculate correlations and R²
      const tccWrvu = Math.min(
        (((data.p90_total - data.p25_total) / data.p50_total) /
         ((data.p90_wrvu - data.p25_wrvu) / data.p50_wrvu)) * 100,
        100
      );

      const tccCf = Math.min(
        (((data.p90_total - data.p25_total) / data.p50_total) /
         ((data.p90_cf - data.p25_cf) / data.p50_cf)) * 100,
        100
      );

      const wrvuCf = Math.min(
        (((data.p90_wrvu - data.p25_wrvu) / data.p50_wrvu) /
         ((data.p90_cf - data.p25_cf) / data.p50_cf)) * 100,
        100
      );

      // Calculate R² (simplified for this context)
      const r2 = Math.pow(tccWrvu / 100, 2);

      // Calculate TCC/wRVU ratio distribution
      const ratioDistribution = {
        p25: data.p25_total / data.p25_wrvu,
        p50: data.p50_total / data.p50_wrvu,
        p75: data.p75_total / data.p75_wrvu,
        p90: data.p90_total / data.p90_wrvu
      };

      return {
        tcc,
        wrvu,
        cf,
        correlations: {
          tccWrvu,
          tccCf,
          wrvuCf,
          r2
        },
        ratioDistribution
      };
    } catch (error) {
      console.error('Error calculating unified metrics:', error);
      return null;
    }
  };

  const unifiedMetrics = calculateUnifiedMetrics(data1);
  
  if (!unifiedMetrics) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-600">Unable to calculate metrics. Please check the data and try again.</div>
      </div>
    );
  }

  const handleTooltipClick = (tooltipId: string) => {
    setActiveTooltip(current => current === tooltipId ? null : tooltipId);
  };

  return (
    <div className="space-y-8 p-6 bg-gray-50/50 rounded-xl">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6">
        <MetricCard
          title="Total Cash Compensation"
          value={unifiedMetrics.tcc.p50}
          unit="USD"
          variation={unifiedMetrics.tcc.cv}
          tooltipContent={{
            title: "Total Cash Compensation",
            description: "The total annual cash compensation including base salary and bonuses",
            calculation: "Values range from 0-100%. Higher values indicate more variation. • Low (0-15%): Very consistent, little variation • Moderate (15-30%): Some variation, typical for specialties • High (>30%): Significant variation, diverse patterns",
            interpretation: "Higher values indicate greater total compensation. The coefficient of variation shows how spread out the values are - lower values suggest more predictable compensation"
          }}
          onClick={() => handleTooltipClick('tcc')}
          metricType="tcc"
        />
        <MetricCard
          title="Work RVUs"
          value={unifiedMetrics.wrvu.p50}
          unit="wRVUs"
          variation={unifiedMetrics.wrvu.cv}
          tooltipContent={{
            title: "Work RVUs",
            description: "Work Relative Value Units measure the time, skill, and effort required for services",
            calculation: "Values range from 0-100%. Higher values indicate more variation. • Low (0-15%): Very consistent work patterns • Moderate (15-30%): Typical variation in work volume • High (>30%): Significant variation in practice patterns",
            interpretation: "Higher values indicate greater work intensity. The coefficient of variation shows consistency in work patterns - lower values suggest more standardized practice patterns"
          }}
          onClick={() => handleTooltipClick('wrvu')}
          metricType="wrvu"
        />
        <MetricCard
          title="Conversion Factor"
          value={unifiedMetrics.cf.p50}
          unit="USD"
          variation={unifiedMetrics.cf.cv}
          tooltipContent={{
            title: "Conversion Factor",
            description: "Dollar amount paid per work RVU",
            calculation: "Values range from 0-100%. Higher values indicate more variation. • Low (0-15%): Very consistent pay rates • Moderate (15-30%): Some variation in compensation per RVU • High (>30%): Significant variation in how work is valued",
            interpretation: "Higher values indicate better compensation per unit of work. The coefficient of variation shows consistency in pay rates - lower values suggest more standardized compensation structure"
          }}
          onClick={() => handleTooltipClick('cf')}
          metricType="cf"
        />
      </div>

      {/* Analysis Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Distribution Analysis */}
        <div className="relative overflow-hidden bg-white rounded-xl border border-gray-200/75 shadow-sm">
          <GradientBackground />
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider flex items-center mb-6">
              <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Distribution Analysis
            </h3>
            <p className="mt-1 mb-4 text-sm text-gray-500">Percentile breakdown of key metrics</p>
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              {/* Headers */}
              <div className="bg-gray-50 border-b border-gray-200">
                <div className="grid grid-cols-5 gap-4">
                  <div className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    Metric
                  </div>
                  {['25th', '50th', '75th', '90th'].map(percentile => (
                    <div key={percentile} className="p-4 text-sm font-semibold text-gray-500 uppercase tracking-wider text-right">
                      {percentile}
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Rows */}
              <div className="divide-y divide-gray-200">
                {/* TCC Distribution */}
                <div className="grid grid-cols-5 gap-4 hover:bg-gray-50 transition-colors">
                  <div className="p-3 flex items-center">
                    <MetricIcon type="tcc" />
                    <span className="text-sm font-medium text-gray-900 ml-2">TCC</span>
                  </div>
                  {['25', '50', '75', '90'].map(percentile => (
                    <div key={percentile} className="p-3 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatValue(unifiedMetrics.tcc[`p${percentile}` as keyof typeof unifiedMetrics.tcc], 'total')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* wRVU Distribution */}
                <div className="grid grid-cols-5 gap-4 hover:bg-gray-50 transition-colors">
                  <div className="p-3 flex items-center">
                    <MetricIcon type="wrvu" />
                    <span className="text-sm font-medium text-gray-900 ml-2">wRVUs</span>
                  </div>
                  {['25', '50', '75', '90'].map(percentile => (
                    <div key={percentile} className="p-3 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatValue(unifiedMetrics.wrvu[`p${percentile}` as keyof typeof unifiedMetrics.wrvu], 'wrvu')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CF Distribution */}
                <div className="grid grid-cols-5 gap-4 hover:bg-gray-50 transition-colors">
                  <div className="p-3 flex items-center">
                    <MetricIcon type="cf" />
                    <span className="text-sm font-medium text-gray-900 ml-2">CF</span>
                  </div>
                  {['25', '50', '75', '90'].map(percentile => (
                    <div key={percentile} className="p-3 text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatValue(unifiedMetrics.cf[`p${percentile}` as keyof typeof unifiedMetrics.cf], 'cf')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TCC vs. wRVU Relationship Graph */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 tracking-wider mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                TCC vs. wRVU Relationship
                <span className="ml-2 px-2 py-1 bg-indigo-50 rounded-full text-xs font-medium text-indigo-600">
                  R² = {(unifiedMetrics.correlations.r2 * 100).toFixed(1)}%
                </span>
                <div className="relative inline-block ml-1">
                  <div onClick={() => handleTooltipClick('r2')}>
                    <InfoIcon onClick={() => {}} />
                  </div>
                  {activeTooltip === 'r2' && (
                    <div className="absolute z-[9999]" style={{
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)'
                    }}>
                      <MetricTooltip 
                        title="R² (R-squared) Explanation"
                        description="R² measures how much of the variation in compensation can be explained by work volume."
                        calculation="Values range from 0-100%. Higher values indicate stronger correlation. • Strong: >75% (compensation closely follows work volume) • Moderate: 25-75% (other factors influence pay) • Weak: <25% (work volume poorly predicts pay)"
                        interpretation="A higher R² suggests compensation is more predictable based on work output. Lower values indicate other factors (quality, location, experience) play significant roles in determining pay."
                        isVisible={true}
                        onClose={() => handleTooltipClick('r2')}
                      />
                    </div>
                  )}
                </div>
              </h3>
              <div className="h-[400px] border border-gray-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 50, left: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      type="number"
                      dataKey="wrvu"
                      name="Work RVUs"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => value.toLocaleString()}
                      domain={[
                        (dataMin: number) => Math.floor(dataMin * 0.9),
                        (dataMax: number) => Math.ceil(dataMax * 1.1)
                      ]}
                      label={{
                        value: 'Work RVUs (Productivity)',
                        position: 'bottom',
                        offset: 35,
                        style: { fill: '#475569', fontSize: 13 }
                      }}
                    />
                    <YAxis 
                      type="number"
                      dataKey="tcc"
                      name="Total Compensation"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => `$${Math.round(value/1000)}K`}
                      domain={[
                        (dataMin: number) => Math.floor(dataMin * 0.9),
                        (dataMax: number) => Math.ceil(dataMax * 1.1)
                      ]}
                      label={{
                        value: 'Total Cash Compensation (USD)',
                        angle: -90,
                        position: 'left',
                        offset: 50,
                        style: { fill: '#475569', fontSize: 13 }
                      }}
                    />
                    {/* Confidence Interval Area */}
                    <defs>
                      <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#818cf8" stopOpacity={0.1}/>
                        <stop offset="100%" stopColor="#818cf8" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    {/* Data Points */}
                    <Scatter
                      data={[
                        { wrvu: unifiedMetrics.wrvu.p25, tcc: unifiedMetrics.tcc.p25, percentile: '25th', rate: unifiedMetrics.tcc.p25 / unifiedMetrics.wrvu.p25 },
                        { wrvu: unifiedMetrics.wrvu.p50, tcc: unifiedMetrics.tcc.p50, percentile: '50th', rate: unifiedMetrics.tcc.p50 / unifiedMetrics.wrvu.p50 },
                        { wrvu: unifiedMetrics.wrvu.p75, tcc: unifiedMetrics.tcc.p75, percentile: '75th', rate: unifiedMetrics.tcc.p75 / unifiedMetrics.wrvu.p75 },
                        { wrvu: unifiedMetrics.wrvu.p90, tcc: unifiedMetrics.tcc.p90, percentile: '90th', rate: unifiedMetrics.tcc.p90 / unifiedMetrics.wrvu.p90 }
                      ]}
                      fill="#6366f1"
                      stroke="#ffffff"
                      strokeWidth={2}
                      r={6}
                    >
                      <LabelList
                        dataKey="percentile"
                        position="top"
                        offset={15}
                        style={{
                          fill: '#475569',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      />
                    </Scatter>
                    {/* Trend Line */}
                    <Scatter
                      data={[
                        { wrvu: unifiedMetrics.wrvu.p25, tcc: unifiedMetrics.tcc.p25 },
                        { wrvu: unifiedMetrics.wrvu.p50, tcc: unifiedMetrics.tcc.p50 },
                        { wrvu: unifiedMetrics.wrvu.p75, tcc: unifiedMetrics.tcc.p75 },
                        { wrvu: unifiedMetrics.wrvu.p90, tcc: unifiedMetrics.tcc.p90 }
                      ]}
                      name="Trend Line"
                      line={{ stroke: '#818cf8', strokeWidth: 3 }}
                      lineType="fitting"
                      shape={false}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      content={({ payload }) => (
                        <div className="flex items-center justify-center space-x-6 mb-4">
                          <div className="flex items-center">
                            <span className="inline-block w-3 h-3 rounded-full bg-[#6366f1] mr-2"></span>
                            <span className="text-sm text-gray-600">Data Points</span>
                          </div>
                          <div className="flex items-center">
                            <span className="inline-block w-8 h-[2px] bg-[#4338ca] mr-2"></span>
                            <span className="text-sm text-gray-600">Trend Line</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-600">
                            <span className="font-medium text-indigo-600 mr-1">R² = {(unifiedMetrics.correlations.r2 * 100).toFixed(1)}%</span>
                            <span>correlation</span>
                          </div>
                        </div>
                      )}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Compensation Rate Distribution */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-base font-semibold text-gray-900 tracking-wider mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Compensation Rate Distribution
              </h3>
              <div className="h-[400px] border border-gray-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { percentile: '25th', rate: unifiedMetrics.ratioDistribution.p25 },
                      { percentile: '50th', rate: unifiedMetrics.ratioDistribution.p50 },
                      { percentile: '75th', rate: unifiedMetrics.ratioDistribution.p75 },
                      { percentile: '90th', rate: unifiedMetrics.ratioDistribution.p90 }
                    ]}
                    margin={{ top: 40, right: 30, bottom: 50, left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="percentile"
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      label={{
                        value: 'Market Percentile',
                        position: 'bottom',
                        offset: 35,
                        style: { fill: '#64748b', fontSize: 13, fontWeight: 500 }
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      tickFormatter={(value) => `$${value}`}
                      label={{
                        value: 'Dollars per wRVU',
                        angle: -90,
                        position: 'left',
                        offset: 45,
                        style: { fill: '#64748b', fontSize: 13, fontWeight: 500 }
                      }}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {data.percentile} Percentile
                              </div>
                              <div className="text-sm text-gray-600">
                                Rate: <span className="font-medium">${data.rate.toFixed(2)}/wRVU</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="rate"
                      fill="#818cf8"
                      radius={[4, 4, 0, 0]}
                    >
                      <LabelList
                        dataKey="rate"
                        position="top"
                        offset={10}
                        formatter={(value: number) => `$${value.toFixed(2)}`}
                        style={{ 
                          fontSize: 12, 
                          fill: '#64748b', 
                          fontWeight: 500,
                          textAnchor: 'middle'
                        }}
                      />
                    </Bar>
                    {/* Market Reference Line */}
                    <ReferenceLine
                      y={unifiedMetrics.ratioDistribution.p50}
                      stroke="#4f46e5"
                      strokeDasharray="3 3"
                      label={{
                        value: 'Market Median',
                        position: 'insideTopRight',
                        fill: '#4f46e5',
                        fontSize: 12,
                        offset: -15
                      }}
                      ifOverflow="extendDomain"
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      content={({ payload }) => (
                        <div className="flex items-center justify-center space-x-6 mb-2">
                          <div className="flex items-center">
                            <span className="inline-block w-3 h-3 bg-[#818cf8] mr-2"></span>
                            <span className="text-sm text-gray-600">Compensation Rate</span>
                          </div>
                          <div className="flex items-center">
                            <span className="inline-block w-8 border-t-2 border-[#4f46e5] border-dashed mr-2"></span>
                            <span className="text-sm text-gray-600">Market Median ($72.27/wRVU)</span>
                          </div>
                        </div>
                      )}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Correlation Analysis */}
        <div className="relative overflow-visible bg-white rounded-xl border border-gray-200/75 shadow-sm">
          <GradientBackground />
          <div className="p-6">
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider flex items-center mb-6">
              <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Correlation Analysis
            </h3>

            {/* Key Insights Section */}
            <div className="mb-6 bg-indigo-50/50 rounded-lg p-4 border border-indigo-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Insights</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Work output explains <span className="font-semibold text-indigo-600">{unifiedMetrics.correlations.r2.toFixed(1)}%</span> of compensation variation
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Pay rates are <span className="font-semibold text-indigo-600">
                      {unifiedMetrics.correlations.tccCf > 75 ? 'highly consistent' : 
                       unifiedMetrics.correlations.tccCf > 50 ? 'moderately variable' : 'significantly variable'}
                    </span> across compensation levels
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-sm text-gray-600">
                    Compensation structure shows <span className="font-semibold text-indigo-600">
                      {unifiedMetrics.correlations.wrvuCf > 90 ? 'excellent' : 
                       unifiedMetrics.correlations.wrvuCf > 75 ? 'good' : 'moderate'}
                    </span> alignment between work and pay
                  </p>
                </div>
              </div>
            </div>

            {/* Correlation Metrics */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Work Output vs. Compensation */}
              <div className="group relative w-full">
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-all duration-200">
                  <div className="text-center">
                    <div className="inline-block relative w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40 * (unifiedMetrics.correlations.tccWrvu / 100)} ${2 * Math.PI * 40}`}
                          transform="rotate(-90 50 50)"
                        />
                        <text
                          x="50"
                          y="50"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#1f2937"
                        >
                          {unifiedMetrics.correlations.tccWrvu.toFixed(1)}%
                        </text>
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-2 flex items-center justify-center min-w-0">
                      <div className="truncate">Work Output vs. TCC</div>
                      <div className="relative flex-shrink-0">
                        <InfoIcon onClick={() => handleTooltipClick('tccWrvu')} />
                        <MetricTooltip
                          title="Work Output vs. Total Cash Compensation"
                          description="Shows how closely total compensation follows work volume. This metric helps understand if providers who do more work consistently earn more."
                          calculation="Values range from 0-100%. Higher percentages indicate stronger correlation between work and pay.
                            • Excellent: >75%
                            • Good: 50-75%
                            • Poor: <50%"
                          interpretation="75%+ indicates strong alignment between work and compensation. 50-75% suggests moderate connection. Below 50% indicates weak relationship. Higher values generally mean more predictable compensation based on work output"
                          isVisible={activeTooltip === 'tccWrvu'}
                          onClose={() => handleTooltipClick('tccWrvu')}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Correlation Strength</div>
                  </div>
                </div>
              </div>

              {/* Pay Rate vs. Total Compensation */}
              <div className="group relative w-full">
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-all duration-200">
                  <div className="text-center">
                    <div className="inline-block relative w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40 * (unifiedMetrics.correlations.tccCf / 100)} ${2 * Math.PI * 40}`}
                          transform="rotate(-90 50 50)"
                        />
                        <text
                          x="50"
                          y="50"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#1f2937"
                        >
                          {unifiedMetrics.correlations.tccCf.toFixed(1)}%
                        </text>
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-2 flex items-center justify-center min-w-0">
                      <div className="truncate">Pay Rate vs. TCC</div>
                      <div className="relative flex-shrink-0">
                        <InfoIcon onClick={() => handleTooltipClick('tccCf')} />
                        <MetricTooltip
                          title="Pay Rate vs. Total Cash Compensation"
                          description="Indicates how consistently pay rates (dollars per work unit) are applied across different compensation levels."
                          calculation="Values range from 0-100%. Higher percentages mean more consistent pay rates. • Very Consistent: >75% • Moderately Variable: 50-75% • Highly Variable: <50%"
                          interpretation="75%+ shows very consistent pay rates across compensation levels. 50-75% indicates some variation in rates. Below 50% suggests significant variation in how work is valued at different compensation levels"
                          isVisible={activeTooltip === 'tccCf'}
                          onClose={() => handleTooltipClick('tccCf')}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Correlation Strength</div>
                  </div>
                </div>
              </div>

              {/* Work Volume vs. Pay Rate */}
              <div className="group relative w-full">
                <div className="bg-white rounded-lg p-4 border border-gray-200 hover:border-indigo-300 transition-all duration-200">
                  <div className="text-center">
                    <div className="inline-block relative w-24 h-24">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="#818cf8"
                          strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 40 * (unifiedMetrics.correlations.wrvuCf / 100)} ${2 * Math.PI * 40}`}
                          transform="rotate(-90 50 50)"
                        />
                        <text
                          x="50"
                          y="50"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="text-2xl font-bold"
                          fill="#1f2937"
                        >
                          {unifiedMetrics.correlations.wrvuCf.toFixed(1)}%
                        </text>
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-2 flex items-center justify-center min-w-0">
                      <div className="truncate">Work Volume vs. Pay Rate</div>
                      <div className="relative flex-shrink-0">
                        <InfoIcon onClick={() => handleTooltipClick('wrvuCf')} />
                        <MetricTooltip
                          title="Work Volume vs. Pay Rate Relationship"
                          description="Shows whether providers who do more work tend to have different pay rates. This helps understand if compensation structure is consistent across productivity levels."
                          calculation="Values range from 0-100%. Higher percentages indicate more consistent rates regardless of work volume.
                            • Excellent: >90%
                            • Good: 75-90%
                            • Poor: <75%"
                          interpretation="90%+ indicates excellent consistency in pay rates regardless of work volume. 75-90% shows good consistency. Below 75% suggests pay rates vary significantly based on work volume. Higher values mean more standardized compensation structure"
                          isVisible={activeTooltip === 'wrvuCf'}
                          onClose={() => handleTooltipClick('wrvuCf')}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Correlation Strength</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dollars per Work Unit section */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 group relative">
              <div className="flex justify-between items-center mb-3">
                <div className="text-base font-medium text-gray-900 flex items-center">
                  Dollars per Work Unit
                  <div className="relative">
                    <InfoIcon onClick={() => handleTooltipClick('ratioDistribution')} />
                    <MetricTooltip
                      title="Dollars per Work Unit Analysis"
                      description="Shows the distribution of compensation rates (Total Cash Compensation divided by Work RVUs) across different market percentiles."
                      calculation="• 25th: Lower market range\n• 50th: Typical market rate\n• 75th: Upper market range\n• 90th: Top tier rate"
                      interpretation="Higher values indicate better compensation per unit of work. The spread between percentiles shows market variation. Typical ranges vary by specialty. Compare to specialty benchmarks for context. Values above 75th percentile generally indicate favorable compensation structure"
                      isVisible={activeTooltip === 'ratioDistribution'}
                      onClose={() => handleTooltipClick('ratioDistribution')}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-500">Based on TCC/wRVU ratio</div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: '25th', desc: 'Lower range', color: '#818cf8' },
                  { label: '50th', desc: 'Typical', color: '#6366f1' },
                  { label: '75th', desc: 'Upper range', color: '#4f46e5' },
                  { label: '90th', desc: 'Top tier', color: '#4338ca' }
                ].map((item, index) => {
                  const percentile = ['p25', 'p50', 'p75', 'p90'][index];
                  return (
                    <div key={item.label} className="text-center bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-sm font-medium text-gray-900 mb-1">{item.desc}</div>
                      <div className="text-lg font-bold" style={{ color: item.color }}>
                        ${unifiedMetrics.ratioDistribution[percentile as keyof typeof unifiedMetrics.ratioDistribution].toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-600">{item.label} percentile</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-xs text-gray-600 text-center">
                Higher values indicate better compensation relative to work output
              </div>
              
              {/* Add the new DynamicTrendExplanation component */}
              <DynamicTrendExplanation ratioDistribution={unifiedMetrics.ratioDistribution} />
            </div>

            {/* Summary Statistics */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-3">Key Metrics</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Median Pay per wRVU</div>
                    <div className="text-sm font-medium text-gray-900">${(unifiedMetrics.tcc.p50 / unifiedMetrics.wrvu.p50).toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Rate Consistency</div>
                    <div className="text-sm font-medium text-gray-900">{(100 - unifiedMetrics.cf.cv).toFixed(1)}%</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Market Coverage</div>
                    <div className="text-sm text-gray-900">
                      {((unifiedMetrics.tcc.p90 - unifiedMetrics.tcc.p25) / unifiedMetrics.tcc.p50 * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="text-sm font-medium text-gray-900 mb-3">Ranges</div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Total Range</div>
                    <div className="text-sm font-medium text-gray-900">${(unifiedMetrics.tcc.p90 - unifiedMetrics.tcc.p25).toLocaleString()}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">wRVU Range</div>
                    <div className="text-sm font-medium text-gray-900">{(unifiedMetrics.wrvu.p90 - unifiedMetrics.wrvu.p25).toLocaleString()}</div>
                  </div>
                  <div className="flex justify-between">
                    <div className="text-sm text-gray-600">Pay Rate Range</div>
                    <div className="text-sm font-medium text-gray-900">${(unifiedMetrics.cf.p90 - unifiedMetrics.cf.p25).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
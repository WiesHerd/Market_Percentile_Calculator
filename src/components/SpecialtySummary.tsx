import React, { useMemo } from 'react';
import { formatCurrency, formatNumber } from '@/utils/formatting';

interface SurveyData {
  specialty: string;
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface Survey {
  id: string;
  vendor: string;
  data: SurveyData[];
}

interface AggregatedSpecialtyData {
  sourceSpecialties: string[];
  tcc: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  sources: string[];
}

interface SpecialtySummaryProps {
  surveys: Survey[];
  mappings: Record<string, string[]>;
}

type Percentile = 'p25' | 'p50' | 'p75' | 'p90';
type Metric = 'tcc' | 'wrvu' | 'cf';

export const SpecialtySummary: React.FC<SpecialtySummaryProps> = ({
  surveys,
  mappings
}) => {
  const aggregatedData = useMemo(() => {
    const data: Record<string, AggregatedSpecialtyData> = {};

    // Process each mapping
    Object.entries(mappings).forEach(([source, targets]) => {
      targets.forEach(target => {
        if (!data[target]) {
          data[target] = {
            sourceSpecialties: [],
            tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
            wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
            cf: { p25: 0, p50: 0, p75: 0, p90: 0 },
            sources: []
          };
        }

        data[target].sourceSpecialties.push(source);

        // Find survey data for this specialty
        surveys.forEach(survey => {
          const specialtyData = survey.data.find(d => d.specialty === source);
          if (specialtyData) {
            data[target].sources.push(survey.vendor);
            (['tcc', 'wrvu', 'cf'] as const).forEach((metric: Metric) => {
              (['p25', 'p50', 'p75', 'p90'] as const).forEach((percentile: Percentile) => {
                data[target][metric][percentile] += specialtyData[metric][percentile];
              });
            });
          }
        });
      });
    });

    // Average the values based on number of sources
    Object.values(data).forEach(specialty => {
      const sourceCount = specialty.sources.length;
      if (sourceCount > 0) {
        (['tcc', 'wrvu', 'cf'] as const).forEach((metric: Metric) => {
          (['p25', 'p50', 'p75', 'p90'] as const).forEach((percentile: Percentile) => {
            specialty[metric][percentile] /= sourceCount;
          });
        });
      }
    });

    return data;
  }, [surveys, mappings]);

  const percentiles: Percentile[] = ['p25', 'p50', 'p75', 'p90'];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Aggregated Survey Data</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Specialty
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sources
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cash Compensation
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Work RVUs
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Factor
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(aggregatedData).map(([specialty, data]) => (
                <tr key={specialty} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{specialty}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {data.sourceSpecialties.join(', ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(data.sources)).map(source => (
                        <span
                          key={source}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {percentiles.map(percentile => (
                        <div key={percentile} className="flex justify-between text-sm">
                          <span className="text-gray-500">{percentile.toUpperCase()}:</span>
                          <span className="text-gray-900 font-medium">
                            {formatCurrency(data.tcc[percentile])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {percentiles.map(percentile => (
                        <div key={percentile} className="flex justify-between text-sm">
                          <span className="text-gray-500">{percentile.toUpperCase()}:</span>
                          <span className="text-gray-900 font-medium">
                            {formatNumber(data.wrvu[percentile])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      {percentiles.map(percentile => (
                        <div key={percentile} className="flex justify-between text-sm">
                          <span className="text-gray-500">{percentile.toUpperCase()}:</span>
                          <span className="text-gray-900 font-medium">
                            {formatCurrency(data.cf[percentile])}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 
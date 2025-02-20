import React, { useState, useMemo } from 'react';
import { MappingState } from '@/types/mapping';

interface SpecialtyAnalyticsProps {
  specialtyMappings: MappingState;
  surveyData: Array<{
    vendor: string;
    data: Array<{
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
    }>;
  }>;
}

const SpecialtyAnalytics: React.FC<SpecialtyAnalyticsProps> = ({
  specialtyMappings,
  surveyData,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');

  // Get unique list of standard specialties
  const standardSpecialties = useMemo(() => {
    const specialties = new Set<string>();
    Object.values(specialtyMappings).forEach(mapping => {
      mapping.mappedSpecialties.forEach(specialty => {
        specialties.add(specialty);
      });
    });
    return Array.from(specialties).sort();
  }, [specialtyMappings]);

  // Calculate averages for the selected specialty
  const averages = useMemo(() => {
    if (!selectedSpecialty) return null;

    // Find all source specialties that map to the selected specialty
    const sourceSpecialties = Object.entries(specialtyMappings)
      .filter(([_, mapping]) => mapping.mappedSpecialties.includes(selectedSpecialty))
      .map(([specialty]) => specialty);

    // Initialize accumulators
    const metrics = {
      tcc: { p25: 0, p50: 0, p75: 0, p90: 0, count: 0 },
      wrvu: { p25: 0, p50: 0, p75: 0, p90: 0, count: 0 },
      cf: { p25: 0, p50: 0, p75: 0, p90: 0, count: 0 },
    };

    // Sum up values from all matching specialties across surveys
    surveyData.forEach(survey => {
      survey.data.forEach(row => {
        if (sourceSpecialties.includes(row.specialty)) {
          // Handle TCC
          metrics.tcc.p25 += row.tcc.p25;
          metrics.tcc.p50 += row.tcc.p50;
          metrics.tcc.p75 += row.tcc.p75;
          metrics.tcc.p90 += row.tcc.p90;
          metrics.tcc.count++;

          // Handle WRVU
          metrics.wrvu.p25 += row.wrvu.p25;
          metrics.wrvu.p50 += row.wrvu.p50;
          metrics.wrvu.p75 += row.wrvu.p75;
          metrics.wrvu.p90 += row.wrvu.p90;
          metrics.wrvu.count++;

          // Handle CF
          metrics.cf.p25 += row.cf.p25;
          metrics.cf.p50 += row.cf.p50;
          metrics.cf.p75 += row.cf.p75;
          metrics.cf.p90 += row.cf.p90;
          metrics.cf.count++;
        }
      });
    });

    // Calculate averages
    return {
      tcc: {
        p25: metrics.tcc.count ? metrics.tcc.p25 / metrics.tcc.count : 0,
        p50: metrics.tcc.count ? metrics.tcc.p50 / metrics.tcc.count : 0,
        p75: metrics.tcc.count ? metrics.tcc.p75 / metrics.tcc.count : 0,
        p90: metrics.tcc.count ? metrics.tcc.p90 / metrics.tcc.count : 0,
      },
      wrvu: {
        p25: metrics.wrvu.count ? metrics.wrvu.p25 / metrics.wrvu.count : 0,
        p50: metrics.wrvu.count ? metrics.wrvu.p50 / metrics.wrvu.count : 0,
        p75: metrics.wrvu.count ? metrics.wrvu.p75 / metrics.wrvu.count : 0,
        p90: metrics.wrvu.count ? metrics.wrvu.p90 / metrics.wrvu.count : 0,
      },
      cf: {
        p25: metrics.cf.count ? metrics.cf.p25 / metrics.cf.count : 0,
        p50: metrics.cf.count ? metrics.cf.p50 / metrics.cf.count : 0,
        p75: metrics.cf.count ? metrics.cf.p75 / metrics.cf.count : 0,
        p90: metrics.cf.count ? metrics.cf.p90 / metrics.cf.count : 0,
      },
    };
  }, [selectedSpecialty, specialtyMappings, surveyData]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatNumber = (value: number) => 
    new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

  return (
    <div className="space-y-6">
      {/* Specialty Selection */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Specialty</h3>
        <select
          value={selectedSpecialty}
          onChange={(e) => setSelectedSpecialty(e.target.value)}
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a specialty...</option>
          {standardSpecialties.map(specialty => (
            <option key={specialty} value={specialty}>{specialty}</option>
          ))}
        </select>
      </div>

      {/* Results Display */}
      {selectedSpecialty && averages && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Average Metrics for {selectedSpecialty}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* TCC Card */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-4">Total Cash Compensation</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">25th Percentile:</span>
                  <span className="text-sm font-medium text-blue-900">{formatCurrency(averages.tcc.p25)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">Median:</span>
                  <span className="text-sm font-medium text-blue-900">{formatCurrency(averages.tcc.p50)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">75th Percentile:</span>
                  <span className="text-sm font-medium text-blue-900">{formatCurrency(averages.tcc.p75)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-blue-700">90th Percentile:</span>
                  <span className="text-sm font-medium text-blue-900">{formatCurrency(averages.tcc.p90)}</span>
                </div>
              </div>
            </div>

            {/* wRVU Card */}
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-900 mb-4">Work RVUs</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">25th Percentile:</span>
                  <span className="text-sm font-medium text-green-900">{formatNumber(averages.wrvu.p25)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">Median:</span>
                  <span className="text-sm font-medium text-green-900">{formatNumber(averages.wrvu.p50)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">75th Percentile:</span>
                  <span className="text-sm font-medium text-green-900">{formatNumber(averages.wrvu.p75)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-700">90th Percentile:</span>
                  <span className="text-sm font-medium text-green-900">{formatNumber(averages.wrvu.p90)}</span>
                </div>
              </div>
            </div>

            {/* Conversion Factor Card */}
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-purple-900 mb-4">Conversion Factor</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">25th Percentile:</span>
                  <span className="text-sm font-medium text-purple-900">{formatCurrency(averages.cf.p25)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">Median:</span>
                  <span className="text-sm font-medium text-purple-900">{formatCurrency(averages.cf.p50)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">75th Percentile:</span>
                  <span className="text-sm font-medium text-purple-900">{formatCurrency(averages.cf.p75)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-purple-700">90th Percentile:</span>
                  <span className="text-sm font-medium text-purple-900">{formatCurrency(averages.cf.p90)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtyAnalytics; 
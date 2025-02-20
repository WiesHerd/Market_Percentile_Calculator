'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ArrowDownTrayIcon, ChartBarIcon, DocumentChartBarIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, CheckIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useSurveyContext } from '@/context/SurveyContext';

interface SurveyMetric {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface SurveyData {
  specialty: string;
  tcc?: SurveyMetric;
  wrvu?: SurveyMetric;
  cf?: SurveyMetric;
}

interface MetricSection {
  title: string;
  key: 'tcc' | 'wrvu' | 'cf';
  format: (value: number) => string;
  description: string;
  icon: JSX.Element;
}

const metricSections: MetricSection[] = [
  {
    title: 'Total Cash Compensation',
    key: 'tcc',
    format: (value: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value),
    description: 'Total annual compensation including base salary and bonuses',
    icon: (
      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  {
    title: 'Work RVUs',
    key: 'wrvu',
    format: (value: number) => new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value),
    description: 'Annual work relative value units',
    icon: (
      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    title: 'Conversion Factor',
    key: 'cf',
    format: (value: number) => new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value),
    description: 'Dollars per RVU',
    icon: (
      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
];

const percentiles = ['p25', 'p50', 'p75', 'p90'] as const;

const formatVendorName = (vendor: string): string => {
  const vendorMap: Record<string, string> = {
    'MGMA': 'MGMA',
    'GALLAGHER': 'Gallagher',
    'SULLIVANCOTTER': 'SullivanCotter',
    'SULLIVAN': 'SullivanCotter',
    'SULLIVAN COTTER': 'SullivanCotter',
    'SULLIVAN-COTTER': 'SullivanCotter'
  };
  return vendorMap[vendor.toUpperCase()] || vendor;
};

const SurveyAnalytics: React.FC = () => {
  const { specialtyMappings, surveyData } = useSurveyContext();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'analyze' | 'review'>('select');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get all unique specialties
  const specialties = useMemo(() => {
    const allSpecialties = Object.keys(specialtyMappings).sort();
    console.log('Available specialties:', allSpecialties);
    return allSpecialties;
  }, [specialtyMappings]);

  // Get survey data for selected specialty
  const specialtyData = useMemo(() => {
    if (!selectedSpecialty) return null;

    const mapping = specialtyMappings[selectedSpecialty];
    if (!mapping) return null;

    const allSpecialties = [selectedSpecialty, ...mapping.mappedSpecialties];
    const surveyValues: Record<string, SurveyData> = {};

    // Collect data from each survey
    surveyData.forEach(survey => {
      allSpecialties.forEach(specialty => {
        const data = survey.data.find(d => d.specialty === specialty);
        if (data) {
          if (!surveyValues[survey.vendor]) {
            surveyValues[survey.vendor] = {
              specialty: specialty,
              tcc: data.tcc,
              wrvu: data.wrvu,
              cf: data.cf
            };
          }
        }
      });
    });

    // Calculate averages across surveys
    const averages: Record<'tcc' | 'wrvu' | 'cf', SurveyMetric> = {
      tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
      wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
      cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
    };

    ['tcc', 'wrvu', 'cf'].forEach(metric => {
      percentiles.forEach(percentile => {
        const values = Object.values(surveyValues)
          .map(v => v[metric as keyof SurveyData]?.[percentile])
          .filter((v): v is number => v !== undefined);
        
        if (values.length > 0) {
          averages[metric as keyof typeof averages][percentile] = 
            values.reduce((a, b) => a + b, 0) / values.length;
        }
      });
    });

    return {
      surveyValues,
      averages,
      mapping
    };
  }, [selectedSpecialty, specialtyMappings, surveyData]);

  // Function to determine step status
  const getStepStatus = (step: 'select' | 'analyze' | 'review') => {
    if (step === 'select') {
      return !selectedSpecialty ? 'current' : 'complete';
    }
    if (step === 'analyze') {
      return !selectedSpecialty ? 'disabled' : currentStep === 'analyze' ? 'current' : 'complete';
    }
    if (step === 'review') {
      return !selectedSpecialty || currentStep === 'select' ? 'disabled' : currentStep === 'review' ? 'current' : 'disabled';
    }
  };

  const filteredSpecialties = useMemo(() => {
    if (!searchQuery) return specialties;
    return specialties.filter((specialty) =>
      specialty.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [specialties, searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Separate print view component
  const PrintView = () => {
    if (!selectedSpecialty || !specialtyData) return null;
    
    return (
      <div className="print-only">
        <div className="print-content">
          {/* Header */}
          <div className="print-header">
            <div className="header-title">Market Intelligence Suite</div>
            <h1>Blended Survey Data</h1>
            <h2>{selectedSpecialty}</h2>
          </div>
          
          {metricSections.map((section) => (
            <div key={section.key} className="metric-table">
              <h3>{section.title}</h3>
              <table>
                <thead>
                  <tr>
                    <th className="source-column">Source</th>
                    {percentiles.map((p) => (
                      <th key={p}>{p.replace('p', '')}th</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(specialtyData.surveyValues).map(([vendor, data]) => (
                    data[section.key] && (
                      <tr key={vendor}>
                        <td className="source-column">{formatVendorName(vendor)}</td>
                        {percentiles.map((percentile) => (
                          <td key={percentile}>
                            {data[section.key]?.[percentile] ? 
                              section.format(data[section.key]![percentile]) : 
                              '—'}
                          </td>
                        ))}
                      </tr>
                    )
                  ))}
                  <tr className="average-row">
                    <td className="source-column">Average</td>
                    {percentiles.map((percentile) => (
                      <td key={percentile}>
                        {specialtyData.averages[section.key][percentile] ? 
                          section.format(specialtyData.averages[section.key][percentile]) : 
                          '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
          
          <div className="print-footer">
            <div className="timestamp">
              Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
            </div>
            <div className="page-number">Page 1/1</div>
          </div>
        </div>
      </div>
    );
  };

  const handlePrint = () => {
    if (!selectedSpecialty || !specialtyData) return;
    window.print();
  };

  const handleExcelExport = () => {
    // Implementation of handleExcelExport function
  };

  return (
    <>
      {/* Regular view - hidden during print */}
      <div className="min-h-screen bg-white no-print">
        {/* Header */}
        <div className="bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ChartBarIcon className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Survey Analytics</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Analyze and compare compensation data across different specialties and surveys
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PrinterIcon className="h-4 w-4 mr-2 text-gray-500" />
                  Print
                </button>
                <button
                  onClick={handleExcelExport}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export to Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative search-bar">
              <div className="relative">
                <MagnifyingGlassIcon
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm"
                  placeholder="Search specialties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setIsOpen(true)}
                />
              </div>

              {/* Dropdown */}
              {isOpen && (
                <div className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  {filteredSpecialties.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-500">
                      No specialties found
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto">
                      {filteredSpecialties.map((specialty) => (
                        <div
                          key={specialty}
                          className={`relative cursor-pointer select-none px-4 py-2 text-sm ${
                            specialty === selectedSpecialty
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-900 hover:bg-gray-50'
                          }`}
                          onClick={() => {
                            setSelectedSpecialty(specialty);
                            setIsOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          {specialty}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Specialty Display */}
            {selectedSpecialty && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 specialty-selector">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Selected: <span className="text-blue-600">{selectedSpecialty}</span>
                      </h2>
                      {specialtyData?.mapping.mappedSpecialties.length > 0 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Mapped to: {specialtyData.mapping.mappedSpecialties.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Print-only header - hidden on screen */}
            {selectedSpecialty && (
              <div className="hidden print:block print-header">
                <h1>Blended Survey Data</h1>
                <h2>{selectedSpecialty}</h2>
              </div>
            )}

            {/* Metrics Cards */}
            {selectedSpecialty && specialtyData && (
              <div className="space-y-6 print-content">
                {metricSections.map((section) => (
                  <div key={section.key} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden metric-section">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 no-print">
                      <div className="flex items-center space-x-3">
                        {section.icon}
                        <div>
                          <h2 className="text-lg font-medium text-gray-900">{section.title}</h2>
                          <p className="text-sm text-gray-500">{section.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-4 overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Source
                            </th>
                            {percentiles.map((percentile) => (
                              <th
                                key={percentile}
                                scope="col"
                                className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {percentile.replace('p', '')}th
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {Object.entries(specialtyData.surveyValues).map(([vendor, data]) => (
                            data[section.key] && (
                              <tr key={vendor} className="hover:bg-gray-50">
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatVendorName(vendor)}
                                </td>
                                {percentiles.map((percentile) => (
                                  <td key={percentile} className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                                    {data[section.key]?.[percentile] ? 
                                      section.format(data[section.key]![percentile]) : 
                                      '—'}
                                  </td>
                                ))}
                              </tr>
                            )
                          ))}
                          <tr className="bg-blue-50">
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-blue-900">
                              Average
                            </td>
                            {percentiles.map((percentile) => (
                              <td key={percentile} className="px-3 py-2 whitespace-nowrap text-sm text-right font-medium text-blue-900">
                                {specialtyData.averages[section.key][percentile] ? 
                                  section.format(specialtyData.averages[section.key][percentile]) : 
                                  '—'}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                <div className="print-footer">
                  Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!selectedSpecialty && (
              <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12">
                <div className="text-center">
                  <DocumentChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No specialty selected</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a specialty from the dropdown above to view compensation analytics
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Print view - only shown during print */}
      <PrintView />
    </>
  );
};

export default SurveyAnalytics; 
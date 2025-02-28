'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDownIcon, ArrowDownTrayIcon, ChartBarIcon, DocumentChartBarIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, CheckIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useSurveyContext } from '@/context/SurveyContext';
import { 
  areSpecialtiesSynonyms, 
  getSpecialtySynonyms,
  normalizeSpecialtyName,
  areSpecialtyVariations,
  findStandardSpecialty,
  standardSpecialties,
  StandardSpecialty
} from '@/utils/specialtyMapping';
import { PrintLayout } from './PrintLayout';

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

interface CustomBlendSelection {
  surveyId: string;
  specialty: string;
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
  const formattedName = vendorMap[vendor.toUpperCase()] || vendor;
  // Keep MGMA in uppercase, others in proper case
  return formattedName;
};

const SurveyAnalytics: React.FC = () => {
  const { specialtyMappings, surveyData } = useSurveyContext();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'select' | 'analyze' | 'review'>('select');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomBlend, setIsCustomBlend] = useState(false);
  const [customBlendSelections, setCustomBlendSelections] = useState<CustomBlendSelection[]>([]);

  // Get all unique specialties
  const specialties = useMemo(() => {
    // Create a set to store unique primary specialties
    const primarySpecialties = new Set<string>();

    try {
      // Load mapped groups from localStorage
      const savedMappings = localStorage.getItem('specialty-mappings');
      if (savedMappings) {
        const mappedGroups = JSON.parse(savedMappings);
        
        // For each mapped group, add only the first specialty as the primary one
        mappedGroups.forEach((group: { specialties: Array<{ specialty: string }> }) => {
          if (group.specialties && group.specialties.length > 0) {
            primarySpecialties.add(group.specialties[0].specialty);
          }
        });
      }

      // Add any standalone specialties from survey data that aren't mapped
      if (surveyData && typeof surveyData === 'object') {
        Object.entries(surveyData).forEach(([_, sectionData]) => {
          if (sectionData && Array.isArray(sectionData)) {
            sectionData.forEach(row => {
              if (row && typeof row === 'object' && 'specialty' in row && typeof row.specialty === 'string') {
                if (!primarySpecialties.has(row.specialty)) {
                  primarySpecialties.add(row.specialty);
                }
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error processing specialties:', error);
    }

    // Convert set to sorted array
    return Array.from(primarySpecialties).sort();
  }, [surveyData]);

  // Get survey data for selected specialty
  const specialtyData = useMemo(() => {
    if (!selectedSpecialty && !isCustomBlend) return null;
    if (isCustomBlend && customBlendSelections.length === 0) return null;

    const surveyValues: Record<string, SurveyData> = {};

    if (isCustomBlend) {
      // Process custom blend selections
      customBlendSelections.forEach(selection => {
        if (selection.surveyId && selection.specialty) {
          const survey = surveyData.find((s: { vendor: string }) => s.vendor === selection.surveyId);
          if (survey) {
            const matchingRow = survey.data.find((row: { specialty: string }) => row.specialty === selection.specialty);
            if (matchingRow) {
              surveyValues[`${selection.surveyId}-${selection.specialty}`] = {
                specialty: selection.specialty,
                tcc: matchingRow.tcc,
                wrvu: matchingRow.wrvu,
                cf: matchingRow.cf
              };
            }
          }
        }
      });
    } else if (selectedSpecialty) {
      // Get all related specialties from the mapping
      const mapping = specialtyMappings[selectedSpecialty];
      const allSpecialties = new Set([selectedSpecialty, ...(mapping?.mappedSpecialties || [])]);

      // Collect data from each survey
      surveyData.forEach(survey => {
        const matchingRows = survey.data.filter(row => 
          allSpecialties.has(row.specialty)
        );

        if (matchingRows.length > 0) {
          const aggregatedData: SurveyData = {
            specialty: matchingRows[0].specialty,
            tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
            wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
            cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
          };

          ['tcc', 'wrvu', 'cf'].forEach(metric => {
            percentiles.forEach(percentile => {
              const values = matchingRows
                .map(row => {
                  const metricData = row[metric as keyof typeof row];
                  return metricData && typeof metricData === 'object' ? metricData[percentile] : undefined;
                })
                .filter((v): v is number => v !== undefined && !isNaN(v));
              
              if (values.length > 0) {
                const metricKey = metric as keyof SurveyData;
                if (aggregatedData[metricKey] && typeof aggregatedData[metricKey] === 'object') {
                  (aggregatedData[metricKey] as SurveyMetric)[percentile] = 
                    values.reduce((a, b) => a + b, 0) / values.length;
                }
              }
            });
          });

          surveyValues[survey.vendor] = aggregatedData;
        }
      });
    }

    // Calculate overall averages across surveys
    const averages: Record<'tcc' | 'wrvu' | 'cf', SurveyMetric> = {
      tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
      wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
      cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
    };

    ['tcc', 'wrvu', 'cf'].forEach(metric => {
      percentiles.forEach(percentile => {
        const values = Object.values(surveyValues)
          .map(v => {
            const metricData = v[metric as keyof SurveyData];
            return metricData && typeof metricData === 'object' ? metricData[percentile] : undefined;
          })
          .filter((v): v is number => v !== undefined && !isNaN(v));
        
        if (values.length > 0) {
          const metricKey = metric as keyof typeof averages;
          averages[metricKey][percentile] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      });
    });

    return {
      surveyValues,
      averages,
      mapping: isCustomBlend ? {
        mappedSpecialties: customBlendSelections
          .filter(s => s.surveyId && s.specialty)
          .map(s => s.specialty)
      } : {
        mappedSpecialties: Array.from(new Set([selectedSpecialty, ...(specialtyMappings[selectedSpecialty]?.mappedSpecialties || [])]))
      }
    };
  }, [selectedSpecialty, surveyData, specialtyMappings, isCustomBlend, customBlendSelections]);

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

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const PrintView = () => {
    if (!selectedSpecialty || !specialtyData) return null;
    
    const customBlendSubheader = isCustomBlend 
      ? `Custom Blend Analysis: ${customBlendSelections
          .filter(s => s.surveyId && s.specialty)
          .map(s => `${formatVendorName(s.surveyId)} - ${s.specialty}`)
          .join(', ')}`
      : `Specialty Analysis: ${selectedSpecialty}`;

    const printSections = metricSections.map(section => ({
      title: section.title,
      data: Object.entries(specialtyData.surveyValues).map(([vendor, data]) => ({
        source: `${formatVendorName(vendor.split('-')[0])} - ${data.specialty}`,
        values: {
          p25: data[section.key]?.p25 !== undefined ? section.format(data[section.key]!.p25) : '—',
          p50: data[section.key]?.p50 !== undefined ? section.format(data[section.key]!.p50) : '—',
          p75: data[section.key]?.p75 !== undefined ? section.format(data[section.key]!.p75) : '—',
          p90: data[section.key]?.p90 !== undefined ? section.format(data[section.key]!.p90) : '—'
        }
      })),
      averages: {
        p25: section.format(specialtyData.averages[section.key].p25),
        p50: section.format(specialtyData.averages[section.key].p50),
        p75: section.format(specialtyData.averages[section.key].p75),
        p90: section.format(specialtyData.averages[section.key].p90)
      }
    }));

    return (
      <PrintLayout
        title="Market Data Report"
        subtitle={customBlendSubheader}
        sections={printSections}
      />
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
      {/* Screen View */}
      <div className="screen-only">
        <main className="max-w-7xl mx-auto">
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative search-bar">
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

              {/* Dropdown */}
              {isOpen && (
                <div className="absolute z-10 mt-1 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                    <button
                      onClick={() => {
                        setIsCustomBlend(!isCustomBlend);
                        setIsOpen(false);
                        setSearchQuery('');
                        if (!isCustomBlend) {
                          setSelectedSpecialty(null);
                          setCustomBlendSelections([]);
                        }
                      }}
                      className="w-full text-left hover:text-blue-600 flex items-center space-x-2"
                    >
                      <ArrowsRightLeftIcon className="h-4 w-4" />
                      <span>{isCustomBlend ? 'Switch to Standard View' : 'Create Custom Blend'}</span>
                    </button>
                  </div>
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
                            if (!isCustomBlend) {
                              setSelectedSpecialty(specialty);
                              setIsOpen(false);
                              setSearchQuery('');
                            }
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

            {/* Custom Blend Interface */}
            {isCustomBlend && (
              <div className="bg-white rounded-lg border-2 border-blue-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Custom Survey Blend</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCustomBlendSelections([...customBlendSelections, { surveyId: '', specialty: '' }])}
                      className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-sm font-medium rounded-lg text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Survey Selection
                    </button>
                    <button
                      onClick={() => {
                        const validSelections = customBlendSelections.filter(s => s.surveyId && s.specialty);
                        if (validSelections.length === 0) {
                          alert('Please select at least one survey and specialty to blend');
                          return;
                        }
                        setIsCustomBlend(true);
                        setSelectedSpecialty('custom-blend');
                        setCustomBlendSelections([...validSelections]);
                        setIsOpen(false);
                      }}
                      disabled={!customBlendSelections.some(s => s.surveyId && s.specialty)}
                      className={`inline-flex items-center px-4 py-1.5 border text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                        customBlendSelections.some(s => s.surveyId && s.specialty)
                          ? 'border-blue-600 text-white bg-blue-600 hover:bg-blue-700'
                          : 'border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed'
                      }`}
                    >
                      <ChartBarIcon className="h-4 w-4 mr-2" />
                      Blend Data
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {customBlendSelections.map((selection, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <select
                        value={selection.surveyId}
                        onChange={(e) => {
                          const newSelections = [...customBlendSelections];
                          newSelections[index] = { ...selection, surveyId: e.target.value, specialty: '' };
                          setCustomBlendSelections(newSelections);
                        }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Select Survey...</option>
                        {surveyData.map((survey) => (
                          <option key={survey.vendor} value={survey.vendor}>
                            {formatVendorName(survey.vendor)}
                          </option>
                        ))}
                      </select>
                      
                      <select
                        value={selection.specialty}
                        onChange={(e) => {
                          const newSelections = [...customBlendSelections];
                          newSelections[index] = { ...selection, specialty: e.target.value };
                          setCustomBlendSelections(newSelections);
                        }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        disabled={!selection.surveyId}
                      >
                        <option value="">Select Specialty...</option>
                        {selection.surveyId && surveyData
                          .find(s => s.vendor === selection.surveyId)
                          ?.data.map(row => row.specialty)
                          .filter((specialty, i, arr) => arr.indexOf(specialty) === i)
                          .sort()
                          .map(specialty => (
                            <option key={specialty} value={specialty}>
                              {specialty}
                            </option>
                          ))}
                      </select>
                      
                      <button
                        onClick={() => {
                          const newSelections = [...customBlendSelections];
                          newSelections.splice(index, 1);
                          setCustomBlendSelections(newSelections);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {customBlendSelections.length > 0 && (
                  <div className="text-sm text-gray-500 mt-2">
                    {customBlendSelections.some(s => s.surveyId && s.specialty) ? (
                      <p className="flex items-center text-blue-600">
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Ready to blend {customBlendSelections.filter(s => s.surveyId && s.specialty).length} specialties
                      </p>
                    ) : (
                      <p>Select at least one survey and specialty to create a blend</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!selectedSpecialty && !isCustomBlend && (
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

            {/* Selected Specialty Display */}
            {!isCustomBlend && selectedSpecialty && specialtyData && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 specialty-selector">
                <div className="p-4">
                  <div className="flex items-center">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        Selected: <span className="text-blue-600">{selectedSpecialty}</span>
                      </h2>
                      {specialtyData.mapping.mappedSpecialties.length > 1 && (
                        <p className="mt-1 text-sm text-gray-500">
                          Mapped variations: {specialtyData.mapping.mappedSpecialties.filter(s => s !== selectedSpecialty).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Cards */}
            {((selectedSpecialty && !isCustomBlend) || (isCustomBlend && customBlendSelections.some(s => s.surveyId && s.specialty))) && specialtyData && (
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
                      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
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
                                  {`${formatVendorName(vendor.split('-')[0])} - ${data.specialty}`}
                                </td>
                                {percentiles.map((p) => (
                                  <td key={p} className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-900">
                                    {data[section.key]?.[p] ? 
                                      section.format(data[section.key]![p]) : 
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
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Print View */}
      <PrintView />
    </>
  );
};

export default SurveyAnalytics; 
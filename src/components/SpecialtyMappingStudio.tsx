import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon, CheckCircleIcon, ArrowPathIcon, PlusIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { calculateStringSimilarity } from '@/utils/string';
import { findMatchingSpecialties } from '@/utils/surveySpecialtyMapping';
import type { SurveyVendor, SpecialtyMapping } from '@/utils/surveySpecialtyMapping';
import { toast } from 'react-hot-toast';
import { 
  areSpecialtiesSynonyms, 
  getSpecialtySynonyms,
  normalizeSpecialtyName,
  areSpecialtyVariations,
  findStandardSpecialty
} from '@/utils/specialtyMapping';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import { Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface SpecialtyMetrics {
  tcc?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  wrvu?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  cf?: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
}

interface UnmappedSpecialty {
  name: string;
  vendor: string;
  metrics?: SpecialtyMetrics;
  count: number;
}

interface SuggestedMapping {
  specialty: string;
  confidence: number;
  vendor: string;
  metrics?: SpecialtyMetrics;
  matchType: 'exact' | 'synonym' | 'similar' | 'category';
  matchReason: string;
}

interface SpecialtyData {
  specialty: string;
  vendor: string;
  metrics?: SpecialtyMetrics;
}

interface MappedGroup {
  id: string;
  specialties: SpecialtyData[];
  createdAt: Date;
  isSingleSource?: boolean;
}

interface SpecialtyMappingStudioProps {
  surveys: Array<{
    id: string;
    vendor: string;
    data: Array<{
      specialty: string;
      tcc?: SpecialtyMetrics['tcc'];
      wrvu?: SpecialtyMetrics['wrvu'];
      cf?: SpecialtyMetrics['cf'];
    }>;
  }>;
  onMappingChange: (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => void;
}

interface AutoMapSuggestion {
  sourceSpecialty: SpecialtyData;
  suggestedMatches: {
    specialty: SpecialtyData;
    confidence: number;
    reason: string;
  }[];
}

interface MappingTableRow {
  sourceSpecialty: SpecialtyData;
  matches: Array<{
    specialty: SpecialtyData;
    confidence: number;
    reason: string;
    status?: 'approved' | 'rejected';
  }>;
}

// Helper to format vendor names
const formatVendorName = (vendor: string): string => {
  // Normalize the input first
  const normalized = vendor.toLowerCase().trim();
  
  const vendorMap: Record<string, string> = {
    'mgma': 'MGMA',
    'gallagher': 'GALLAGHER',
    'sullivan': 'SULLIVANCOTTER',
    'sullivancotter': 'SULLIVANCOTTER',
    'sullivan cotter': 'SULLIVANCOTTER',
    'sullivan-cotter': 'SULLIVANCOTTER'
  };

  console.log('Formatting vendor name:', vendor, 'normalized:', normalized, 'result:', vendorMap[normalized] || vendor.toUpperCase());
  return vendorMap[normalized] || vendor.toUpperCase();
};

// Add interfaces for specialty types
interface Connection {
  specialty: string;
  vendor: string;
}

interface MappedSpecialty {
  specialty: string;
  name: string;
  vendor: string;
  connections: Connection[];
  resolved?: boolean;
}

interface SimilarSpecialty {
  specialty: string;
  vendor: string;
  confidence: number;
  matchType: 'exact' | 'synonym' | 'fuzzy';
  synonyms?: string[];
}

// Add new interface for filters
interface SpecialtyFilters {
  searchTerm: string;
  selectedVendors: Set<string>;
}

// Add this interface near the other interfaces
interface SpecialtySourceInfo {
  specialty: string;
  sources: {
    vendor: string;
    count: number;
  }[];
  totalSources: number;
}

const STORAGE_KEY = 'specialty-mappings';

const SpecialtyMappingStudio: React.FC<SpecialtyMappingStudioProps> = ({
  surveys,
  onMappingChange,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(new Set());
  const [mappedGroups, setMappedGroups] = useState<MappedGroup[]>(() => {
    // Load initial state from localStorage
    const savedMappings = localStorage.getItem(STORAGE_KEY);
    if (savedMappings) {
      try {
        const parsed = JSON.parse(savedMappings);
        // Convert date strings back to Date objects
        return parsed.map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt)
        }));
      } catch (error) {
        console.error('Error loading saved mappings:', error);
        return [];
      }
    }
    return [];
  });
  const [autoMapSuggestions, setAutoMapSuggestions] = useState<AutoMapSuggestion | null>(null);
  const [viewMode, setViewMode] = useState<'auto' | 'manual' | 'mapped'>('auto');
  const [allAutoMappings, setAllAutoMappings] = useState<Array<{
    sourceSpecialty: SpecialtyData;
    matches: Array<{
      specialty: SpecialtyData;
      confidence: number;
      reason: string;
      status?: 'approved' | 'rejected';
    }>;
  }>>([]);
  const [manualMappingMode, setManualMappingMode] = useState(false);
  const [showAddMore, setShowAddMore] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Format vendor name consistently
  const formatVendorName = (vendor: string): string => {
    const normalized = vendor.toLowerCase().trim();
    const vendorMap: Record<string, string> = {
      'mgma': 'MGMA',
      'gallagher': 'Gallagher',
      'sullivan': 'Sullivan Cotter',
      'sullivancotter': 'Sullivan Cotter',
      'sullivan cotter': 'Sullivan Cotter',
      'sullivan-cotter': 'Sullivan Cotter'
    };
    return vendorMap[normalized] || vendor;
  };

  // Organize specialties by vendor
  const specialtiesByVendor = useMemo(() => {
    const result: Record<string, SpecialtyData[]> = {};
    
    surveys.forEach(survey => {
      const vendorName = formatVendorName(survey.vendor);
      if (!result[vendorName]) {
        result[vendorName] = [];
      }
      
      survey.data.forEach(item => {
        if (item.specialty && typeof item.specialty === 'string') {
          // Check if specialty is already mapped
          const isAlreadyMapped = mappedGroups.some(group =>
            group.specialties.some(s => 
              s.specialty === item.specialty && s.vendor === vendorName
            )
          );
          
          if (!isAlreadyMapped) {
            result[vendorName].push({
              specialty: item.specialty.trim(),
              vendor: vendorName,
              metrics: {
                tcc: item.tcc,
                wrvu: item.wrvu,
                cf: item.cf
              }
            });
          }
        }
      });
    });

    // Sort specialties alphabetically within each vendor
    Object.keys(result).forEach(vendor => {
      result[vendor].sort((a, b) => a.specialty.localeCompare(b.specialty));
    });

    return result;
  }, [surveys, mappedGroups]);

  // Filter specialties based on search
  const filteredSpecialties = useMemo(() => {
    const result: Record<string, SpecialtyData[]> = {};
    const searchTerm = searchQuery.toLowerCase();

    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      result[vendor] = specialties.filter(item =>
        item.specialty.toLowerCase().includes(searchTerm)
      );
    });

    return result;
  }, [specialtiesByVendor, searchQuery]);

  // New function to find potential matches for a specialty
  const findPotentialMatches = (specialty: SpecialtyData): AutoMapSuggestion => {
    const suggestions: AutoMapSuggestion = {
      sourceSpecialty: specialty,
      suggestedMatches: []
    };

    // Look through all vendors except the source vendor
    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      if (vendor !== specialty.vendor) {
        specialties.forEach(targetSpecialty => {
          // Calculate similarity
          const similarity = calculateStringSimilarity(
            specialty.specialty,
            targetSpecialty.specialty
          );

          let reason = '';
          let confidence = similarity;

          // Exact match
          if (similarity === 1) {
            reason = 'Exact match';
            confidence = 1;
          }
          // Check for synonyms
          else if (areSpecialtiesSynonyms(specialty.specialty, targetSpecialty.specialty)) {
            reason = 'Known synonym';
            confidence = 0.95;
          }
          // High similarity
          else if (similarity >= 0.8) {
            reason = 'Very similar name';
          }
          // Moderate similarity
          else if (similarity >= 0.6) {
            reason = 'Similar name';
          }

          if (confidence >= 0.6) {
            suggestions.suggestedMatches.push({
              specialty: targetSpecialty,
              confidence,
              reason
            });
          }
        });
      }
    });

    // Sort by confidence
    suggestions.suggestedMatches.sort((a, b) => b.confidence - a.confidence);
    return suggestions;
  };

  // Update the toggleSpecialtySelection function
  const toggleSpecialtySelection = (specialty: SpecialtyData) => {
    const key = `${specialty.vendor}:${specialty.specialty}`;
    
    setSelectedSpecialties(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
        setAutoMapSuggestions(null);
      } else {
        updated.clear(); // Clear previous selections
        updated.add(key);
        // Find and set suggestions
        const suggestions = findPotentialMatches(specialty);
        setAutoMapSuggestions(suggestions);
      }
      return updated;
    });
  };

  // New function to accept suggested matches
  const acceptSuggestedMatches = (suggestion: AutoMapSuggestion) => {
    const selectedItems: SpecialtyData[] = [
      suggestion.sourceSpecialty,
      ...suggestion.suggestedMatches.map(match => match.specialty)
    ];

    const newGroup: MappedGroup = {
      id: Math.random().toString(36).substr(2, 9),
      specialties: selectedItems,
      createdAt: new Date()
    };

    setMappedGroups(prev => [...prev, newGroup]);
    setSelectedSpecialties(new Set());
    setAutoMapSuggestions(null);
    
    // Notify parent component
    const mappedSpecialties = suggestion.suggestedMatches.map(match => match.specialty.specialty);
    onMappingChange(suggestion.sourceSpecialty.specialty, mappedSpecialties);
    
    toast.success('Created new mapping group from suggestions');
  };

  // Render a specialty card
  const renderSpecialtyCard = (specialty: SpecialtyData) => {
    const isSelected = selectedSpecialties.has(`${specialty.vendor}:${specialty.specialty}`);
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`
          px-3 py-2 rounded-md transition-all cursor-pointer
          ${isSelected 
            ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
            : 'hover:bg-gray-50'
          }
        `}
        onClick={() => toggleSpecialtySelection(specialty)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
              {specialty.specialty}
            </div>
            {specialty.metrics?.tcc && (
              <div className="mt-0.5 text-xs text-gray-500">
                TCC: ${(specialty.metrics.tcc.p50 / 1000).toFixed(0)}k
              </div>
            )}
          </div>
          {isSelected && (
            <CheckCircleIcon className="h-5 w-5 text-indigo-500 flex-shrink-0 ml-2" />
          )}
        </div>
      </motion.div>
    );
  };

  // New function to generate all possible mappings
  const generateAllMappings = useCallback(() => {
    // First, collect all mapped specialties
    const mappedSpecialtySet = new Set(
      mappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}:${s.vendor}`)
      )
    );

    // Group specialties by name (ignoring vendor)
    const specialtiesByName = new Map<string, SpecialtyData[]>();
    
    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      specialties.forEach(specialty => {
        const key = `${specialty.specialty}:${specialty.vendor}`;
        // Skip if already mapped
        if (!mappedSpecialtySet.has(key)) {
          const existing = specialtiesByName.get(specialty.specialty) || [];
          specialtiesByName.set(specialty.specialty, [...existing, specialty]);
        }
      });
    });

    // Create mappings for each unique specialty
    const allMappings = Array.from(specialtiesByName.entries())
      .map(([specialtyName, instances]) => {
        // Take the first instance as source
        const sourceSpecialty = instances[0];
        
        // Find matches from other vendors
        const matches = instances.slice(1).map(match => {
          const similarity = calculateStringSimilarity(
            sourceSpecialty.specialty,
            match.specialty
          );

          let reason = '';
          let confidence = similarity;

          // Exact match
          if (similarity === 1) {
            reason = 'Exact match';
            confidence = 1;
          }
          // Check for synonyms
          else if (areSpecialtiesSynonyms(sourceSpecialty.specialty, match.specialty)) {
            reason = 'Known synonym';
            confidence = 0.95;
          }
          // High similarity
          else if (similarity >= 0.8) {
            reason = 'Very similar name';
          }
          // Moderate similarity
          else if (similarity >= 0.6) {
            reason = 'Similar name';
          }

          return {
            specialty: match,
            confidence,
            reason,
            status: undefined as 'approved' | 'rejected' | undefined
          };
        });

        // Also look for potential matches in other specialties
        Object.entries(specialtiesByVendor).forEach(([vendor, vendorSpecialties]) => {
          if (vendor !== sourceSpecialty.vendor) {
            vendorSpecialties
              .filter(s => 
                s.specialty !== specialtyName && 
                !mappedSpecialtySet.has(`${s.specialty}:${s.vendor}`)
              )
              .forEach(targetSpecialty => {
                const similarity = calculateStringSimilarity(
                  sourceSpecialty.specialty,
                  targetSpecialty.specialty
                );

                if (similarity >= 0.6) {
                  let reason = '';
                  let confidence = similarity;

                  if (areSpecialtiesSynonyms(sourceSpecialty.specialty, targetSpecialty.specialty)) {
                    reason = 'Known synonym';
                    confidence = 0.95;
                  } else if (similarity >= 0.8) {
                    reason = 'Very similar name';
                  } else {
                    reason = 'Similar name';
                  }

                  matches.push({
                    specialty: targetSpecialty,
                    confidence,
                    reason,
                    status: undefined
                  });
                }
              });
          }
        });

        return {
          sourceSpecialty,
          matches: matches.sort((a, b) => b.confidence - a.confidence)
        };
      })
      .filter(item => item.matches.length > 0);

    // Sort by source specialty name
    allMappings.sort((a, b) => 
      a.sourceSpecialty.specialty.localeCompare(b.sourceSpecialty.specialty)
    );

    setAllAutoMappings(allMappings);
  }, [specialtiesByVendor, mappedGroups]);

  // Call on mount
  useEffect(() => {
    generateAllMappings();
  }, [generateAllMappings]);

  // Function to approve/reject a mapping
  const updateMappingStatus = (
    sourceSpecialty: SpecialtyData,
    matchSpecialty: SpecialtyData,
    status: 'approved' | 'rejected'
  ) => {
    setAllAutoMappings(prev => {
      const newMappings = prev.map(mapping => {
        if (mapping.sourceSpecialty.specialty === sourceSpecialty.specialty &&
            mapping.sourceSpecialty.vendor === sourceSpecialty.vendor) {
          
          // Update the status of the specific match
          const updatedMatches = mapping.matches.map(match => {
            if (match.specialty.specialty === matchSpecialty.specialty &&
                match.specialty.vendor === matchSpecialty.vendor) {
              return { ...match, status };
            }
            return match;
          });

          return { ...mapping, matches: updatedMatches };
        }
        return mapping;
      });

      return newMappings;
    });

    if (status === 'approved') {
      toast.success('Match approved - approve or reject other matches to create the group');
    } else {
      toast.success('Match rejected');
    }
  };

  // Effect to handle mapping group creation when matches are updated
  useEffect(() => {
    allAutoMappings.forEach(mapping => {
      const allMatchesHandled = mapping.matches.every(m => m.status === 'approved' || m.status === 'rejected');
      const approvedMatches = mapping.matches.filter(m => m.status === 'approved');

      if (allMatchesHandled && approvedMatches.length > 0) {
        // Create the mapping group
        const newGroup: MappedGroup = {
          id: Math.random().toString(36).substr(2, 9),
          specialties: [
            mapping.sourceSpecialty,
            ...approvedMatches.map(m => m.specialty)
          ],
          createdAt: new Date()
        };
        
        setMappedGroups(prev => [...prev, newGroup]);
        onMappingChange(
          mapping.sourceSpecialty.specialty, 
          approvedMatches.map(m => m.specialty.specialty)
        );

        // Remove this mapping from auto-mappings
        setAllAutoMappings(prev => 
          prev.filter(m => 
            m.sourceSpecialty.specialty !== mapping.sourceSpecialty.specialty ||
            m.sourceSpecialty.vendor !== mapping.sourceSpecialty.vendor
          )
        );

        toast.success('Created mapping group with all approved matches');
      }
    });
  }, [allAutoMappings, onMappingChange]);

  // Filter mappings based on search
  const filteredMappings = useMemo(() => {
    return allAutoMappings.filter(mapping =>
      mapping.sourceSpecialty.specialty.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allAutoMappings, searchQuery]);

  // Handle manual specialty selection
  const handleSpecialtySelect = (specialty: SpecialtyData) => {
    const key = `${specialty.vendor}:${specialty.specialty}`;
    setSelectedSpecialties(prev => {
      const updated = new Set(prev);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      return updated;
    });
  };

  // Create manual mapping group
  const createManualMapping = () => {
    if (selectedSpecialties.size < 1) {
      toast.error('Please select at least 1 specialty');
      return;
    }

    const selectedItems: SpecialtyData[] = Array.from(selectedSpecialties).map(key => {
      const [vendor, specialty] = key.split(':');
      return {
        specialty,
        vendor,
        metrics: specialtiesByVendor[vendor]?.find(s => s.specialty === specialty)?.metrics
      };
    });

    const newGroup: MappedGroup = {
      id: Math.random().toString(36).substr(2, 9),
      specialties: selectedItems,
      createdAt: new Date(),
      isSingleSource: selectedItems.length === 1 // Mark as single source if only one specialty
    };

    setMappedGroups(prev => [...prev, newGroup]);
    setSelectedSpecialties(new Set());
    
    // Notify parent component
    const sourceSpecialty = selectedItems[0].specialty;
    const mappedSpecialties = selectedItems.slice(1).map(item => item.specialty);
    onMappingChange(sourceSpecialty, mappedSpecialties);
    
    toast.success(selectedItems.length === 1 
      ? 'Created single source specialty mapping'
      : 'Created new mapping group');
  };

  // Add click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (showAddMore && !(event.target as Element).closest('.relative')) {
        setShowAddMore(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddMore]);

  // Add effect to save mappings whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedGroups));
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  }, [mappedGroups]);

  // Update clearAllMappings function
  const clearAllMappings = () => {
    setMappedGroups([]);
    localStorage.removeItem(STORAGE_KEY); // Clear from localStorage
    generateAllMappings();
    setShowClearConfirmation(false);
    toast.success('All mappings cleared');
  };

  // Check if all specialties are mapped
  const allSpecialtiesMapped = useMemo(() => {
    // Count total unmapped specialties across all vendors
    let totalUnmapped = 0;
    
    Object.values(specialtiesByVendor).forEach(specialties => {
      totalUnmapped += specialties.length;
    });
    
    return totalUnmapped === 0;
  }, [specialtiesByVendor]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  Specialty Mapping Studio
                </h2>
                <button
                  onClick={() => setShowHelpModal(true)}
                  className="ml-2 text-gray-400 hover:text-blue-500 focus:outline-none"
                  title="View help information"
                >
                  <InformationCircleIcon className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Map similar specialties across different survey vendors
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg shadow-sm">
                <button
                  onClick={() => setViewMode('auto')}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border
                    ${viewMode === 'auto'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                >
                  Auto-Map Mode
                </button>
                <button
                  onClick={() => setViewMode('manual')}
                  className={`px-4 py-2 text-sm font-medium border-y
                    ${viewMode === 'manual'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                >
                  Manual Map Mode
                </button>
                <button
                  onClick={() => setViewMode('mapped')}
                  className={`px-4 py-2 text-sm font-medium rounded-r-lg border
                    ${viewMode === 'mapped'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                >
                  View Mapped
                </button>
              </div>
              <div className="h-8 w-px bg-gray-200" />
              <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border shadow-sm
                ${allSpecialtiesMapped 
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                transition-colors duration-150 ease-in-out`}
              >
                {allSpecialtiesMapped ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-1.5" />
                    100% Complete
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-1.5" />
                    In Progress
                  </>
                )}
              </span>
              <button
                onClick={() => setShowClearConfirmation(true)}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium
                  bg-white text-red-600 hover:bg-red-50 border border-red-200
                  transition-colors duration-150 ease-in-out shadow-sm"
              >
                <XMarkIcon className="h-4 w-4 mr-1.5" />
                Clear All Mappings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Clear Confirmation Dialog */}
      <Transition appear show={showClearConfirmation} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowClearConfirmation(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Clear All Mappings?
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      This will remove all specialty mappings. This action cannot be undone.
                      Are you sure you want to continue?
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      onClick={() => setShowClearConfirmation(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                      onClick={clearAllMappings}
                    >
                      Clear All
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {viewMode === 'mapped' ? (
          <div className="space-y-4">
            {/* Search Field */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4">
                <div className="relative">
                  <MagnifyingGlassIcon 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search through mapped specialty groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      shadow-sm placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Mapped Specialties Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Mapped Specialty Groups</h3>
                  <span className="text-sm text-gray-500">
                    {mappedGroups.filter(group =>
                      searchQuery ? 
                        group.specialties.some(s => 
                          s.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                        ) : true
                    ).length} groups
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-200">
                {mappedGroups
                  .filter(group =>
                    searchQuery ? 
                      group.specialties.some(s => 
                        s.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                      ) : true
                  )
                  .map((group) => (
                  <div key={group.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2">
                          {group.specialties.map((specialty, index) => (
                            <div key={`${specialty.vendor}:${specialty.specialty}`} 
                                 className="flex items-center">
                              <span className="inline-flex items-center px-3 py-1 rounded-md text-sm
                                bg-gray-100 text-gray-900 border border-gray-200">
                                {specialty.specialty}
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                                  {specialty.vendor}
                                </span>
                              </span>
                              {index < group.specialties.length - 1 && (
                                <ArrowsRightLeftIcon className="h-4 w-4 mx-2 text-gray-400" />
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Created {new Date(group.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setMappedGroups(prev => prev.filter(g => g.id !== group.id));
                          generateAllMappings();
                          toast.success('Mapping removed');
                        }}
                        className="ml-4 p-2 text-gray-400 hover:text-red-500 rounded-md
                          hover:bg-red-50 transition-colors"
                        title="Remove mapping"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Unmapped Specialties Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Unmapped Specialties</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {Object.values(specialtiesByVendor).reduce((acc, curr) => acc + curr.length, 0)} total
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6 grid grid-cols-3 gap-6">
                {Object.entries(specialtiesByVendor).map(([vendor, specialties]) => (
                  <div key={vendor} className="flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-900">{vendor}</h4>
                      <span className="text-xs text-gray-500">{specialties.length} specialties</span>
                    </div>
                    <div className="space-y-2">
                      {specialties
                        .filter(s => searchQuery ? s.specialty.toLowerCase().includes(searchQuery.toLowerCase()) : true)
                        .map(specialty => (
                        <div
                          key={`${specialty.vendor}:${specialty.specialty}`}
                          className="group flex items-center justify-between p-2 rounded-md border border-gray-200 bg-white hover:bg-gray-50"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {specialty.specialty}
                            </div>
                            {specialty.metrics?.tcc && (
                              <div className="mt-0.5 text-xs text-gray-500">
                                TCC: {formatCurrency(specialty.metrics.tcc.p50)}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              // Create a single-source mapping group
                              const newGroup: MappedGroup = {
                                id: Math.random().toString(36).substr(2, 9),
                                specialties: [specialty],
                                createdAt: new Date(),
                                isSingleSource: true
                              };
                              setMappedGroups(prev => [...prev, newGroup]);
                              toast.success('Marked as single source specialty');
                            }}
                            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs font-medium rounded
                              text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200
                              transition-all duration-150"
                          >
                            Mark as Single Source
                          </button>
                        </div>
                      ))}
                      {specialties.length === 0 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          No unmapped specialties
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : viewMode === 'manual' ? (
          <div className="space-y-4">
            {/* Search Field */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4">
                <div className="relative">
                  <MagnifyingGlassIcon 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search specialties across vendors to map together..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      shadow-sm placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Manual Mapping Interface */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="h-full flex gap-6 p-6">
                {/* Three columns for vendors */}
                <div className="flex-1 grid grid-cols-3 gap-6">
                  {Object.entries(filteredSpecialties).map(([vendor, specialties]) => (
                    <div key={vendor} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">{vendor}</h3>
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {specialties.length} specialties
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 bg-gray-50">
                        <AnimatePresence>
                          {specialties.map(specialty => (
                            <motion.div
                              key={`${specialty.vendor}:${specialty.specialty}`}
                              layout
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              className={`
                                px-3 py-2.5 rounded-md transition-all cursor-pointer
                                border shadow-sm
                                ${selectedSpecialties.has(`${specialty.vendor}:${specialty.specialty}`)
                                  ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                                }
                              `}
                              onClick={() => handleSpecialtySelect(specialty)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {specialty.specialty}
                                  </div>
                                  {specialty.metrics?.tcc && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      TCC: {formatCurrency(specialty.metrics.tcc.p50)}
                                    </div>
                                  )}
                                </div>
                                {selectedSpecialties.has(`${specialty.vendor}:${specialty.specialty}`) && (
                                  <CheckCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {specialties.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">
                            No specialties found
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Selected Specialties Panel */}
                <div className="w-80 flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Selected Specialties</h3>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {selectedSpecialties.size} selected
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-200">
                    <button
                      onClick={createManualMapping}
                      disabled={selectedSpecialties.size < 1}
                      className="w-full px-4 py-2 text-sm font-medium rounded-md
                        text-white bg-blue-600 hover:bg-blue-700
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-150 ease-in-out shadow-sm"
                    >
                      {selectedSpecialties.size === 0 
                        ? 'Select specialties to map'
                        : selectedSpecialties.size === 1
                        ? 'Create Single Source Mapping'
                        : `Create Mapping (${selectedSpecialties.size} selected)`}
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 bg-gray-50">
                    <div className="space-y-2">
                      {Array.from(selectedSpecialties).map(key => {
                        const [vendor, specialty] = key.split(':');
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-gray-50"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {specialty}
                              </div>
                              <div className="mt-0.5 text-xs text-gray-500">
                                {vendor}
                              </div>
                            </div>
                            <button
                              onClick={() => handleSpecialtySelect({ specialty, vendor })}
                              className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        );
                      })}
                      {selectedSpecialties.size === 0 && (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                          Select specialties to map together
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Field */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4">
                <div className="relative">
                  <MagnifyingGlassIcon 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <input
                    type="text"
                    placeholder="Search for specialties to find potential matches..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      shadow-sm placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Auto-Mapping Interface */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200">
              {/* Table Header Summary */}
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      Showing {filteredMappings.length} potential matches
                    </span>
                    {searchQuery && (
                      <span className="text-sm text-gray-500">
                        for "{searchQuery}"
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className="bg-gray-50">
                      <th scope="col" className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Source Specialty
                      </th>
                      <th scope="col" className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Vendor
                      </th>
                      <th scope="col" className="sticky top-0 px-6 py-4 border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Potential Matches
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredMappings.map((mapping) => (
                      <tr key={`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`}
                          className="hover:bg-gray-50 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-start space-x-3">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {mapping.sourceSpecialty.specialty}
                              </div>
                              {mapping.sourceSpecialty.metrics?.tcc && (
                                <div className="mt-1 text-xs text-gray-500">
                                  TCC: {formatCurrency(mapping.sourceSpecialty.metrics.tcc.p50)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-100">
                            {mapping.sourceSpecialty.vendor}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-3">
                            {mapping.matches.length > 1 && (
                              <div className="flex justify-end mb-2">
                                <button
                                  onClick={() => {
                                    mapping.matches.forEach(match => {
                                      if (!match.status) {
                                        updateMappingStatus(mapping.sourceSpecialty, match.specialty, 'approved');
                                      }
                                    });
                                  }}
                                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors duration-150 ease-in-out border border-green-500"
                                >
                                  <CheckIcon className="h-4 w-4 mr-2" />
                                  Accept All Matches ({mapping.matches.length})
                                </button>
                              </div>
                            )}
                            
                            {mapping.matches.map((match) => (
                              <div
                                key={`${match.specialty.vendor}:${match.specialty.specialty}`}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${match.status === 'approved' ? 'bg-green-50 border-green-200 shadow-sm' : match.status === 'rejected' ? 'bg-red-50 border-red-200 shadow-sm' : 'bg-white border-gray-200 shadow-sm group-hover:border-gray-300'}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center flex-wrap gap-2">
                                    <span className="text-sm font-medium text-gray-900">
                                      {match.specialty.specialty}
                                    </span>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                      {match.specialty.vendor}
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                      ${match.confidence >= 0.95 
                                        ? 'bg-green-50 text-green-700 border border-green-200' 
                                        : match.confidence >= 0.8
                                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'}`}
                                    >
                                      {Math.round(match.confidence * 100)}% match
                                    </span>
                                    {match.status === 'approved' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                        Approved
                                      </span>
                                    )}
                                    {match.status === 'rejected' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                  {match.specialty.metrics?.tcc && (
                                    <div className="mt-1.5 text-xs text-gray-500">
                                      TCC: {formatCurrency(match.specialty.metrics.tcc.p50)}
                                    </div>
                                  )}
                                  <div className="mt-1.5 text-xs text-gray-500 flex items-center">
                                    <InformationCircleIcon className="h-4 w-4 mr-1 text-gray-400" />
                                    {match.reason}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {/* Action buttons */}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => updateMappingStatus(mapping.sourceSpecialty, match.specialty, 'approved')}
                                      disabled={match.status === 'approved'}
                                      className={`p-2 rounded-md transition-colors
                                        ${match.status === 'approved'
                                          ? 'bg-green-100 text-green-700 border border-green-200'
                                          : 'hover:bg-green-50 text-gray-500 hover:text-green-700 border border-gray-200'}`}
                                      title="Approve match"
                                    >
                                      <CheckIcon className="h-5 w-5" />
                                    </button>
                                    <button
                                      onClick={() => updateMappingStatus(mapping.sourceSpecialty, match.specialty, 'rejected')}
                                      disabled={match.status === 'rejected'}
                                      className={`p-2 rounded-md transition-colors
                                        ${match.status === 'rejected'
                                          ? 'bg-red-100 text-red-700 border border-red-200'
                                          : 'hover:bg-red-50 text-gray-500 hover:text-red-700 border border-gray-200 hover:border-red-200'}`}
                                      title="Reject match"
                                    >
                                      <XMarkIcon className="h-5 w-5" />
                                    </button>
                                  </div>

                                  {/* Undo button for rejected matches */}
                                  {match.status === 'rejected' && (
                                    <button
                                      onClick={() => {
                                        const updatedMappings = allAutoMappings.map(m => {
                                          if (m.sourceSpecialty.specialty === mapping.sourceSpecialty.specialty) {
                                            return {
                                              ...m,
                                              matches: m.matches.map(mm => 
                                                mm.specialty.specialty === match.specialty.specialty
                                                  ? { ...mm, status: undefined }
                                                  : mm
                                              )
                                            };
                                          }
                                          return m;
                                        });
                                        setAllAutoMappings(updatedMappings);
                                      }}
                                      className="p-2 rounded-md transition-colors hover:bg-gray-50 text-gray-500 hover:text-gray-700 border border-gray-200"
                                      title="Undo rejection"
                                    >
                                      <ArrowPathIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Replace the "Add More" button with inline search */}
                            <div className="relative mt-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="Search to add more specialties..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowAddMore(true)}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md
                                      focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <MagnifyingGlassIcon 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                                  />
                                </div>
                                <button
                                  onClick={() => setShowAddMore(true)}
                                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                                    text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                >
                                  <PlusIcon className="h-4 w-4 mr-1.5" />
                                  Add
                                </button>
                              </div>

                              {/* Dropdown for search results */}
                              {showAddMore && (
                                <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                                  <div className="max-h-60 overflow-y-auto py-1">
                                    {/* Combine all specialties into a single list */}
                                    {(() => {
                                      // Collect all available specialties across vendors
                                      const availableSpecialties = Object.entries(specialtiesByVendor)
                                        .filter(([vendor]) => vendor !== mapping.sourceSpecialty.vendor) // Exclude source vendor
                                        .flatMap(([vendor, specialties]) => 
                                          specialties
                                            .filter(s => 
                                              // Filter out already mapped and matched specialties
                                              !mappedGroups.some(group => 
                                                group.specialties.some(gs => 
                                                  gs.specialty === s.specialty && gs.vendor === s.vendor
                                                )
                                              )
                                            )
                                            .filter(s => 
                                              !mapping.matches.some(m => 
                                                m.specialty.specialty === s.specialty && m.specialty.vendor === s.vendor
                                              ) &&
                                              s.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                                            )
                                            .map(s => ({ ...s, vendor }))
                                        )
                                        .sort((a, b) => a.specialty.localeCompare(b.specialty)); // Sort alphabetically

                                      if (availableSpecialties.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-sm text-gray-500">
                                            No matching specialties found
                                          </div>
                                        );
                                      }

                                      return availableSpecialties.map(specialty => (
                                        <button
                                          key={`${specialty.vendor}:${specialty.specialty}`}
                                          onClick={() => {
                                            // Add as a new match
                                            const newMatch = {
                                              specialty,
                                              confidence: calculateStringSimilarity(
                                                mapping.sourceSpecialty.specialty,
                                                specialty.specialty
                                              ),
                                              reason: 'Manually added',
                                              status: 'approved' as const
                                            };
                                            
                                            setAllAutoMappings(prev => prev.map(m => 
                                              m.sourceSpecialty.specialty === mapping.sourceSpecialty.specialty
                                                ? { ...m, matches: [...m.matches, newMatch] }
                                                : m
                                            ));
                                            
                                            setShowAddMore(false);
                                            setSearchQuery('');
                                            
                                            toast.success('Added new specialty to mapping');
                                          }}
                                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium text-gray-900">
                                              {specialty.specialty}
                                            </span>
                                            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-100">
                                              {specialty.vendor}
                                            </span>
                                          </div>
                                          <PlusIcon className="h-4 w-4 text-gray-400" />
                                        </button>
                                      ));
                                    })()}
                                  </div>
                                  <div className="border-t px-3 py-2 bg-gray-50">
                                    <button
                                      onClick={() => {
                                        setShowAddMore(false);
                                        setSearchQuery('');
                                      }}
                                      className="text-xs text-gray-500 hover:text-gray-700"
                                    >
                                      Close
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State - Only show in Auto-Map mode */}
      {viewMode === 'auto' && filteredMappings.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <MagnifyingGlassIcon className="h-12 w-12" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No specialties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search terms"
                : "Start by searching for specialties above"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtyMappingStudio; 
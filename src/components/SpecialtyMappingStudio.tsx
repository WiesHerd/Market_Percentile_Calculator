import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { calculateStringSimilarity } from '@/utils/string';
import { findMatchingSpecialties } from '@/utils/surveySpecialtyMapping';
import type { SurveyVendor, SpecialtyMapping } from '@/utils/surveySpecialtyMapping';
import { toast } from 'react-hot-toast';
import { 
  areSpecialtiesSynonyms, 
  getSpecialtySynonyms,
  normalizeSpecialtyName 
} from '@/utils/specialtyMapping';

interface SpecialtyMappingStudioProps {
  surveys: Array<{
    id: string;
    vendor: string;
    data: Array<{
      specialty: string;
      tcc: any;
      wrvu: any;
      cf: any;
    }>;
  }>;
  onMappingChange: (sourceSpecialty: string, mappedSpecialties: string[], notes?: string, resolved?: boolean) => void;
  existingMappings?: Record<string, string[]>;
}

// Helper to format vendor names
const formatVendorName = (vendor: string): string => {
  const vendorMap: Record<string, string> = {
    'mgma': 'MGMA',
    'gallagher': 'GALLAGHER',
    'sullivan': 'SULLIVANCOTTER'
  };
  return vendorMap[vendor.toLowerCase()] || vendor.toUpperCase();
};

// Add interfaces for specialty types
interface UnmappedSpecialty {
  specialty: string;
  vendor: string;
  notes?: string;
}

interface Connection {
  specialty: string;
  vendor: string;
}

interface MappedSpecialty {
  specialty: string;
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

const SpecialtyMappingStudio: React.FC<SpecialtyMappingStudioProps> = ({
  surveys,
  onMappingChange,
  existingMappings = {}
}) => {
  // View mode: 'unmapped' or 'mapped'
  const [viewMode, setViewMode] = useState<'unmapped' | 'mapped'>('unmapped');
  
  // Selected specialty for mapping
  const [selectedSpecialty, setSelectedSpecialty] = useState<UnmappedSpecialty | null>(null);
  
  // Search term for finding similar specialties
  const [searchTerm, setSearchTerm] = useState('');

  // Track mapped specialties with their connections
  const [mappings, setMappings] = useState<Record<string, string[]>>(existingMappings);

  // Track selected matches during mapping
  const [selectedMatches, setSelectedMatches] = useState<Set<string>>(new Set());

  // Add new state for survey search
  const [surveySearchTerm, setSurveySearchTerm] = useState('');

  // Add new state for filters
  const [filters, setFilters] = useState<SpecialtyFilters>({
    searchTerm: '',
    selectedVendors: new Set(['MGMA', 'GALLAGHER', 'SULLIVANCOTTER'])
  });

  // Add state for resolved specialties
  const [resolvedSpecialties, setResolvedSpecialties] = useState<Set<string>>(new Set());

  // Convert surveys to SpecialtyMapping format
  const availableSpecialties = useMemo(() => {
    const specialties: SpecialtyMapping[] = [];
    console.log('Processing surveys:', surveys);
    surveys.forEach(survey => {
      console.log('Processing survey:', survey.vendor, survey.data.length);
      survey.data.forEach(item => {
        console.log('Adding specialty:', item.specialty, 'from vendor:', survey.vendor);
        specialties.push({
          specialty: item.specialty,
          vendor: formatVendorName(survey.vendor) as SurveyVendor
        });
      });
    });
    console.log('Available specialties:', specialties);
    return specialties;
  }, [surveys]);

  // Get all unique specialties with their vendors
  const allSpecialties = useMemo((): UnmappedSpecialty[] => {
    const uniqueSpecialties = new Map<string, UnmappedSpecialty>();
    
    surveys.forEach(survey => {
      survey.data.forEach(item => {
        if (item.specialty && typeof item.specialty === 'string') {
          const specialty = item.specialty.trim();
          if (!uniqueSpecialties.has(specialty)) {
            uniqueSpecialties.set(specialty, {
              specialty,
              vendor: formatVendorName(survey.vendor)
            });
          }
        }
      });
    });
    
    return Array.from(uniqueSpecialties.values());
  }, [surveys]);

  // Get unmapped specialties
  const unmappedSpecialties = useMemo((): UnmappedSpecialty[] => {
    const unmapped = allSpecialties.filter(item => 
      !Object.keys(mappings).includes(item.specialty) &&
      !resolvedSpecialties.has(item.specialty) &&
      item.specialty.trim() !== ''
    );
    console.log('Unmapped specialties:', unmapped);
    return unmapped;
  }, [allSpecialties, mappings, resolvedSpecialties]);

  // Get mapped specialties with their connections
  const mappedSpecialties = useMemo((): MappedSpecialty[] => {
    const mapped = Object.entries(mappings).map(([specialty, connections]) => ({
      specialty,
      vendor: allSpecialties.find(s => s.specialty === specialty)?.vendor || '',
      connections: connections.map(conn => ({
        specialty: conn,
        vendor: allSpecialties.find(s => s.specialty === conn)?.vendor || ''
      }))
    }));

    // Add resolved specialties
    const resolved = Array.from(resolvedSpecialties)
      .filter(specialty => !Object.keys(mappings).includes(specialty))
      .map(specialty => {
        const specialtyInfo = allSpecialties.find(s => s.specialty === specialty);
        return {
          specialty,
          vendor: specialtyInfo?.vendor || '',
          connections: [],
          resolved: true
        };
      });

    return [...mapped, ...resolved];
  }, [mappings, allSpecialties, resolvedSpecialties]);

  // Get unique vendors
  const uniqueVendors = useMemo(() => {
    return Array.from(new Set(surveys.map(s => s.vendor)));
  }, [surveys]);

  // Enhanced similar specialties display with confidence indicators
  const SimilarSpecialtyItem: React.FC<{
    specialty: SimilarSpecialty;
    isSelected: boolean;
    onToggle: () => void;
  }> = ({ specialty, isSelected, onToggle }) => {
    return (
      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{specialty.specialty}</span>
            <span className={`px-2 py-1 text-xs rounded-full ${
              specialty.matchType === 'exact' ? 'bg-green-100 text-green-800' :
              specialty.matchType === 'synonym' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {specialty.matchType === 'exact' ? 'Exact Match' :
               specialty.matchType === 'synonym' ? 'Synonym Match' :
               'Similar Match'}
            </span>
            <span className="text-sm text-gray-500">from {specialty.vendor}</span>
          </div>
          
          {specialty.synonyms && specialty.synonyms.length > 0 && (
            <div className="mt-2 text-sm text-gray-500">
              Also known as: {specialty.synonyms.join(', ')}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {specialty.confidence < 1 && (
            <span className="text-sm text-gray-500">
              {Math.round(specialty.confidence * 100)}% Match
            </span>
          )}
          <button
            onClick={onToggle}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              isSelected
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
        </div>
      </div>
    );
  };

  // Enhanced filtering of similar specialties
  const filteredSimilarSpecialties = useMemo(() => {
    if (!selectedSpecialty) return [];
    
    console.log('Finding matches for:', selectedSpecialty.specialty);
    
    const allMatches: SimilarSpecialty[] = [];
    const processedSpecialties = new Set<string>();
    
    // First, get all possible synonyms for the selected specialty
    const selectedSynonyms = getSpecialtySynonyms(selectedSpecialty.specialty);
    console.log('Synonyms for selected specialty:', selectedSynonyms);

    // Look through all available specialties
    availableSpecialties.forEach(item => {
      // Skip if from same vendor or already processed
      if (formatVendorName(item.vendor) === formatVendorName(selectedSpecialty.vendor) ||
          processedSpecialties.has(item.specialty)) {
        return;
      }
      
      processedSpecialties.add(item.specialty);
      
      // Check for exact match or synonym match
      if (areSpecialtiesSynonyms(selectedSpecialty.specialty, item.specialty)) {
        allMatches.push({
          specialty: item.specialty,
          vendor: item.vendor,
          confidence: 0.95,
          matchType: 'synonym',
          synonyms: getSpecialtySynonyms(item.specialty)
        });
        return;
      }

      // If no synonym match, check string similarity
      const similarity = calculateStringSimilarity(
        normalizeSpecialtyName(selectedSpecialty.specialty),
        normalizeSpecialtyName(item.specialty)
      );

      if (similarity > 0.6) {
        allMatches.push({
          specialty: item.specialty,
          vendor: item.vendor,
          confidence: similarity,
          matchType: 'fuzzy',
          synonyms: getSpecialtySynonyms(item.specialty)
        });
      }
    });

    console.log('Found matches:', allMatches);

    // Filter by search term if provided
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().split(' ').filter(Boolean);
      return allMatches.filter(item => {
        const specialtyText = item.specialty.toLowerCase();
        const vendorText = formatVendorName(item.vendor).toLowerCase();
        const synonymText = item.synonyms?.join(' ').toLowerCase() || '';
        return searchTerms.every(term =>
          specialtyText.includes(term) || 
          vendorText.includes(term) || 
          synonymText.includes(term)
        );
      });
    }

    return allMatches.sort((a, b) => b.confidence - a.confidence);
  }, [selectedSpecialty, searchTerm, availableSpecialties]);

  // Enhanced filtering with vendor filter
  const filteredSpecialties = useMemo(() => {
    let specialties = viewMode === 'unmapped' ? unmappedSpecialties : mappedSpecialties;
    
    // Filter by vendors
    specialties = specialties.filter(item => 
      filters.selectedVendors.has(formatVendorName(item.vendor))
    );
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchTerms = filters.searchTerm.toLowerCase().split(' ').filter(Boolean);
      specialties = specialties.filter(item => {
        const specialtyText = item.specialty.toLowerCase();
        const vendorText = formatVendorName(item.vendor).toLowerCase();
        return searchTerms.every(term =>
          specialtyText.includes(term) || vendorText.includes(term)
        );
      });
    }
    
    return specialties;
  }, [viewMode, unmappedSpecialties, mappedSpecialties, filters]);

  // Handle selecting/deselecting a match
  const handleMatchToggle = useCallback((targetSpecialty: string) => {
    setSelectedMatches(prev => {
      const updated = new Set(prev);
      if (updated.has(targetSpecialty)) {
        updated.delete(targetSpecialty);
      } else {
        updated.add(targetSpecialty);
      }
      return updated;
    });
  }, []);

  // Handle completing the mapping with all selected matches
  const handleCompleteMappings = useCallback(() => {
    if (!selectedSpecialty) return;
    
    const mappedSpecialties = Array.from(selectedMatches);
    if (mappedSpecialties.length > 0) {
      setMappings(prev => {
        const existing = prev[selectedSpecialty.specialty] || [];
        const updated = Array.from(new Set([...existing, ...mappedSpecialties]));
        return { ...prev, [selectedSpecialty.specialty]: updated };
      });
      onMappingChange(selectedSpecialty.specialty, mappedSpecialties);
      setSelectedMatches(new Set());
      setSelectedSpecialty(null);
      setSearchTerm('');
    }
  }, [selectedSpecialty, selectedMatches, onMappingChange]);

  // Clear selections when changing specialty
  useEffect(() => {
    setSelectedMatches(new Set());
  }, [selectedSpecialty]);

  // Add these new functions near the other handler functions
  const handleClearMapping = useCallback((specialty: string) => {
    setMappings(prev => {
      const updated = { ...prev };
      delete updated[specialty];
      return updated;
    });
    onMappingChange(specialty, []);
  }, [onMappingChange]);

  const handleClearAllMappings = useCallback(() => {
    setMappings({});
    // Notify parent component that all mappings are cleared
    Object.keys(mappings).forEach(specialty => {
      onMappingChange(specialty, []);
    });
  }, [mappings, onMappingChange]);

  // Toggle vendor filter
  const toggleVendorFilter = (vendor: string) => {
    setFilters(prev => {
      const newVendors = new Set(prev.selectedVendors);
      if (newVendors.has(vendor)) {
        newVendors.delete(vendor);
      } else {
        newVendors.add(vendor);
      }
      return { ...prev, selectedVendors: newVendors };
    });
  };

  // Add this function before the return statement
  const autoArrangeSpecialties = () => {
    // Get all unmapped specialties
    const unmappedList = unmappedSpecialties;
    
    // Process each unmapped specialty
    unmappedList.forEach(source => {
      // Skip if already mapped
      if (Object.keys(mappings).includes(source.specialty)) return;

      // Find potential matches from other vendors
      const potentialMatches = allSpecialties
        .filter(target => 
          // Only look at specialties from other vendors
          target.vendor !== source.vendor &&
          // Not already mapped
          !Object.values(mappings).flat().includes(target.specialty)
        )
        .map(target => ({
          specialty: target.specialty,
          vendor: target.vendor,
          confidence: calculateStringSimilarity(source.specialty, target.specialty)
        }))
        .filter(match => match.confidence > 0.8) // Only consider high confidence matches
        .sort((a, b) => b.confidence - a.confidence);

      // If we found good matches, create the mapping
      if (potentialMatches.length > 0) {
        const matchedSpecialties = potentialMatches.map(m => m.specialty);
        onMappingChange(source.specialty, matchedSpecialties);
        
        // Update local mappings state
        setMappings(prev => ({
          ...prev,
          [source.specialty]: matchedSpecialties
        }));
      }
    });

    toast.success('Auto-arrangement complete!');
  };

  // Update progress calculation to be more accurate
  const calculateProgress = () => {
    const uniqueSpecialties = new Set(allSpecialties.map(s => s.specialty));
    const totalSpecialties = uniqueSpecialties.size;
    const mappedCount = Object.keys(mappings).length;
    const resolvedCount = Array.from(resolvedSpecialties).filter(
      specialty => !Object.keys(mappings).includes(specialty)
    ).length;
    
    return totalSpecialties > 0 ? Math.round(((mappedCount + resolvedCount) / totalSpecialties) * 100) : 0;
  };

  // Update handler for resolving specialties
  const handleResolveSpecialty = useCallback((specialty: string, notes?: string) => {
    setResolvedSpecialties(prev => {
      const updated = new Set(prev);
      updated.add(specialty);
      return updated;
    });
    // Notify parent component that this specialty has been resolved
    onMappingChange(specialty, [], notes, true);
  }, [onMappingChange]);

  // Add this function to get source information for a specialty
  const getSpecialtySourceInfo = useCallback((specialty: string): SpecialtySourceInfo => {
    const sources = new Map<string, number>();
    
    surveys.forEach(survey => {
      const count = survey.data.filter(item => 
        item.specialty.trim().toLowerCase() === specialty.toLowerCase()
      ).length;
      
      if (count > 0) {
        sources.set(formatVendorName(survey.vendor), count);
      }
    });
    
    return {
      specialty,
      sources: Array.from(sources.entries()).map(([vendor, count]) => ({ vendor, count })),
      totalSources: sources.size
    };
  }, [surveys]);

  // Similar specialties section with resolve option
  const renderSimilarSpecialties = () => {
    const hasMatches = filteredSimilarSpecialties.length > 0;
    const selectedSynonyms = selectedSpecialty ? getSpecialtySynonyms(selectedSpecialty.specialty) : [];
    
    return (
      <div className="space-y-4">
        {/* Show known variations section */}
        {selectedSpecialty && selectedSynonyms.length > 1 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Known Variations</h4>
            <div className="flex flex-wrap gap-2">
              {selectedSynonyms.map(synonym => (
                <span key={synonym} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {synonym}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Show matches if any */}
        {hasMatches ? (
          <div className="space-y-3">
            {filteredSimilarSpecialties.map((item) => (
              <SimilarSpecialtyItem
                key={`${item.specialty}-${item.vendor}`}
                specialty={item}
                isSelected={selectedMatches.has(item.specialty)}
                onToggle={() => handleMatchToggle(item.specialty)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">No matching specialties found</h3>
            <p className="text-sm text-gray-500 mb-6">
              This specialty doesn't have any matches in other surveys. You can mark it as resolved if it's unique.
            </p>
            <div className="space-y-4">
              <textarea
                placeholder="Add notes about why this specialty is unique or doesn't need mapping..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={3}
                value={selectedSpecialty?.notes || ''}
                onChange={(e) => {
                  if (selectedSpecialty) {
                    setSelectedSpecialty({
                      ...selectedSpecialty,
                      notes: e.target.value
                    });
                  }
                }}
              />
              <button
                onClick={() => {
                  if (selectedSpecialty) {
                    handleResolveSpecialty(selectedSpecialty.specialty, selectedSpecialty.notes);
                    setSelectedSpecialty(null);
                  }
                }}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <CheckIcon className="w-4 h-4 mr-2" />
                Mark as Resolved
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Update the specialty item rendering
  const renderSpecialtyItem = (item: UnmappedSpecialty | MappedSpecialty) => {
    const sourceInfo = getSpecialtySourceInfo(item.specialty);
    const isSingleSource = sourceInfo.totalSources === 1;
    
    return (
      <div
        key={`${item.specialty}-${item.vendor}`}
        onClick={() => !('resolved' in item) && setSelectedSpecialty(item)}
        className={`p-4 rounded-lg border transition-all duration-200 ${
          selectedSpecialty?.specialty === item.specialty
            ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        } ${!('resolved' in item) ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{item.specialty}</span>
              <span className="text-sm text-gray-500">
                {isSingleSource ? 'Single Source' : `${sourceInfo.totalSources} Sources`}
              </span>
            </div>
            <div className="flex items-center mt-2 gap-2">
              {sourceInfo.sources.map((source) => (
                <span
                  key={source.vendor}
                  className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    source.vendor === 'MGMA' ? 'bg-purple-50 text-purple-700' :
                    source.vendor === 'GALLAGHER' ? 'bg-green-50 text-green-700' :
                    'bg-blue-50 text-blue-700'
                  }`}
                >
                  {source.vendor}
                </span>
              ))}
            </div>
          </div>
          
          {isSingleSource && !('resolved' in item) && (
            <div className="group relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleResolveSpecialty(item.specialty, 'Single source specialty - no mapping needed');
                }}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                <CheckIcon className="h-3 w-3 mr-1.5" />
                Accept Single Source
              </button>
              <div className="absolute bottom-full mb-2 right-0 w-48 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded-lg p-2 text-center">
                  Mark this specialty as complete since it only appears in one survey
                </div>
              </div>
            </div>
          )}

          {('resolved' in item && item.resolved) && (
            <span className="inline-flex items-center text-sm text-green-600">
              <CheckIcon className="h-4 w-4 mr-1" />
              Accepted
            </span>
          )}
        </div>
      </div>
    );
  };

  // Update the findSimilarSpecialties function
  const findSimilarSpecialties = useCallback((specialty: string): SimilarSpecialty[] => {
    const results: SimilarSpecialty[] = [];
    const processedSpecialties = new Set<string>();
    
    availableSpecialties.forEach(item => {
      if (processedSpecialties.has(item.specialty)) return;
      processedSpecialties.add(item.specialty);

      // Check for exact match
      if (item.specialty.toLowerCase() === specialty.toLowerCase()) {
        results.push({
          specialty: item.specialty,
          vendor: item.vendor,
          confidence: 1,
          matchType: 'exact'
        });
        return;
      }

      // Check for synonyms
      if (areSpecialtiesSynonyms(specialty, item.specialty)) {
        results.push({
          specialty: item.specialty,
          vendor: item.vendor,
          confidence: 0.95,
          matchType: 'synonym',
          synonyms: getSpecialtySynonyms(item.specialty)
        });
        return;
      }

      // Fuzzy matching for remaining cases
      const similarity = calculateStringSimilarity(specialty.toLowerCase(), item.specialty.toLowerCase());
      if (similarity > 0.6) {
        results.push({
          specialty: item.specialty,
          vendor: item.vendor,
          confidence: similarity,
          matchType: 'fuzzy'
        });
      }
    });

    return results.sort((a, b) => b.confidence - a.confidence);
  }, [availableSpecialties]);

  return (
    <div className="bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Progress Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Specialty Mapping Progress</h2>
              <p className="mt-1 text-sm text-gray-500">
                {Object.keys(mappings).length + Array.from(resolvedSpecialties).filter(
                  specialty => !Object.keys(mappings).includes(specialty)
                ).length} / {allSpecialties.length} specialties mapped or resolved
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={autoArrangeSpecialties}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Auto-arrange Specialties
              </button>
              {Object.keys(mappings).length > 0 && (
                <button
                  onClick={handleClearAllMappings}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Clear All Mappings
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${calculateProgress()}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              {calculateProgress()}% complete
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side: Unmapped specialties */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-120px)] overflow-auto">
            {/* Header section */}
            <div className="sticky top-0 border-b border-gray-200 bg-gray-50 p-4 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {viewMode === 'unmapped' ? `Unmapped Specialties (${unmappedSpecialties.length})` : 'Mapped Specialties'}
                </h3>
                <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                  <button
                    onClick={() => setViewMode('unmapped')}
                    className={`inline-flex items-center px-4 py-1.5 text-sm font-medium transition-colors ${
                      viewMode === 'unmapped' 
                        ? 'bg-blue-600 text-white rounded-md' 
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    Unmapped
                  </button>
                  <button
                    onClick={() => setViewMode('mapped')}
                    className={`inline-flex items-center px-4 py-1.5 text-sm font-medium transition-colors ${
                      viewMode === 'mapped'
                        ? 'bg-blue-600 text-white rounded-md'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    Mapped
                  </button>
                </div>
              </div>

              {/* Search and filter section */}
              <div className="space-y-3">
                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search specialties..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  {filters.searchTerm && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                      className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>

                {/* Survey vendor filters */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>Filter by survey vendor:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {uniqueVendors.map(vendor => (
                      <button
                        key={vendor}
                        onClick={() => toggleVendorFilter(formatVendorName(vendor))}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                          filters.selectedVendors.has(formatVendorName(vendor))
                            ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        <span className="relative flex items-center gap-1">
                          {formatVendorName(vendor)}
                          {filters.selectedVendors.has(formatVendorName(vendor)) ? (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                  {filters.selectedVendors.size === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Select at least one vendor to view specialties
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Specialty list */}
            <div className="p-6">
              <div className="space-y-2">
                {filteredSpecialties.length > 0 ? (
                  filteredSpecialties.map(item => renderSpecialtyItem(item))
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                      <MagnifyingGlassIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No specialties found</h3>
                    <p className="text-sm text-gray-500">
                      Try adjusting your filters or search terms
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side: Mapping interface */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[calc(100vh-120px)] overflow-auto">
            {selectedSpecialty ? (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Map "{selectedSpecialty.specialty}"
                  </h3>
                  <div className="text-sm text-gray-500">
                    from {formatVendorName(selectedSpecialty.vendor)}
                  </div>
                </div>

                {/* Search similar specialties */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for similar specialties..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>

                {/* Similar specialties list */}
                <div className="space-y-3 mt-4">
                  {renderSimilarSpecialties()}
                </div>

                {/* Action buttons - only show if there are matches */}
                {filteredSimilarSpecialties.length > 0 && (
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setSelectedSpecialty(null);
                        setSelectedMatches(new Set());
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCompleteMappings}
                      disabled={selectedMatches.size === 0}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        selectedMatches.size > 0
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Confirm Mapping
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center py-12 text-gray-500">
                Select a specialty to start mapping
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpecialtyMappingStudio; 
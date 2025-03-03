"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon, CheckCircleIcon, ArrowPathIcon, PlusIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ComputerDesktopIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { calculateStringSimilarity } from '@/utils/string';
import { findMatchingSpecialties } from '@/utils/surveySpecialtyMapping';
import type { SurveyVendor, SpecialtyMapping } from '@/utils/surveySpecialtyMapping';
import { toast } from 'react-hot-toast';
import { 
  areSpecialtiesSynonyms, 
  getSpecialtySynonyms,
  normalizeSpecialtyName,
  areSpecialtyVariations,
  findStandardSpecialty,
  specialtyDefinitions,
  calculateSpecialtySimilarity
} from '@/utils/specialtyMapping';
import {
  getAllSynonyms,
  updateSpecialtySynonyms,
  getAllSpecialtiesWithSynonyms,
  hasCustomSynonyms,
  getCustomSynonyms,
  getPredefinedSynonyms
} from '@/utils/specialtySynonyms';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import { Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { specialtyManager } from "@/utils/specialtyManager";
import { Specialty, SpecialtyMetadata } from "@/types/specialty";
import { cn } from "@/lib/utils";

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
  onSave?: (mappings: Record<string, string[]>) => void;
  initialMappings?: Record<string, string[]>;
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

// Add interface for specialty stats
interface SpecialtyStats {
  [key: string]: {
    synonymCount: number;
    predefinedCount: number;
    customCount: number;
  };
}

interface SpecialtyWithStats extends Specialty {
  stats: {
    synonymCount: number;
    predefinedCount: number;
    customCount: number;
  };
}

interface CurrentSynonyms {
  predefined: string[];
  custom: string[];
}

interface AvailableSpecialty extends SpecialtyData {
  vendor: string;
}

// Update the storage key to be more specific
const STORAGE_KEY = 'specialty-mappings-v1';

const SpecialtyMappingStudio: React.FC<SpecialtyMappingStudioProps> = ({
  surveys,
  onMappingChange,
  onSave,
  initialMappings,
}) => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState<Set<string>>(new Set());
  const [mappedGroups, setMappedGroups] = useState<MappedGroup[]>(() => {
    try {
      const savedMappings = localStorage.getItem(STORAGE_KEY);
      if (savedMappings) {
        const parsed = JSON.parse(savedMappings);
        return parsed.map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt)
        }));
      }
    } catch (error) {
      console.error('Error loading saved mappings:', error);
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
  const [openSearchDropdowns, setOpenSearchDropdowns] = useState<Set<string>>(new Set());
  const [localSearchQueries, setLocalSearchQueries] = useState<Map<string, string>>(new Map());
  const [showSynonymModal, setShowSynonymModal] = useState(false);
  const [selectedSpecialtyForSynonyms, setSelectedSpecialtyForSynonyms] = useState<string>("");
  const [editingSynonyms, setEditingSynonyms] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [allSpecialties, setAllSpecialties] = useState<Specialty[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [specialtyStats, setSpecialtyStats] = useState<SpecialtyStats>({});
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [searchResults, setSearchResults] = useState<Specialty[]>([]);
  const [currentSynonyms, setCurrentSynonyms] = useState<CurrentSynonyms>({
    predefined: [],
    custom: []
  });
  const [showUnmapped, setShowUnmapped] = useState(false);

  // Load all specialties and their synonyms on mount
  useEffect(() => {
    const loadedSpecialties = specialtyManager.getAllSpecialties();
    setAllSpecialties(loadedSpecialties);
    setSearchResults(loadedSpecialties);

    // Import initial mappings if provided
    if (initialMappings) {
      Object.entries(initialMappings).forEach(([specialty, synonyms]) => {
        const existingSpecialty = loadedSpecialties.find(s => s.name === specialty);
        if (!existingSpecialty) {
          const newSpecialty = specialtyManager.addSpecialty(specialty);
          if (newSpecialty) {
            synonyms.forEach((synonym: string) => {
              specialtyManager.addSynonym(newSpecialty.id, synonym);
            });
          }
        }
      });
      // Refresh specialties after import
      setAllSpecialties(specialtyManager.getAllSpecialties());
    }
  }, [initialMappings]);

  // Organize specialties by vendor
  const specialtiesByVendor = useMemo(() => {
    const result: Record<string, SpecialtyData[]> = {};
    
    surveys.forEach(survey => {
      const vendorName = survey.vendor.toUpperCase();
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
          let reason = '';
          let confidence = 0;

          // First check for exact matches and variations
          if (normalizeSpecialtyName(specialty.specialty) === normalizeSpecialtyName(targetSpecialty.specialty)) {
            reason = 'Exact match';
            confidence = 1;
          } else if (areSpecialtyVariations(specialty.specialty, targetSpecialty.specialty)) {
            reason = 'Specialty variation';
            confidence = 0.95;
          } else if (areSpecialtiesSynonyms(specialty.specialty, targetSpecialty.specialty)) {
            reason = 'Known synonym';
            confidence = 0.95;
          } else {
            // Fall back to string similarity only if no specialty-based match
            const similarity = calculateStringSimilarity(
              normalizeSpecialtyName(specialty.specialty),
              normalizeSpecialtyName(targetSpecialty.specialty)
            );
            confidence = similarity;
            if (similarity >= 0.8) {
              reason = 'Very similar name';
            } else if (similarity >= 0.6) {
              reason = 'Similar name';
            }
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
      } else {
        updated.add(key);
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
        onClick={() => toggleSpecialtySelection({
          specialty: specialty.specialty,
          vendor: specialty.vendor,
          metrics: specialty.metrics
        })}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className={`font-medium truncate ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
              {specialty.specialty}
            </div>
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
    // First, collect all mapped specialties from current state
    const currentMappedGroups = mappedGroups;
    const currentSpecialtiesByVendor = specialtiesByVendor;
    
    // Create a set of all specialties that are already mapped or have approved matches
    const mappedSpecialtySet = new Set(
      currentMappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}:${s.vendor}`)
      )
    );

    // Also add specialties that have approved matches in allAutoMappings
    allAutoMappings.forEach(mapping => {
      if (mapping.matches.some(m => m.status === 'approved')) {
        mappedSpecialtySet.add(`${mapping.sourceSpecialty.specialty}:${mapping.sourceSpecialty.vendor}`);
      }
    });

    // Keep track of specialties that are included in matches
    const includedInMatches = new Set<string>();

    // Group specialties by normalized name and synonyms
    const specialtiesByNormalizedName = new Map<string, SpecialtyData[]>();
    
    // First pass: collect all specialties into groups
    Object.entries(currentSpecialtiesByVendor).forEach(([vendor, specialties]) => {
      specialties.forEach(specialty => {
        const key = `${specialty.specialty}:${specialty.vendor}`;
        // Skip if already mapped
        if (!mappedSpecialtySet.has(key)) {
          // Find if this specialty matches any existing group
          let foundGroup = false;
          for (const [groupKey, existingSpecialties] of specialtiesByNormalizedName.entries()) {
            // Check if this specialty is a variation of any specialty in the group
            if (existingSpecialties.some(existing => 
              areSpecialtiesSynonyms(existing.specialty, specialty.specialty)
            )) {
              specialtiesByNormalizedName.set(groupKey, [...existingSpecialties, specialty]);
              foundGroup = true;
              break;
            }
          }
          
          // If no matching group found, create a new one
          if (!foundGroup) {
            specialtiesByNormalizedName.set(key, [specialty]);
          }
        }
      });
    });

    // Create mappings for each unique specialty group
    const allMappings = Array.from(specialtiesByNormalizedName.values())
      .map(instances => {
        // Take the first instance as source
        const sourceSpecialty = instances[0];
        const sourceKey = `${sourceSpecialty.specialty}:${sourceSpecialty.vendor}`;
        
        // Skip if this specialty is already included in matches
        if (includedInMatches.has(sourceKey)) {
          return null;
        }

        // Find matches from other vendors in the same group
        const matches = instances.slice(1).map(match => {
          const matchKey = `${match.specialty}:${match.vendor}`;
          includedInMatches.add(matchKey);
          return {
            specialty: match,
            confidence: 0.95, // High confidence since they're in the same group
            reason: 'Known synonym',
            status: undefined as 'approved' | 'rejected' | undefined
          };
        });

        // Also look for potential matches in other specialties
        Object.entries(currentSpecialtiesByVendor).forEach(([vendor, vendorSpecialties]) => {
          if (vendor !== sourceSpecialty.vendor) {
            vendorSpecialties
              .filter(s => {
                const targetKey = `${s.specialty}:${s.vendor}`;
                return !instances.some(grouped => grouped.specialty === s.specialty) && 
                       !mappedSpecialtySet.has(targetKey) &&
                       !includedInMatches.has(targetKey);
              })
              .forEach(targetSpecialty => {
                let reason = '';
                let confidence = 0;

                // First check for exact matches and variations
                if (normalizeSpecialtyName(sourceSpecialty.specialty) === normalizeSpecialtyName(targetSpecialty.specialty)) {
                  reason = 'Exact match';
                  confidence = 1;
                } else if (areSpecialtyVariations(sourceSpecialty.specialty, targetSpecialty.specialty)) {
                  reason = 'Specialty variation';
                  confidence = 0.95;
                } else if (areSpecialtiesSynonyms(sourceSpecialty.specialty, targetSpecialty.specialty)) {
                  reason = 'Known synonym';
                  confidence = 0.95;
                } else {
                  // Fall back to string similarity
                  const similarity = calculateStringSimilarity(
                    normalizeSpecialtyName(sourceSpecialty.specialty),
                    normalizeSpecialtyName(targetSpecialty.specialty)
                  );
                  confidence = similarity;
                  if (similarity >= 0.8) {
                    reason = 'Very similar name';
                  } else if (similarity >= 0.6) {
                    reason = 'Similar name';
                  }
                }

                if (confidence >= 0.6) {
                  const matchKey = `${targetSpecialty.specialty}:${targetSpecialty.vendor}`;
                  includedInMatches.add(matchKey);
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

        return matches.length > 0 ? {
          sourceSpecialty,
          matches: matches.sort((a, b) => b.confidence - a.confidence)
        } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    // Sort by source specialty name
    allMappings.sort((a, b) => 
      a.sourceSpecialty.specialty.localeCompare(b.sourceSpecialty.specialty)
    );

    setAllAutoMappings(allMappings);
  }, [mappedGroups, specialtiesByVendor, allAutoMappings]); // Include allAutoMappings in dependencies

  // Initialize auto mappings on mount
  useEffect(() => {
    generateAllMappings();
  }, []); // Only run on mount

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
        
        // Update mappedGroups (this will trigger the save effect)
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

  // Update handleSpecialtySelect to properly load synonyms
  const handleSpecialtySelect = (specialty: string): void => {
    setSelectedSpecialtyForSynonyms(specialty);
    
    // Get the specialty object by name
    const specialtyObj = allSpecialties.find(s => s.name === specialty);
    
    console.log('Selected specialty:', specialty);
    console.log('Found specialty object:', specialtyObj);
    
    if (specialtyObj) {
      console.log('Setting synonyms:', {
        predefined: specialtyObj.synonyms.predefined,
        custom: specialtyObj.synonyms.custom
      });
      
      setCurrentSynonyms({
        predefined: specialtyObj.synonyms.predefined,
        custom: specialtyObj.synonyms.custom
      });
      } else {
      console.log('No specialty object found, clearing synonyms');
      setCurrentSynonyms({
        predefined: [],
        custom: []
      });
    }
  };

  // Update handleAddSynonym with better validation and error handling
  const handleAddSynonym = (): void => {
    if (!selectedSpecialtyForSynonyms) {
      toast.error("Please select a specialty first");
      return;
    }

    const synonym = newSynonym.trim();
    if (!synonym) {
      toast.error("Please enter a synonym");
      return;
    }

    // Check for duplicate synonyms
    if (currentSynonyms.predefined.includes(synonym) || currentSynonyms.custom.includes(synonym)) {
      toast.error("This synonym already exists for this specialty");
      return;
    }

    // Find the specialty object
    const specialtyObj = allSpecialties.find(s => s.name === selectedSpecialtyForSynonyms);
    if (!specialtyObj) {
      toast.error("Selected specialty not found");
      return;
    }

    // Add to specialty manager first
    const success = specialtyManager.addSynonym(specialtyObj.id, synonym);
    if (success) {
      // Update local state
      setCurrentSynonyms(prev => ({
        ...prev,
        custom: [...prev.custom, synonym]
      }));
      setNewSynonym('');
      toast.success(`Added synonym: ${synonym}`);
      
      // Refresh stats
      getSpecialtyStats();
    } else {
      toast.error("Failed to add synonym. Please try again.");
    }
  };

  // Update handleRemoveSynonym with better confirmation and error handling
  const handleRemoveSynonym = (synonym: string): void => {
    if (!selectedSpecialtyForSynonyms) {
      toast.error("No specialty selected");
      return;
    }

    const specialtyObj = allSpecialties.find(s => s.name === selectedSpecialtyForSynonyms);
    if (!specialtyObj) {
      toast.error("Selected specialty not found");
      return;
    }

    const isPredefined = currentSynonyms.predefined.includes(synonym);
    if (isPredefined) {
      if (!window.confirm(
        `Warning: "${synonym}" is a predefined synonym.\n\n` +
        `Removing it may affect system functionality.\n` +
        `Are you sure you want to remove it?`
      )) {
        return;
      }
    }

    // Remove from specialty manager first
    const success = specialtyManager.removeSynonym(specialtyObj.id, synonym);
    if (success) {
      // Update local state
      setCurrentSynonyms(prev => ({
        predefined: prev.predefined.filter(s => s !== synonym),
        custom: prev.custom.filter(s => s !== synonym)
      }));
      
      toast.success(`Removed synonym: ${synonym}`);
      
      // Refresh stats
      getSpecialtyStats();
    } else {
      toast.error("Failed to remove synonym. Please try again.");
    }
  };

  // Update handleSaveSynonyms
  const handleSaveSynonyms = (): void => {
    if (selectedSpecialtyForSynonyms) {
      updateSpecialtySynonyms(
        selectedSpecialtyForSynonyms, 
        [...currentSynonyms.predefined, ...currentSynonyms.custom]
      );
      getSpecialtyStats();
      setShowSynonymModal(false);
      toast.success('Synonyms updated successfully');
    }
  };

  // Add this new function to get specialty stats
  const getSpecialtyStats = () => {
    const stats = allSpecialties.reduce<SpecialtyStats>((acc, specialty) => {
      acc[specialty.id] = {
        synonymCount: specialty.synonyms.predefined.length + specialty.synonyms.custom.length,
        predefinedCount: specialty.synonyms.predefined.length,
        customCount: specialty.synonyms.custom.length
      };
      return acc;
    }, {} as SpecialtyStats);
    
    setSpecialtyStats(stats);
  };

  // Update useEffect to load specialties
  useEffect(() => {
    // Initialize specialties on mount
    getSpecialtyStats();
  }, []);

  // Update the search function to properly filter specialties
  const getFilteredSpecialties = (): SpecialtyWithStats[] => {
    if (!specialtySearch) {
      return allSpecialties.map(specialty => ({
        ...specialty,
        stats: {
          predefinedCount: specialty.synonyms.predefined.length,
          customCount: specialty.synonyms.custom.length,
          synonymCount: specialty.synonyms.predefined.length + specialty.synonyms.custom.length
        }
      }));
    }

    const searchTerm = specialtySearch.toLowerCase();
    return allSpecialties
      .filter(specialty => {
        const nameMatch = specialty.name.toLowerCase().includes(searchTerm);
        const predefinedMatch = specialty.synonyms.predefined.some(syn => 
          syn.toLowerCase().includes(searchTerm)
        );
        const customMatch = specialty.synonyms.custom.some(syn => 
          syn.toLowerCase().includes(searchTerm)
        );
        return nameMatch || predefinedMatch || customMatch;
      })
      .map(specialty => ({
        ...specialty,
        stats: {
          predefinedCount: specialty.synonyms.predefined.length,
          customCount: specialty.synonyms.custom.length,
          synonymCount: specialty.synonyms.predefined.length + specialty.synonyms.custom.length
        }
      }));
  };

  // Handle adding new specialty
  const handleAddSpecialty = () => {
    if (!newSpecialtyName.trim()) return;
    
    // Add the specialty to the specialty manager first
    const addedSpecialty = specialtyManager.addSpecialty(newSpecialtyName.trim());
    
    if (addedSpecialty) {
      // Update the local state
      setAllSpecialties(prev => [...prev, addedSpecialty]);
      setSelectedSpecialty(addedSpecialty);
      setNewSpecialtyName("");
      
      // Show success message
      toast.success(`Added new specialty: ${addedSpecialty.name}`);
      
      // Refresh stats
      getSpecialtyStats();
    } else {
      toast.error("Failed to add specialty. It may already exist.");
    }
  };

  // Handle saving mappings
  const handleSave = () => {
    if (onSave) {
      const mappings: Record<string, string[]> = {};
      specialties.forEach(specialty => {
        mappings[specialty.name] = [
          ...specialty.synonyms.predefined,
          ...specialty.synonyms.custom,
        ];
      });
      onSave(mappings);
    }
  };

  // Update the loadSpecialties function
  const loadSpecialties = useCallback(() => {
    const loadedSpecialties = specialtyManager.getAllSpecialties();
    setAllSpecialties(loadedSpecialties);
    
    // Calculate stats separately
    type SpecialtyStats = {
      [key: string]: {
        synonymCount: number;
        predefinedCount: number;
        customCount: number;
      };
    };

    const stats = loadedSpecialties.reduce<SpecialtyStats>((acc, specialty) => {
      acc[specialty.id] = {
        synonymCount: specialty.synonyms.predefined.length + specialty.synonyms.custom.length,
        predefinedCount: specialty.synonyms.predefined.length,
        customCount: specialty.synonyms.custom.length
      };
      return acc;
    }, {} as SpecialtyStats);
    
    setSpecialtyStats(stats);
  }, []);

  // Update useEffect to call loadSpecialties
  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  const handleSearch = (value: string) => {
    setSpecialtySearch(value);
    // Reset selected specialty when search changes
    setSelectedSpecialty(null);
    setCurrentSynonyms({ predefined: [], custom: [] });
  };

  // Update search results when modal opens
  useEffect(() => {
    if (showSynonymModal) {
      setSearchResults(allSpecialties);
    }
  }, [showSynonymModal, allSpecialties]);

  // Restore createManualMapping function
  const createManualMapping = (): void => {
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
      isSingleSource: selectedItems.length === 1
    };

    setMappedGroups(prev => [...prev, newGroup]);
    setSelectedSpecialties(new Set());
    
    // Only notify of mapping change when creating a new mapping
    const sourceSpecialty = selectedItems[0].specialty;
    const mappedSpecialties = selectedItems.slice(1).map(item => item.specialty);
    onMappingChange(sourceSpecialty, mappedSpecialties);
    
    toast.success(selectedItems.length === 1 
      ? 'Created single source specialty mapping'
      : 'Created new mapping group');
  };

  // Function to get available specialties for mapping
  const getAvailableSpecialties = (
    mapping: MappingTableRow,
    localSearchQuery: string
  ): AvailableSpecialty[] => {
    return Object.entries(specialtiesByVendor)
      .filter(([vendor]) => vendor !== mapping.sourceSpecialty.vendor)
      .flatMap(([vendor, specialties]) => 
        specialties
          .filter(specialty => 
            // Filter out already mapped and matched specialties
            !mappedGroups.some(group => 
              group.specialties.some(gs => 
                gs.specialty === specialty.specialty && gs.vendor === specialty.vendor
              )
            ) &&
            !mapping.matches.some(m => 
              m.specialty.specialty === specialty.specialty && m.specialty.vendor === specialty.vendor
            ) &&
            specialty.specialty.toLowerCase().includes(localSearchQuery.toLowerCase())
          )
          .map(specialty => ({ ...specialty, vendor }))
      )
      .sort((a, b) => a.specialty.localeCompare(b.specialty));
  };

  // Update the specialty search handling
  useEffect(() => {
    if (specialtySearch) {
      const filtered = allSpecialties.filter(specialty =>
        specialty.name.toLowerCase().includes(specialtySearch.toLowerCase())
      );
      setSpecialties(filtered);
    } else {
      setSpecialties(allSpecialties);
    }
  }, [specialtySearch, allSpecialties]);

  // Add new function to handle specialty deletion
  const handleDeleteSpecialty = (specialty: Specialty) => {
    if (window.confirm(`Are you sure you want to delete "${specialty.name}" and all its synonyms?`)) {
      // Delete from specialty manager
      specialtyManager.deleteSpecialty(specialty.id);
      
      // Update local state
      setAllSpecialties(prev => prev.filter(s => s.id !== specialty.id));
      if (selectedSpecialty?.id === specialty.id) {
        setSelectedSpecialty(null);
        setCurrentSynonyms({ predefined: [], custom: [] });
      }
      
      // Show success message
      toast.success(`Deleted specialty: ${specialty.name}`);
    }
  };

  // Add a new effect to save mappings whenever they change
  useEffect(() => {
    try {
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedGroups));
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  }, [mappedGroups]);

  // Separate effect for onSave callback
  useEffect(() => {
    if (onSave) {
      const simpleMappings: Record<string, string[]> = {};
      mappedGroups.forEach(group => {
        const sourceSpecialty = group.specialties[0];
        if (sourceSpecialty) {
          simpleMappings[sourceSpecialty.specialty] = group.specialties
            .slice(1)
            .map(s => s.specialty);
        }
      });
      onSave(simpleMappings);
    }
  }, [mappedGroups, onSave]);

  // Add new function to create individual single mappings
  const createIndividualSingleMappings = (): void => {
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

    // Create individual single mappings for each specialty
    selectedItems.forEach(item => {
      const newGroup: MappedGroup = {
        id: Math.random().toString(36).substr(2, 9),
        specialties: [item],
        createdAt: new Date(),
        isSingleSource: true
      };
      
      setMappedGroups(prev => [...prev, newGroup]);
      // Notify of mapping change for each individual mapping
      onMappingChange(item.specialty, []);
    });

    setSelectedSpecialties(new Set());
    toast.success(`Created ${selectedItems.length} single source mappings`);
  };

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
              {/* Primary Actions Group */}
              <div className="flex rounded-lg shadow-sm">
                <button
                  onClick={() => setShowSynonymModal(true)}
                  className={`px-4 py-2 text-sm font-medium rounded-l-lg border
                    bg-white text-gray-700 hover:bg-gray-50 border-gray-300`}
                >
                  Manage Synonyms
                </button>
                <button
                  onClick={() => setViewMode('auto')}
                  className={`px-4 py-2 text-sm font-medium border-y inline-flex items-center gap-1.5
                    ${viewMode === 'auto'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                  >
                    <ComputerDesktopIcon className="h-4 w-4" />
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

              {/* Status and Actions Group */}
              <div className="ml-4 flex items-center gap-2">
              <span className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium border shadow-sm
                  ${Object.values(specialtiesByVendor).every(specialties => specialties.length === 0) 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                transition-colors duration-150 ease-in-out`}
              >
                  {Object.values(specialtiesByVendor).every(specialties => specialties.length === 0) ? (
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
                  className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
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
      </div>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
        <DialogContent className="sm:max-w-[425px] bg-white border border-gray-200">
          <DialogHeader>
            <DialogTitle>Clear All Mappings?</DialogTitle>
            <DialogDescription>
              This will remove all specialty mappings. This action cannot be undone.
              Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setMappedGroups([]);
                localStorage.removeItem(STORAGE_KEY);
                generateAllMappings();
                setShowClearConfirmation(false);
                toast.success('All mappings cleared');
              }}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Synonym Management Modal */}
      <Dialog open={showSynonymModal} onOpenChange={setShowSynonymModal}>
        <DialogContent className="sm:max-w-[900px] p-0 gap-0 overflow-hidden">
          {/* Enhanced Header */}
          <div className="px-6 py-4 bg-white border-b border-gray-200">
            <DialogTitle className="text-xl font-semibold text-gray-900">Manage Specialty Synonyms</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-gray-600">
              Add, edit, or remove synonyms for specialties. Synonyms help improve matching accuracy.
            </DialogDescription>
                  </div>

          <div className="grid grid-cols-2 divide-x divide-gray-200 bg-white">
            {/* Left Column - Specialty List */}
            <div className="p-6 bg-gray-50">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Search Specialties</Label>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search specialties..."
                      value={specialtySearch}
                      onChange={(e) => setSpecialtySearch(e.target.value)}
                      className="pl-9 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto max-h-[460px] -mx-2 px-2">
                  <div className="space-y-2">
                    {getFilteredSpecialties().map((specialty) => (
                      <button
                        key={specialty.id}
                        onClick={() => handleSpecialtySelect(specialty.name)}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-lg transition-all",
                          selectedSpecialtyForSynonyms === specialty.name
                            ? "bg-blue-50 border-2 border-blue-500 shadow-sm ring-2 ring-blue-200"
                            : "bg-white border border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "font-medium",
                            selectedSpecialtyForSynonyms === specialty.name
                              ? "text-blue-700"
                              : "text-gray-900"
                          )}>{specialty.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {specialty.stats.predefinedCount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                  {specialty.stats.predefinedCount} predefined
                                </span>
                              )}
                              {specialty.stats.customCount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                  {specialty.stats.customCount} custom
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Synonym Management */}
            <div className="p-6 bg-white">
              <div className="space-y-6">
                {/* Add New Synonym */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">Add New Synonym</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      placeholder="Enter new synonym..."
                      value={newSynonym}
                      onChange={(e) => setNewSynonym(e.target.value)}
                      className="flex-1 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      onClick={handleAddSynonym}
                      disabled={!newSynonym.trim() || !selectedSpecialtyForSynonyms}
                      className="px-4 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {/* Synonyms Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-900">Synonyms</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedSpecialtyForSynonyms && currentSynonyms && [...currentSynonyms.predefined, ...currentSynonyms.custom].map((synonym, index) => {
                      const isCustom = currentSynonyms.custom.includes(synonym);
                      return (
                        <div
                          key={`${synonym}-${index}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${
                            isCustom 
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          <span>{synonym}</span>
                          <button
                            onClick={() => handleRemoveSynonym(synonym)}
                            className={`hover:bg-opacity-80 rounded-full p-0.5 ${
                              isCustom ? 'hover:bg-purple-100' : 'hover:bg-blue-100'
                            }`}
                          >
                            <XMarkIcon className={`h-3.5 w-3.5 ${isCustom ? 'text-purple-500' : 'text-blue-500'}`} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowSynonymModal(false)}>
              Close
            </Button>
            <Button onClick={handleSaveSynonyms} className="bg-blue-600 hover:bg-blue-700 text-white">
              Save Changes
            </Button>
          </div>
        </DialogContent>
        </Dialog>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {viewMode === 'mapped' ? (
          <div className="space-y-4">
            {/* Search and Stats Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <span className="text-2xl font-semibold text-gray-900">{mappedGroups.length}</span>
                      <span className="ml-2 text-sm text-gray-500">Mapped Groups</span>
                    </div>
                    <div className="h-8 w-px bg-gray-200" />
                    <div className="flex items-center">
                      <span className="text-2xl font-semibold text-gray-900">
                        {Object.values(specialtiesByVendor).reduce((acc, curr) => acc + curr.length, 0)}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">Unmapped Specialties</span>
                    </div>
                  </div>
                <div className="relative">
                  <MagnifyingGlassIcon 
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                  />
                  <input
                    type="text"
                      placeholder="Search mapped or unmapped specialties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-96 pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg 
                      focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      shadow-sm placeholder-gray-400"
                  />
              </div>
            </div>

                {/* Tabs */}
                <div className="flex space-x-1 border-b border-gray-200">
                  <button
                    onClick={() => setShowUnmapped(false)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-x border-t transition-colors
                      ${!showUnmapped 
                        ? 'bg-white border-gray-200 text-blue-600 -mb-px' 
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    Mapped Specialty Groups
                  </button>
                  <button
                    onClick={() => setShowUnmapped(true)}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-x border-t transition-colors
                      ${showUnmapped 
                        ? 'bg-white border-gray-200 text-blue-600 -mb-px' 
                        : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    Unmapped Specialties
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {!showUnmapped ? (
                /* Mapped Groups View */
              <div className="divide-y divide-gray-200">
                {mappedGroups
                  .filter(group =>
                    searchQuery ? 
                      group.specialties.some(s => 
                        s.specialty.toLowerCase().includes(searchQuery.toLowerCase())
                      ) : true
                  )
                  .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                  .map((group) => (
                    <div key={group.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                          <div className="flex flex-wrap gap-4">
                          {group.specialties.map((specialty, index) => (
                            <div key={`${specialty.vendor}:${specialty.specialty}`} 
                                 className="flex items-center">
                                <div className="flex flex-col items-start bg-white rounded-lg border border-gray-200 shadow-sm p-3">
                                  <span className="text-sm font-medium text-gray-900">
                                {specialty.specialty}
                                  </span>
                                  <span className="mt-1 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-100">
                                  {specialty.vendor}
                                </span>
                                </div>
                              {index < group.specialties.length - 1 && (
                                  <div className="mx-2">
                                    <ArrowsRightLeftIcon className="h-5 w-5 text-gray-400" />
                                  </div>
                              )}
                            </div>
                          ))}
                        </div>
                          <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                            <span>Created {new Date(group.createdAt).toLocaleString()}</span>
                            {group.isSingleSource && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                Single Source
                              </span>
                            )}
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
                  {mappedGroups.length === 0 && (
                    <div className="p-8 text-center">
                      <div className="mx-auto h-12 w-12 text-gray-400">
                        <InformationCircleIcon className="h-12 w-12" />
              </div>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No mapped groups</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by mapping specialties in Auto-Map or Manual Map mode
                      </p>
            </div>
                  )}
                  </div>
              ) : (
                /* Unmapped Specialties View */
                <div className="p-6">
                  <div className="grid grid-cols-3 gap-6">
                {Object.entries(specialtiesByVendor).map(([vendor, specialties]) => (
                  <div key={vendor} className="flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-semibold text-gray-900">{vendor}</h4>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                              {specialties.length} specialties
                            </span>
                          </div>
                    </div>
                    <div className="space-y-2">
                      {specialties
                        .filter(s => searchQuery ? s.specialty.toLowerCase().includes(searchQuery.toLowerCase()) : true)
                        .map(specialty => (
                        <div
                          key={`${specialty.vendor}:${specialty.specialty}`}
                              className="group flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {specialty.specialty}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newGroup: MappedGroup = {
                                id: Math.random().toString(36).substr(2, 9),
                                specialties: [specialty],
                                createdAt: new Date(),
                                isSingleSource: true
                              };
                              setMappedGroups(prev => [...prev, newGroup]);
                              toast.success('Marked as single source specialty');
                            }}
                                className="opacity-0 group-hover:opacity-100 px-3 py-1.5 text-xs font-medium rounded-md
                              text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200
                              transition-all duration-150"
                          >
                            Mark as Single Source
                          </button>
                        </div>
                      ))}
                      {specialties.length === 0 && (
                        <div className="flex items-center justify-center p-8 bg-white rounded-lg border border-gray-200">
                          <div className="text-center">
                            <InformationCircleIcon className="mx-auto h-10 w-10 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No unmapped specialties</h3>
                            <p className="mt-1 text-sm text-gray-500">
                              All specialties in this vendor have been mapped
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
                </div>
              )}
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
                              onClick={() => toggleSpecialtySelection({
                                specialty: specialty.specialty,
                                vendor: specialty.vendor,
                                metrics: specialty.metrics
                              })}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">
                                    {specialty.specialty}
                                  </div>
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
                    <div className="relative">
                      {selectedSpecialties.size === 0 ? (
                        <button
                          disabled
                          className="w-full px-4 py-2 text-sm font-medium rounded-md
                            text-white bg-blue-600 opacity-50 cursor-not-allowed
                            transition-colors duration-150 ease-in-out shadow-sm"
                        >
                          Select specialties
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button
                            onClick={createManualMapping}
                            className="flex-1 px-4 py-2 text-sm font-medium rounded-l-md
                              text-white bg-blue-600 hover:bg-blue-700
                              transition-colors duration-150 ease-in-out shadow-sm"
                          >
                            {selectedSpecialties.size === 1
                              ? 'Create Single Source'
                              : `Create Group (${selectedSpecialties.size})`}
                          </button>
                          {selectedSpecialties.size > 1 && (
                            <button
                              onClick={createIndividualSingleMappings}
                              className="px-3 py-2 text-sm font-medium rounded-r-md
                                text-white bg-blue-600 hover:bg-blue-700 border-l border-blue-500
                                transition-colors duration-150 ease-in-out shadow-sm
                                group relative"
                              title="Create individual single sources"
                            >
                              <ArrowsRightLeftIcon className="h-4 w-4" />
                              <span className="absolute right-0 top-full mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg
                                opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                Create individual single sources
                              </span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
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
                              onClick={() => toggleSpecialtySelection({
                                specialty: specialty,
                                vendor: vendor,
                                metrics: specialtiesByVendor[vendor]?.find(s => s.specialty === specialty)?.metrics
                              })}
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
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {mapping.sourceSpecialty.specialty}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                // Find the specialty object
                                let specialty = allSpecialties.find(s => s.name === mapping.sourceSpecialty.specialty);
                                if (!specialty) {
                                  // If specialty doesn't exist, create it
                                  const newSpecialty = specialtyManager.addSpecialty(mapping.sourceSpecialty.specialty);
                                  if (!newSpecialty) {
                                    toast.error("Failed to create specialty");
                                    return;
                                  }
                                  // Refresh the specialties list
                                  const loadedSpecialties = specialtyManager.getAllSpecialties();
                                  setAllSpecialties(loadedSpecialties);
                                  specialty = newSpecialty;
                                }
                                
                                // Get potential matches as predefined synonyms
                                const predefinedSynonyms = mapping.matches
                                  .filter(m => m.confidence >= 0.8)
                                  .map(m => m.specialty.specialty);
                                  
                                // Update the specialty with predefined synonyms
                                if (predefinedSynonyms.length > 0 && specialty) {
                                  for (const synonymText of predefinedSynonyms) {
                                    specialtyManager.addSynonym(specialty.id, synonymText, true);
                                  }
                                }
                                
                                // Refresh stats and specialties list again after adding synonyms
                                getSpecialtyStats();
                                const updatedSpecialties = specialtyManager.getAllSpecialties();
                                setAllSpecialties(updatedSpecialties);
                                
                                // Select the specialty and open the modal
                                handleSpecialtySelect(mapping.sourceSpecialty.specialty);
                                setShowSynonymModal(true);
                              }}
                              className="group relative inline-flex items-center p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Add to Synonyms"
                            >
                              <PlusIcon className="h-4 w-4" />
                              <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-gray-900 bg-white border border-gray-200 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                Add to Synonyms
                              </span>
                            </button>
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
                                  Accept All Matches ({mapping.matches.filter(m => !m.status || m.status === 'approved').length})
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
                                    </div>
                                {!match.status && (
                                  <div className="flex items-center gap-2 ml-4">
                                    <Button
                                      onClick={() => updateMappingStatus(mapping.sourceSpecialty, match.specialty, 'approved')}
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                      title="Approve match"
                                    >
                                      <CheckIcon className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      onClick={() => updateMappingStatus(mapping.sourceSpecialty, match.specialty, 'rejected')}
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                      title="Reject match"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Replace the "Add More" button with inline search */}
                            <div className="relative mt-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="text"
                                    placeholder="Search to add more specialties..."
                                    value={localSearchQueries.get(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`) || ''}
                                    onChange={(e) => {
                                      setLocalSearchQueries(prev => new Map(prev).set(
                                        `${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`,
                                        e.target.value
                                      ));
                                    }}
                                    onFocus={() => {
                                      setOpenSearchDropdowns(prev => {
                                        const next = new Set(prev);
                                        next.add(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                        return next;
                                      });
                                    }}
                                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md
                                      focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                  <MagnifyingGlassIcon 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    setOpenSearchDropdowns(prev => {
                                      const next = new Set(prev);
                                      next.add(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                      return next;
                                    });
                                  }}
                                  className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md
                                    text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                >
                                  <PlusIcon className="h-4 w-4 mr-1.5" />
                                  Add
                                </button>
                              </div>

                              {/* Dropdown for search results */}
                              {openSearchDropdowns.has(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`) && (
                                <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                                  <div className="max-h-60 overflow-y-auto py-1">
                                    {(() => {
                                      const localSearchQuery = localSearchQueries.get(
                                        `${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`
                                      ) || '';
                                      
                                      const availableSpecialties = getAvailableSpecialties(mapping, localSearchQuery);

                                      if (availableSpecialties.length === 0) {
                                        return (
                                          <div className="px-3 py-2 text-sm text-gray-500">
                                            No matching specialties found
                                          </div>
                                        );
                                      }

                                      return availableSpecialties.map((specialty) => (
                                        <button
                                          key={`${specialty.vendor}:${specialty.specialty}`}
                                          onClick={() => {
                                            const newMatch = {
                                              specialty,
                                              confidence: calculateStringSimilarity(
                                                mapping.sourceSpecialty.specialty,
                                                specialty.specialty
                                              ),
                                              reason: 'Manually added',
                                              status: undefined as 'approved' | 'rejected' | undefined
                                            };
                                            
                                            setAllAutoMappings(prev => prev.map(m => 
                                              m.sourceSpecialty.specialty === mapping.sourceSpecialty.specialty
                                                ? { 
                                                    ...m, 
                                                    matches: [...m.matches, newMatch].sort((a, b) => b.confidence - a.confidence)
                                                  }
                                                : m
                                            ));
                                            
                                            setOpenSearchDropdowns(prev => {
                                              const next = new Set(prev);
                                              next.delete(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                              return next;
                                            });
                                            setLocalSearchQueries(prev => {
                                              const next = new Map(prev);
                                              next.delete(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                              return next;
                                            });
                                            
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
                                        setOpenSearchDropdowns(prev => {
                                          const next = new Set(prev);
                                          next.delete(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                          return next;
                                        });
                                        setLocalSearchQueries(prev => {
                                          const next = new Map(prev);
                                          next.delete(`${mapping.sourceSpecialty.vendor}:${mapping.sourceSpecialty.specialty}`);
                                          return next;
                                        });
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
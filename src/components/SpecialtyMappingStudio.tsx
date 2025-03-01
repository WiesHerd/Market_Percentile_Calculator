"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon, CheckCircleIcon, ArrowPathIcon, PlusIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
  specialtyDefinitions
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

const STORAGE_KEY = 'specialty-mappings';

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

    // Group specialties by normalized name and synonyms
    const specialtiesByNormalizedName = new Map<string, SpecialtyData[]>();
    
    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
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
        
        // Find matches from other vendors in the same group
        const matches = instances.slice(1).map(match => ({
            specialty: match,
          confidence: 0.95, // High confidence since they're in the same group
          reason: 'Known synonym',
            status: undefined as 'approved' | 'rejected' | undefined
        }));

        // Also look for potential matches in other specialties
        Object.entries(specialtiesByVendor).forEach(([vendor, vendorSpecialties]) => {
          if (vendor !== sourceSpecialty.vendor) {
            vendorSpecialties
              .filter(s => 
                !instances.some(grouped => grouped.specialty === s.specialty) && 
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

  // Update handleAddSynonym
  const handleAddSynonym = (): void => {
    if (newSynonym.trim() && !currentSynonyms.custom.includes(newSynonym.trim())) {
      setCurrentSynonyms(prev => ({
        ...prev,
        custom: [...prev.custom, newSynonym.trim()]
      }));
      setNewSynonym('');
    }
  };

  // Update handleRemoveSynonym
  const handleRemoveSynonym = (synonym: string): void => {
    if (!selectedSpecialtyForSynonyms) return;

    const specialtyObj = allSpecialties.find(s => s.name === selectedSpecialtyForSynonyms);
    if (!specialtyObj) return;

    if (currentSynonyms.predefined.includes(synonym)) {
      if (!window.confirm('This is a predefined synonym. Are you sure you want to remove it?')) {
        return;
      }
    }

    // Remove from current synonyms
    setCurrentSynonyms(prev => ({
      predefined: prev.predefined.filter(s => s !== synonym),
      custom: prev.custom.filter(s => s !== synonym)
    }));

    // Update specialty manager
    specialtyManager.removeSynonym(specialtyObj.id, synonym);
    
    // Show success message
    toast.success(`Removed synonym: ${synonym}`);
    
    // Refresh stats
    getSpecialtyStats();
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
              <Button onClick={() => setShowSynonymModal(true)}>
                Manage Synonyms
              </Button>
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
                ${allSpecialties.length === 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}
                transition-colors duration-150 ease-in-out`}
              >
                {allSpecialties.length === 0 ? (
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
      <Dialog open={showClearConfirmation} onOpenChange={setShowClearConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Mappings?</DialogTitle>
            <DialogDescription>
              This will remove all specialty mappings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end space-x-2">
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Synonym Management Modal */}
      <Dialog open={showSynonymModal} onOpenChange={setShowSynonymModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0 bg-white">
          <DialogHeader className="px-6 py-4 border-b shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <DialogTitle className="text-xl">Manage Specialty Synonyms</DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border border-blue-200">
                {allSpecialties.length} specialties
              </Badge>
              <span className="text-sm text-gray-500">Add and manage synonyms for each specialty</span>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-hidden">
            <div className="grid grid-cols-2 gap-6 h-full p-6">
              {/* Left column - Specialty List */}
              <div className="border rounded-lg bg-white flex flex-col overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-gradient-to-r from-gray-50 to-white shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      value={specialtySearch}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search specialties..."
                      className="w-full pl-9 h-10"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-1 p-2">
                    {getFilteredSpecialties().map((specialty: SpecialtyWithStats) => (
                      <div
                        key={specialty.id}
                        onClick={() => handleSpecialtySelect(specialty.name)}
                        className={cn(
                          "group flex items-center justify-between px-4 py-3 rounded-md text-sm transition-colors",
                          "hover:bg-gray-50 cursor-pointer",
                          selectedSpecialtyForSynonyms === specialty.name 
                            ? "bg-blue-50 border-blue-200 shadow-sm" 
                            : "bg-white border-transparent",
                          "border"
                        )}
                      >
                        <div className="flex items-center min-w-0 gap-3">
                          <span className="truncate font-medium">{specialty.name}</span>
                          {(specialty.stats.predefinedCount > 0 || specialty.stats.customCount > 0) && (
                            <div className="flex items-center gap-2">
                              {specialty.stats.predefinedCount > 0 && (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {specialty.stats.predefinedCount} predefined
                                </Badge>
                              )}
                              {specialty.stats.customCount > 0 && (
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {specialty.stats.customCount} custom
                                </Badge>
                              )}
                  </div>
                          )}
                          {specialty.stats.predefinedCount === 0 && specialty.stats.customCount === 0 && (
                            <Badge variant="secondary" className="bg-gray-50 text-gray-600 border-gray-200">
                              No synonyms
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedSpecialtyForSynonyms === specialty.name && (
                            <ChevronRightIcon className="h-4 w-4 text-blue-500" />
                          )}
                    <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSpecialty(specialty);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-50 transition-opacity"
                          >
                            <XMarkIcon className="h-4 w-4 text-red-500" />
                    </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Right column - Synonyms */}
              <div className="border rounded-lg bg-white flex flex-col overflow-hidden shadow-sm">
                <ScrollArea className="flex-1">
                  <div className="p-6 space-y-6">
                    {selectedSpecialtyForSynonyms ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between pb-2 border-b">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Synonyms for {selectedSpecialtyForSynonyms}
                          </h3>
                        </div>
                        
                        {/* Predefined Synonyms */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">Predefined Synonyms</h4>
                              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                {currentSynonyms.predefined.length}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentSynonyms.predefined.map((synonym) => (
                              <div key={synonym} className="group inline-flex items-center bg-gray-50 rounded-full px-3 py-1.5 text-sm border shadow-sm">
                                <span>{synonym}</span>
                                <Badge variant="secondary" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                                  predefined
                                </Badge>
                              </div>
                            ))}
                            {currentSynonyms.predefined.length === 0 && (
                              <p className="text-sm text-gray-500 italic">No predefined synonyms</p>
                            )}
                          </div>
                        </div>

                        {/* Custom Synonyms */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">Custom Synonyms</h4>
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                {currentSynonyms.custom.length}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentSynonyms.custom.map((synonym) => (
                              <div key={synonym} className="group inline-flex items-center bg-emerald-50 rounded-full px-3 py-1.5 text-sm border border-emerald-200 shadow-sm">
                                <span>{synonym}</span>
                    <button
                                  onClick={() => handleRemoveSynonym(synonym)}
                                  className="ml-2 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-emerald-100 transition-opacity"
                    >
                                  <XMarkIcon className="h-3 w-3 text-emerald-600" />
                    </button>
                  </div>
                            ))}
                            {currentSynonyms.custom.length === 0 && (
                              <p className="text-sm text-gray-500 italic">No custom synonyms added yet</p>
                            )}
            </div>
          </div>

                        {/* Add new synonym */}
                        <div className="pt-2 border-t">
                          <div className="relative">
                            <Input
                              placeholder="Enter new synonym..."
                              value={newSynonym}
                              onChange={(e) => setNewSynonym(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newSynonym.trim()) {
                                  handleAddSynonym();
                                }
                              }}
                              className="pr-24 h-10"
                            />
                            <Button 
                              size="sm"
                              onClick={handleAddSynonym}
                              disabled={!newSynonym.trim()}
                              className="absolute right-1 top-1 bottom-1 h-8"
                            >
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Synonym
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-4">
                        <ArrowsRightLeftIcon className="h-12 w-12 text-gray-300" />
                        <div className="text-center">
                          <p className="font-medium">Select a specialty</p>
                          <p className="text-sm text-gray-400">Choose a specialty from the list to manage its synonyms</p>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Add New Specialty Section */}
          <div className="px-6 py-4 border-t shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Add New Specialty</h3>
                <p className="text-xs text-gray-500">Create a new specialty that doesn't exist in the system</p>
              </div>
            </div>
            <div className="relative">
              <Input
                placeholder="Enter specialty name..."
                value={newSpecialtyName}
                onChange={(e) => setNewSpecialtyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSpecialtyName.trim()) {
                    handleAddSpecialty();
                  }
                }}
                className="pr-[140px] h-10"
              />
              <Button 
                size="sm"
                onClick={handleAddSpecialty}
                disabled={!newSpecialtyName.trim()}
                className="absolute right-1 top-1 bottom-1 h-8 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors duration-150 ease-in-out disabled:bg-blue-300"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                Add Specialty
              </Button>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0 bg-gradient-to-r from-gray-50 to-white">
            <Button variant="outline" onClick={() => setShowSynonymModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveSynonyms}
              disabled={!selectedSpecialtyForSynonyms}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
        </Dialog>

      {/* Help Modal */}
      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>How to Use the Specialty Mapping Studio</DialogTitle>
            <DialogDescription>
              Learn how to effectively map and manage medical specialties across different survey vendors.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Three Ways to Map Specialties</h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">1. Auto-Map Mode</h4>
                  <p className="text-sm text-blue-800">
                    Automatically finds potential matches between specialties based on name similarity and known synonyms.
                    Review and approve/reject suggested matches to create mapping groups.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">2. Manual Map Mode</h4>
                  <p className="text-sm text-green-800">
                    Manually select specialties from different vendors to map them together.
                    Useful when you know exactly which specialties should be mapped to each other.
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h4 className="font-medium text-purple-900 mb-2">3. View Mapped</h4>
                  <p className="text-sm text-purple-800">
                    Review all your existing mappings, remove incorrect ones, and see which specialties are still unmapped.
                    You can also mark single-source specialties here.
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Managing Synonyms</h3>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Click "Manage Synonyms" to add or edit specialty synonyms
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Predefined synonyms are system-provided and cannot be removed
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      Custom synonyms can be added and removed as needed
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Tips & Best Practices</h3>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                  <ul className="space-y-2 text-sm text-amber-900">
                    <li className="flex items-start gap-2">
                      <span>1.</span>
                      Start with Auto-Map mode to quickly match obvious pairs
                    </li>
                    <li className="flex items-start gap-2">
                      <span>2.</span>
                      Use Manual mode for specialties that require specific knowledge to map
                    </li>
                    <li className="flex items-start gap-2">
                      <span>3.</span>
                      Regularly review mapped specialties to ensure accuracy
                    </li>
                    <li className="flex items-start gap-2">
                      <span>4.</span>
                      Add synonyms to improve future auto-mapping suggestions
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHelpModal(false)}>Got it, thanks!</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                                <span className="ml-2 px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700 border border-blue-100">
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
                              onClick={() => handleSpecialtySelect(specialty.specialty)}
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
                              onClick={() => handleSpecialtySelect(specialty)}
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
                                              status: 'approved' as const
                                            };
                                            
                                            setAllAutoMappings(prev => prev.map(m => 
                                              m.sourceSpecialty.specialty === mapping.sourceSpecialty.specialty
                                                ? { ...m, matches: [...m.matches, newMatch] }
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
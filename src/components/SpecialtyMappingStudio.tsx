"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon, CheckCircleIcon, ArrowPathIcon, PlusIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ComputerDesktopIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { calculateStringSimilarity } from '@/utils/string';
import { findMatchingSpecialties } from '@/utils/surveySpecialtyMapping';
import type { SurveyVendor, SpecialtyMapping } from '@/utils/surveySpecialtyMapping';
import { toast } from 'react-hot-toast';
import { specialtyManager } from '@/utils/specialtyManager';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import type { SpecialtyMetadata } from "@/types/specialty";
import type { Specialty } from "@/types/specialty";
import { useDebounce } from 'use-debounce';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// State types
type BaseSpecialty = {
  id: string;
  name: string;
  category?: string;
  synonyms: {
    predefined: string[];
    custom: string[];
  };
  metadata: SpecialtyMetadata;
};

// Define the SpecialtyWithStats interface
interface SpecialtyWithStats extends Specialty {
  stats: {
    predefinedCount: number;
    customCount: number;
    synonymCount: number;
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

// Helper function to convert BaseSpecialty to SpecialtyWithStats
function convertToSpecialtyWithStats(specialty: Specialty): SpecialtyWithStats {
  return {
    ...specialty,
    stats: {
      synonymCount: specialty.synonyms.predefined.length + specialty.synonyms.custom.length,
      predefinedCount: specialty.synonyms.predefined.length,
      customCount: specialty.synonyms.custom.length
    }
  };
}

// Update the formatVendorName function to ensure consistent vendor names
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

  return vendorMap[normalized] || vendor.toUpperCase();
};

interface AutoMapping {
  sourceSpecialty: SpecialtyData;
  matches: Array<{
    specialty: SpecialtyData;
    confidence: number;
    reason: string;
    status?: 'approved' | 'rejected';
  }>;
}

const SpecialtyMappingStudio: React.FC<SpecialtyMappingStudioProps> = ({
  surveys,
  onMappingChange,
  onSave,
  initialMappings,
}: SpecialtyMappingStudioProps): JSX.Element => {
  console.log('🚀 SpecialtyMappingStudio initializing with:', {
    surveyCount: surveys.length,
    initialMappings: initialMappings ? Object.keys(initialMappings).length : 0
  });

  // State declarations
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
  const [selectedSpecialtyForSynonyms, setSelectedSpecialtyForSynonyms] = useState<string | null>(null);
  const [editingSynonyms, setEditingSynonyms] = useState<string[]>([]);
  const [newSynonym, setNewSynonym] = useState("");
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [allSpecialties, setAllSpecialties] = useState<SpecialtyWithStats[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyWithStats | null>(null);
  const [editingSpecialty, setEditingSpecialty] = useState<SpecialtyWithStats | null>(null);
  const [specialtyStats, setSpecialtyStats] = useState<SpecialtyStats>({});
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [searchResults, setSearchResults] = useState<SpecialtyWithStats[]>([]);
  const [currentSynonyms, setCurrentSynonyms] = useState<CurrentSynonyms>({
    predefined: [],
    custom: []
  });
  const [showUnmapped, setShowUnmapped] = useState(false);
  // Add new state for pending synonym
  const [pendingSynonym, setPendingSynonym] = useState<string>("");
  const [showNewSpecialtyDialog, setShowNewSpecialtyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [specialtyToDelete, setSpecialtyToDelete] = useState<SpecialtyWithStats | null>(null);

  // Add debounced search query state
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);

  // Create a set of already mapped specialties
  const mappedSpecialtySet = useMemo(() => {
    console.log('Computing mapped specialty set');
    return new Set(
      mappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}:${s.vendor}`)
      )
    );
  }, [mappedGroups]);

  // Load all specialties and their synonyms on mount
  useEffect(() => {
    // Only refresh predefined synonyms on initial mount
    const hasInitialized = localStorage.getItem('synonyms_initialized');
    if (!hasInitialized) {
      specialtyManager.refreshPredefinedSynonyms();
      localStorage.setItem('synonyms_initialized', 'true');
    }
    
    // Load all specialties with stats
    const loadedSpecialties = specialtyManager.getAllSpecialties().map(convertToSpecialtyWithStats);
    
    // Update state with properly typed specialties
    setAllSpecialties(loadedSpecialties);
    setSearchResults(loadedSpecialties);
    
    // Initialize specialty stats
    getSpecialtyStats();
  }, []); // Empty dependency array since this should only run once on mount

  // Organize specialties by vendor
  const specialtiesByVendor = useMemo(() => {
    console.log('📊 Computing specialtiesByVendor');
    const result: Record<string, SpecialtyData[]> = {};
    
    surveys.forEach(survey => {
      const vendorSpecialties = survey.data.map(item => ({
        specialty: item.specialty,
        vendor: survey.vendor,
              metrics: {
                tcc: item.tcc,
                wrvu: item.wrvu,
                cf: item.cf
              }
      }));

      result[survey.vendor] = vendorSpecialties;
    });

    // Sort specialties alphabetically within each vendor
    Object.keys(result).forEach(vendor => {
      result[vendor].sort((a, b) => a.specialty.localeCompare(b.specialty));
    });

    console.log('📊 Loaded specialties by vendor:', result);
    return result;
  }, [surveys]);

  // Filter specialties based on search
  const filteredSpecialties = useMemo(() => {
    console.log('🔍 Filtering specialties with search:', searchQuery);
    const result: Record<string, SpecialtyData[]> = {};
    const searchTerm = searchQuery.toLowerCase();

    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      result[vendor] = specialties.filter(item =>
        item.specialty.toLowerCase().includes(searchTerm)
      );
    });

    console.log('🔍 Filtered specialties result:', result);
    return result;
  }, [specialtiesByVendor, searchQuery]);

  // New enhanced function to find potential matches for a specialty
  const findPotentialMatches = (specialty: SpecialtyData): AutoMapSuggestion => {
    console.log('🔍 findPotentialMatches called for:', specialty);
    
    const suggestions: AutoMapSuggestion = {
      sourceSpecialty: specialty,
      suggestedMatches: []
    };

    // Look through all vendors except the source vendor
    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      console.log(`\n📊 Checking vendor: ${vendor} with ${specialties.length} specialties`);
      
      if (vendor !== specialty.vendor) {
        specialties.forEach(targetSpecialty => {
          console.log(`\n🎯 Evaluating target specialty: ${targetSpecialty.specialty}`);
          
          // STEP 1: Check for exact matches and synonyms first
          const sourceSpecialtyObj = specialtyManager.searchSpecialties(specialty.specialty)[0];
          const targetSpecialtyObj = specialtyManager.searchSpecialties(targetSpecialty.specialty)[0];

          console.log('Source specialty object:', sourceSpecialtyObj);
          console.log('Target specialty object:', targetSpecialtyObj);

          if (sourceSpecialtyObj && targetSpecialtyObj) {
            // Get all synonyms including predefined and custom
            const sourceSynonyms = [
              sourceSpecialtyObj.name,
              ...sourceSpecialtyObj.synonyms.predefined,
              ...sourceSpecialtyObj.synonyms.custom
            ].map(s => s.toLowerCase().trim());

            const targetSynonyms = [
              targetSpecialtyObj.name,
              ...targetSpecialtyObj.synonyms.predefined,
              ...targetSpecialtyObj.synonyms.custom
            ].map(s => s.toLowerCase().trim());

            console.log('Source synonyms:', sourceSynonyms);
            console.log('Target synonyms:', targetSynonyms);

            // Check for exact matches or synonym matches
            const normalizedSource = specialty.specialty.toLowerCase().trim();
            const normalizedTarget = targetSpecialty.specialty.toLowerCase().trim();

            console.log('Normalized source:', normalizedSource);
            console.log('Normalized target:', normalizedTarget);

            if (normalizedSource === normalizedTarget) {
              console.log('✅ Found exact match!');
              suggestions.suggestedMatches.push({
                specialty: targetSpecialty,
                confidence: 1.0,
                reason: 'Exact match'
              });
              return; // Skip further checks for this specialty
            }

            // Check if either specialty is in the other's synonym list
            if (sourceSynonyms.includes(normalizedTarget) || targetSynonyms.includes(normalizedSource)) {
              console.log('✅ Found synonym match!');
              suggestions.suggestedMatches.push({
                specialty: targetSpecialty,
                confidence: 1.0,
                reason: 'Synonym match'
              });
              return; // Skip further checks for this specialty
            }

            // Check for shared synonyms
            const hasSharedSynonym = sourceSynonyms.some(s => targetSynonyms.includes(s));
            if (hasSharedSynonym) {
              console.log('✅ Found shared synonym!');
              suggestions.suggestedMatches.push({
                specialty: targetSpecialty,
                confidence: 1.0,
                reason: 'Shared synonym'
              });
              return; // Skip further checks for this specialty
            }

            // STEP 2: Only if no synonym matches were found, try string similarity
            const similarity = calculateStringSimilarity(
              specialty.specialty,
              targetSpecialty.specialty
            );
            
            console.log('String similarity score:', similarity);
            
            if (similarity >= 0.8) {
              console.log('✅ Found similar name match!');
            suggestions.suggestedMatches.push({
              specialty: targetSpecialty,
                confidence: similarity,
                reason: 'Similar name'
            });
            }
          }
        });
      }
    });

    console.log('📝 Final suggestions:', suggestions);
    // Sort by confidence and return
    suggestions.suggestedMatches.sort((a, b) => b.confidence - a.confidence);
    return suggestions;
  };

  // Add a function to check for vendor-specific matching rules
  const checkVendorSpecificMatches = (
    sourceSpecialty: SpecialtyData,
    targetSpecialty: SpecialtyData
  ): { isMatch: boolean; reason: string; confidence: number } => {
    const result = { isMatch: false, reason: '', confidence: 0 };
    
    // Normalize specialty names for comparison
    const sourceName = sourceSpecialty.specialty.toLowerCase().trim();
    const targetName = targetSpecialty.specialty.toLowerCase().trim();
    
    // Normalize vendor names
    const sourceVendor = formatVendorName(sourceSpecialty.vendor);
    const targetVendor = formatVendorName(targetSpecialty.vendor);
    
    // Define vendor-specific matching rules
    const vendorSpecificRules: Array<{
      source: { name: string; vendor?: string };
      target: { name: string; vendor?: string };
      confidence: number;
      reason: string;
    }> = [
      // Adolescent Medicine rules
      {
        source: { name: 'adolescent medicine' },
        target: { name: 'adolescent medicine' },
        confidence: 0.95,
        reason: 'Exact specialty match'
      },
      // Child and Adolescent Psychiatry rules
      {
        source: { name: 'child and adolescent psychiatry' },
        target: { name: 'child and adolescent psychiatry' },
        confidence: 0.95,
        reason: 'Exact specialty match'
      },
      // Add specific rules for Psychiatry and Child/Adolescent Psychiatry
      {
        source: { name: 'psychiatry' },
        target: { name: 'child and adolescent psychiatry' },
        confidence: 0.85,
        reason: 'Psychiatry specialty family'
      },
      {
        source: { name: 'child and adolescent psychiatry' },
        target: { name: 'psychiatry' },
        confidence: 0.85,
        reason: 'Psychiatry specialty family'
      },
      {
        source: { name: 'psychiatry' },
        target: { name: 'psychiatry' },
        confidence: 0.95,
        reason: 'Exact psychiatry match'
      },
      // Child Development rules
      {
        source: { name: 'child development' },
        target: { name: 'child development' },
        confidence: 0.95,
        reason: 'Exact specialty match'
      },
      {
        source: { name: 'child development' },
        target: { name: 'developmental-behavioral medicine' },
        confidence: 0.85,
        reason: 'Related specialty'
      },
      {
        source: { name: 'developmental-behavioral medicine' },
        target: { name: 'child development' },
        confidence: 0.85,
        reason: 'Related specialty'
      },
      // Gastroenterology rules
      {
        source: { name: 'gastroenterology' },
        target: { name: 'gastroenterology' },
        confidence: 0.95,
        reason: 'Exact specialty match'
      },
      // Otolaryngology/Otorhinolaryngology rules
      {
        source: { name: 'otolaryngology' },
        target: { name: 'otorhinolaryngology' },
        confidence: 0.95,
        reason: 'Known synonym'
      },
      {
        source: { name: 'otorhinolaryngology' },
        target: { name: 'otolaryngology' },
        confidence: 0.95,
        reason: 'Known synonym'
      },
      // Urgent Care rules
      {
        source: { name: 'urgent care' },
        target: { name: 'urgent care' },
        confidence: 0.95,
        reason: 'Exact specialty match'
      },
      // Cross-vendor specific rules
      {
        source: { name: 'adolescent medicine', vendor: 'MGMA' },
        target: { name: 'adolescent medicine', vendor: 'SULLIVANCOTTER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'adolescent medicine', vendor: 'MGMA' },
        target: { name: 'adolescent medicine', vendor: 'GALLAGHER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'child and adolescent psychiatry', vendor: 'MGMA' },
        target: { name: 'child and adolescent psychiatry', vendor: 'SULLIVANCOTTER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'child development', vendor: 'MGMA' },
        target: { name: 'child development', vendor: 'GALLAGHER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'gastroenterology', vendor: 'MGMA' },
        target: { name: 'gastroenterology', vendor: 'SULLIVANCOTTER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'gastroenterology', vendor: 'MGMA' },
        target: { name: 'gastroenterology', vendor: 'GALLAGHER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'otorhinolaryngology', vendor: 'MGMA' },
        target: { name: 'otolaryngology', vendor: 'SULLIVANCOTTER' },
        confidence: 0.98,
        reason: 'Known cross-vendor synonym'
      },
      {
        source: { name: 'otorhinolaryngology', vendor: 'MGMA' },
        target: { name: 'otorhinolaryngology', vendor: 'GALLAGHER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'urgent care', vendor: 'MGMA' },
        target: { name: 'urgent care', vendor: 'SULLIVANCOTTER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      },
      {
        source: { name: 'urgent care', vendor: 'MGMA' },
        target: { name: 'urgent care', vendor: 'GALLAGHER' },
        confidence: 0.98,
        reason: 'Exact cross-vendor match'
      }
    ];
    
    // Check if any rules match
    for (const rule of vendorSpecificRules) {
      if (
        (rule.source.name === sourceName || sourceName.includes(rule.source.name)) &&
        (rule.target.name === targetName || targetName.includes(rule.target.name)) &&
        (!rule.source.vendor || rule.source.vendor === sourceVendor) &&
        (!rule.target.vendor || rule.target.vendor === targetVendor)
      ) {
        result.isMatch = true;
        result.reason = rule.reason;
        result.confidence = rule.confidence;
        break;
      }
    }
    
    return result;
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

  // Update the acceptSuggestedMatches function to handle multiple suggestions
  const acceptSuggestedMatches = (suggestion: AutoMapSuggestion, matchesToAccept?: Array<{specialty: SpecialtyData; confidence: number; reason: string}>) => {
    const selectedMatches = matchesToAccept || suggestion.suggestedMatches;
    
    if (selectedMatches.length === 0) {
      toast.error('No matches to accept');
      return;
    }
    
    const selectedItems: SpecialtyData[] = [
      suggestion.sourceSpecialty,
      ...selectedMatches.map(match => match.specialty)
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
    const mappedSpecialties = selectedMatches.map(match => match.specialty.specialty);
    onMappingChange(suggestion.sourceSpecialty.specialty, mappedSpecialties);
    
    toast.success(`Created new mapping group with ${selectedMatches.length} matches`);
  };

  // Add a function to accept all matches above a certain confidence threshold
  const acceptAllMatches = (suggestion: AutoMapSuggestion, threshold = 0.9) => {
    const highConfidenceMatches = suggestion.suggestedMatches.filter(
      match => match.confidence >= threshold
    );
    
    if (highConfidenceMatches.length === 0) {
      toast.success('No high-confidence matches found');
      return;
    }
    
    acceptSuggestedMatches(suggestion, highConfidenceMatches);
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

  // Optimize the generateAllMappings function to fix performance issues
  const generateAllMappings = useCallback(() => {
    console.log('Starting generateAllMappings');
    
    // Track processed specialties to prevent duplicates
    const processedSpecialties = new Set<string>();
    const processedAsTarget = new Set<string>();
    const newMappings: AutoMapping[] = [];

    // Get currently mapped specialties
    const mappedSpecialtyKeys = new Set(
      mappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}:${s.vendor}`.toLowerCase())
      )
    );

    // Process each vendor
    Object.entries(specialtiesByVendor).forEach(([vendor, specialties]) => {
      specialties.forEach(specialty => {
        const specialtyKey = `${specialty.specialty}:${specialty.vendor}`.toLowerCase();
        
        // Check if specialty is unmapped and not processed
        const isUnmapped = !mappedSpecialtyKeys.has(specialtyKey);
        const isUnprocessed = !processedSpecialties.has(specialtyKey);
        const isNotTarget = !processedAsTarget.has(specialtyKey.split(':')[0]); // Compare just the specialty name

        if (isUnmapped && isUnprocessed && isNotTarget) {
          // Find potential matches
          const suggestions = findPotentialMatches(specialty);
          
          // Filter out matches that are already mapped or processed
          const validMatches = suggestions.suggestedMatches.filter(match => {
            const matchKey = `${match.specialty.specialty}:${match.specialty.vendor}`.toLowerCase();
            const matchName = match.specialty.specialty.toLowerCase();
            
            const isMatchUnmapped = !mappedSpecialtyKeys.has(matchKey);
            const isMatchUnprocessed = !processedSpecialties.has(matchKey);
            
            if (isMatchUnmapped && isMatchUnprocessed) {
              // Mark this specialty as processed as a target
              processedAsTarget.add(matchName);
              return true;
            }
            return false;
          });

          if (validMatches.length > 0) {
            newMappings.push({
              sourceSpecialty: specialty,
              matches: validMatches
            });
            
            // Mark this specialty as processed
            processedSpecialties.add(specialtyKey);
          }
        }
      });
    });

    setAllAutoMappings(newMappings);
  }, [specialtiesByVendor, mappedGroups, findPotentialMatches]);

  // Update useEffect hooks to prevent infinite loops
  useEffect(() => {
    console.log('🔄 Initializing auto mappings');
    generateAllMappings();
  }, [mappedGroups]); // Only depend on mappedGroups

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
    console.log('👥 Processing auto mappings updates:', allAutoMappings);
    
    allAutoMappings.forEach(mapping => {
      const allMatchesHandled = mapping.matches.every(m => m.status === 'approved' || m.status === 'rejected');
      const approvedMatches = mapping.matches.filter(m => m.status === 'approved');

      console.log('Processing mapping:', {
        sourceSpecialty: mapping.sourceSpecialty.specialty,
        allMatchesHandled,
        approvedMatchesCount: approvedMatches.length
      });

      if (allMatchesHandled && approvedMatches.length > 0) {
        console.log('✅ Creating new mapping group for:', mapping.sourceSpecialty.specialty);
        
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

        console.log('✅ Mapping group created successfully');
      }
    });
  }, [allAutoMappings, onMappingChange]);

  // Filter mappings based on search
  const filteredMappings = useMemo(() => {
    console.log('Filtering mappings with search:', debouncedSearchQuery);
    
    // Get all mapped specialties
    const mappedSpecialtyKeys = new Set(
      mappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}:${s.vendor}`)
      )
    );

    // First filter out any mappings where the source specialty is already mapped
    let mappingsToShow = allAutoMappings.filter(mapping => {
      const sourceKey = `${mapping.sourceSpecialty.specialty}:${mapping.sourceSpecialty.vendor}`;
      return !mappedSpecialtyKeys.has(sourceKey);
    });

    // Then filter out any matches that are already mapped
    mappingsToShow = mappingsToShow.map(mapping => ({
      sourceSpecialty: mapping.sourceSpecialty,
      matches: mapping.matches.filter(match => {
        const matchKey = `${match.specialty.specialty}:${match.specialty.vendor}`;
        return !mappedSpecialtyKeys.has(matchKey);
      })
    }));

    // Remove any mappings that no longer have matches
    mappingsToShow = mappingsToShow.filter(mapping => mapping.matches.length > 0);

    // Then apply search filter if there's a search query
    if (debouncedSearchQuery) {
      const searchTerm = debouncedSearchQuery.toLowerCase();
      mappingsToShow = mappingsToShow.filter(mapping => {
        // Check if source specialty matches
        if (mapping.sourceSpecialty.specialty.toLowerCase().includes(searchTerm)) {
        return true;
      }
      
        // Check if any matches contain the search term
        return mapping.matches.some(match => 
          match.specialty.specialty.toLowerCase().includes(searchTerm)
        );
      });
    }

    return mappingsToShow;
  }, [allAutoMappings, debouncedSearchQuery, mappedGroups]);

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
      toast("Please select a specialty first");
      return;
    }

    // Use pendingSynonym if available, otherwise use newSynonym
    const synonym = (pendingSynonym || newSynonym).trim();
    if (!synonym) {
      toast("Please enter a synonym");
      return;
    }

    // Find the specialty object
    const specialtyObj = allSpecialties.find(s => s.name === selectedSpecialtyForSynonyms);
    if (!specialtyObj) {
      toast("Selected specialty not found");
      return;
    }

    // Check if it's already a synonym for this specialty
    const existingSynonyms = [
      ...specialtyObj.synonyms.predefined,
      ...specialtyObj.synonyms.custom
    ];
    
    if (existingSynonyms.includes(synonym)) {
      toast(`"${synonym}" is already a synonym for "${specialtyObj.name}"`);
      return;
    }

    // Check if it's used by another specialty
    const otherSpecialty = allSpecialties.find(s => 
      s.id !== specialtyObj.id && (
        s.name === synonym ||
        s.synonyms.predefined.includes(synonym) ||
        s.synonyms.custom.includes(synonym)
      )
    );

    if (otherSpecialty) {
      const isPredefined = otherSpecialty.synonyms.predefined.includes(synonym);
      toast(
        `Mapping Already Defined: "${synonym}" is already ${
          otherSpecialty.name === synonym 
            ? "a specialty name" 
            : `a ${isPredefined ? 'predefined' : 'custom'} synonym for "${otherSpecialty.name}"`
        }`
      );
      return;
    }

    // Add to specialty manager
    const result = specialtyManager.addSynonym(specialtyObj.id, synonym);
    
    if (result.success) {
      // Update local state - ensure no duplicates are added
      setCurrentSynonyms(prev => {
        // Check if the synonym already exists in either array to prevent duplicates
        if (prev.predefined.includes(synonym) || prev.custom.includes(synonym)) {
          return prev; // Return unchanged state if already exists
        }
        
        return {
          ...prev,
          custom: [...prev.custom, synonym]
        };
      });
      
      // Clear both inputs
      setNewSynonym('');
      setPendingSynonym('');
      toast(`Added synonym: ${synonym}`);
      
      // Refresh stats and specialties list to maintain data integrity
      getSpecialtyStats();
      loadSpecialties(); // Reload all specialties to ensure UI is in sync with backend
    } else {
      // Display the specific error message from specialtyManager
      toast(result.message || "Failed to add synonym. Please try again.");
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
      const specialty = allSpecialties.find(s => s.name === selectedSpecialtyForSynonyms);
      if (specialty) {
        // Update both predefined and custom synonyms using the correct interface
        specialtyManager.updateSpecialtySynonyms(specialty.id, currentSynonyms);
        
        // Refresh the specialties list
        const loadedSpecialties = specialtyManager.getAllSpecialties().map(convertToSpecialtyWithStats);
        setAllSpecialties(loadedSpecialties);
        setSearchResults(loadedSpecialties);
        
        // Update stats and close modal
        getSpecialtyStats();
        setShowSynonymModal(false);
        toast.success('Synonyms updated successfully');
      }
    }
  };

  const handleAddToSynonyms = (specialtyName: string): void => {
    setShowSynonymModal(true);
    setPendingSynonym(specialtyName);
    setSelectedSpecialtyForSynonyms("");
    setCurrentSynonyms({
      predefined: [],
      custom: []
    });
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
    // Only refresh predefined synonyms on initial mount
    const hasInitialized = localStorage.getItem('synonyms_initialized');
    if (!hasInitialized) {
      specialtyManager.refreshPredefinedSynonyms();
      localStorage.setItem('synonyms_initialized', 'true');
    }
    
    // Load all specialties with stats
    const loadedSpecialties = specialtyManager.getAllSpecialties().map(convertToSpecialtyWithStats);
    
    // Update state with properly typed specialties
    setAllSpecialties(loadedSpecialties);
    setSearchResults(loadedSpecialties);
    
    // Initialize specialty stats
    getSpecialtyStats();
  }, []); // Empty dependency array since this should only run once on mount

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
    
    const addedSpecialty = specialtyManager.addSpecialty(newSpecialtyName.trim());
    
    if (addedSpecialty) {
      const specialtyWithStats = convertToSpecialtyWithStats(addedSpecialty);
      setAllSpecialties(prev => [...prev, specialtyWithStats]);
      setSelectedSpecialty(specialtyWithStats);
      setNewSpecialtyName("");
      toast.success(`Added new specialty: ${addedSpecialty.name}`);
      getSpecialtyStats();
    } else {
      toast.error("Failed to add specialty. It may already exist.");
    }
  };

  // Handle saving mappings
  const handleSave = () => {
    if (onSave) {
      const mappings: Record<string, string[]> = {};
      allSpecialties.forEach(specialty => {
        mappings[specialty.name] = [
          ...specialty.synonyms.predefined,
          ...specialty.synonyms.custom,
        ];
      });
      onSave(mappings);
    }
  };

  // Update the loadSpecialties function to properly convert Specialty to SpecialtyWithStats
  const loadSpecialties = useCallback(() => {
    const loadedSpecialties = specialtyManager.getAllSpecialties()
      .map(convertToSpecialtyWithStats);
    setAllSpecialties(loadedSpecialties);
    setSearchResults(loadedSpecialties);
  }, []);

  // Update useEffect to call loadSpecialties
  useEffect(() => {
    loadSpecialties();
  }, [loadSpecialties]);

  // Update the handleSearch function to properly convert Specialty to SpecialtyWithStats
  const handleSearch = (value: string) => {
    setSpecialtySearch(value);
    setSelectedSpecialty(null);
    setCurrentSynonyms({ predefined: [], custom: [] });
    
    // Filter and convert specialties
    const filtered = specialtyManager.getAllSpecialties()
      .filter(s => s.name.toLowerCase().includes(value.toLowerCase()))
      .map(convertToSpecialtyWithStats);
    setSearchResults(filtered);
  };

  // Update search results when modal opens
  useEffect(() => {
    if (showSynonymModal && allSpecialties.length > 0) {
      const convertedSpecialties = allSpecialties.map(convertToSpecialtyWithStats);
      setSearchResults(convertedSpecialties);
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
  const handleDeleteSpecialty = async (specialty: SpecialtyWithStats) => {
    const success = await specialtyManager.deleteSpecialty(specialty.id);
    if (success) {
      // Update the local state
      setAllSpecialties(prev => prev.filter(s => s.id !== specialty.id));
      if (selectedSpecialty?.id === specialty.id) {
        setSelectedSpecialty(null);
      }
      // Show success toast
      toast.success(`Successfully deleted ${specialty.name}`);
      // Close the delete dialog
      setShowDeleteDialog(false);
      setSpecialtyToDelete(null);
    } else {
      // Show error toast
      toast.error("Failed to delete specialty");
    }
  };

  const handleConfirmDelete = () => {
    if (specialtyToDelete) {
      handleDeleteSpecialty(specialtyToDelete);
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

  const handleSynonymModalClose = () => {
    setShowSynonymModal(false);
    setPendingSynonym("");
  };

  const modalRef = useRef<HTMLDivElement>(null);

  const handleAddNewSpecialty = (name: string) => {
    const newSpecialty = specialtyManager.addSpecialty(name);
    if (newSpecialty) {
      const specialtyWithStats = convertToSpecialtyWithStats(newSpecialty);
      setAllSpecialties(prev => [...prev, specialtyWithStats]);
      setSelectedSpecialty(specialtyWithStats);
      setNewSpecialtyName("");
      toast.success(`Added new specialty: ${name}`);
    } else {
      toast.error('Failed to add specialty');
    }
    setShowNewSpecialtyDialog(false);
  };

  const handleDeleteClick = (specialty: SpecialtyWithStats) => {
    setSpecialtyToDelete(specialty);
    setShowDeleteDialog(true);
  };

  return (
    <div className="flex flex-col h-full">
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
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowSynonymModal(true)}
                        className={`px-4 py-2 text-sm font-medium rounded-l
                          bg-white text-gray-700 hover:bg-gray-50 border border-gray-300`}
                      >
                        Manage Mappings
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add and manage specialty mappings and variations</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Automatically find and suggest specialty matches</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('manual')}
                        className={`px-4 py-2 text-sm font-medium border-y
                          ${viewMode === 'manual'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                      >
                        Manual Map Mode
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Manually map specialties across vendors</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode('mapped')}
                        className={`px-4 py-2 text-sm font-medium rounded-r-lg border
                          ${viewMode === 'mapped'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300'}`}
                      >
                        View Mapped
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Review and manage existing specialty mappings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Status and Actions Group */}
              <div className="ml-4 flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Current mapping progress status</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setShowClearConfirmation(true)}
                        className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium
                          bg-white text-red-600 hover:bg-red-50 border border-red-200
                          transition-colors duration-150 ease-in-out shadow-sm"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1.5" />
                        Clear All Mappings
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove all specialty mappings</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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

      {/* New Specialty Dialog */}
      <Dialog open={showNewSpecialtyDialog} onOpenChange={setShowNewSpecialtyDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Add New Specialty</DialogTitle>
            <DialogDescription>
              Enter the name of the new specialty to add to the list.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="specialty-name">Specialty Name</Label>
              <Input
                id="specialty-name"
                placeholder="Enter specialty name..."
                value={newSpecialtyName}
                onChange={(e) => setNewSpecialtyName(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewSpecialtyName("");
                setShowNewSpecialtyDialog(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => {
                if (newSpecialtyName.trim()) {
                  handleAddNewSpecialty(newSpecialtyName.trim());
                  setNewSpecialtyName("");
                  setShowNewSpecialtyDialog(false);
                }
              }}
              disabled={!newSpecialtyName.trim()}
            >
              Add Specialty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Synonym Management Modal */}
      <AnimatePresence>
        {showSynonymModal && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSynonymModalClose}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div 
                className="fixed w-[900px] max-h-[85vh] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
                style={{ 
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                ref={modalRef}
              >
                {/* Windows-style draggable title bar */}
                <div 
                  className="px-4 py-3 border-b border-gray-200 bg-gradient-to-b from-gray-100 to-gray-50 cursor-move select-none flex-shrink-0"
                  onMouseDown={(e) => {
                    if (!modalRef.current) return;
                    e.preventDefault();
                    
                    const modal = modalRef.current;
                    const rect = modal.getBoundingClientRect();
                    
                    // Calculate the actual position considering the transform
                    const startLeft = rect.left;
                    const startTop = rect.top;
                    
                    // Calculate offset relative to the mouse position
                    const offsetX = e.clientX - startLeft;
                    const offsetY = e.clientY - startTop;
                    
                    // Set initial position before removing transform
                    modal.style.left = `${startLeft}px`;
                    modal.style.top = `${startTop}px`;
                    modal.style.transform = 'none';
                    
                    function onMouseMove(e: MouseEvent) {
                      if (!modal) return;
                      const x = e.clientX - offsetX;
                      const y = e.clientY - offsetY;
                      modal.style.left = `${x}px`;
                      modal.style.top = `${y}px`;
                    }
                    
                    function onMouseUp() {
                      document.removeEventListener('mousemove', onMouseMove);
                      document.removeEventListener('mouseup', onMouseUp);
                    }
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Manage Specialty Mappings
                      </h2>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {pendingSynonym 
                          ? `Select a specialty to map "${pendingSynonym}"`
                          : "Add, edit, or remove specialty mappings and variations."}
                      </p>
                    </div>
                    <button
                      onClick={handleSynonymModalClose}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
            </div>

                <div className="flex divide-x divide-gray-200 flex-1 min-h-0 overflow-hidden">
                  {/* Left side - Specialty List */}
                  <div className="w-1/2 flex flex-col overflow-hidden">
                    <div className="p-4 flex-shrink-0">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input
                            placeholder="Search specialties..."
                            value={specialtySearch}
                            onChange={(e) => handleSearch(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1 whitespace-nowrap"
                          onClick={() => setShowNewSpecialtyDialog(true)}
                        >
                          <PlusIcon className="h-4 w-4" />
                          New
                        </Button>
                      </div>
                    </div>

                    <div className="px-4 pb-4 flex-1 overflow-hidden">
                      <div className="border border-gray-200 rounded-lg bg-gray-50/50 h-[500px] overflow-y-auto">
                        <div className="p-2 space-y-1">
                          {getFilteredSpecialties().map((specialty) => (
                            <div
                              key={specialty.id}
                              className="group flex items-center gap-2 w-full"
                            >
                              <button
                                onClick={() => handleSpecialtySelect(specialty.name)}
                                className={cn(
                                  "flex-1 text-left px-3 py-2 rounded-md transition-all text-sm",
                                  selectedSpecialtyForSynonyms === specialty.name
                                    ? "bg-blue-50 text-blue-700"
                                    : "hover:bg-gray-50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium truncate">{specialty.name}</span>
                                  <div className="flex gap-1 flex-shrink-0">
                                    {specialty.synonyms.predefined.length > 0 && (
                                      <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                        {specialty.synonyms.predefined.length}
                                      </Badge>
                                    )}
                                    {specialty.synonyms.custom.length > 0 && (
                                      <Badge variant="secondary" className="bg-purple-50 text-purple-700 border-purple-200">
                                        {specialty.synonyms.custom.length}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover:opacity-100 p-1"
                                onClick={() => handleDeleteClick(specialty)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Synonym Management */}
                  <div className="w-1/2 flex flex-col overflow-hidden">
                    <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
                      {/* Add New Synonym */}
                      <div className="space-y-2 flex-shrink-0">
                        {pendingSynonym ? (
                          <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                            <span className="text-sm text-blue-700">Ready to add: <strong>{pendingSynonym}</strong></span>
                            <button
                              onClick={() => setPendingSynonym("")}
                              className="p-1 hover:bg-blue-100 rounded"
                            >
                              <XMarkIcon className="h-4 w-4 text-blue-700" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter new synonym..."
                              value={newSynonym}
                              onChange={(e) => setNewSynonym(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              onClick={handleAddSynonym}
                              disabled={!newSynonym.trim() || !selectedSpecialtyForSynonyms}
                              size="sm"
                              className="bg-blue-600 text-white hover:bg-blue-700"
                            >
                              Add
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Synonyms List */}
                      <div className="flex-1 overflow-hidden border border-gray-200 rounded-lg">
                        <ScrollArea className="h-full">
                          <div className="p-3 space-y-1">
                            {selectedSpecialtyForSynonyms && currentSynonyms && (
                              <>
                                {currentSynonyms.predefined.length > 0 && (
                                  <div className="mb-2">
                                    <h4 className="text-xs font-medium text-gray-500 mb-1">Predefined</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {currentSynonyms.predefined.map((synonym, index) => (
                                        <Badge
                                          key={`predefined-${index}`}
                                          variant="secondary"
                                          className="bg-blue-50 text-blue-700 border border-blue-200 pl-2 pr-1 py-0.5 flex items-center gap-1"
                                        >
                                          {synonym}
                                          <button
                                            onClick={() => handleRemoveSynonym(synonym)}
                                            className="hover:bg-blue-100 rounded p-0.5"
                                          >
                                            <XMarkIcon className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {currentSynonyms.custom.length > 0 && (
                                  <div>
                                    <h4 className="text-xs font-medium text-gray-500 mb-1">Custom</h4>
                                    <div className="flex flex-wrap gap-1.5">
                                      {currentSynonyms.custom.map((synonym, index) => (
                                        <Badge
                                          key={`custom-${index}`}
                                          variant="secondary"
                                          className="bg-purple-50 text-purple-700 border border-purple-200 pl-2 pr-1 py-0.5 flex items-center gap-1"
                                        >
                                          {synonym}
                                          <button
                                            onClick={() => handleRemoveSynonym(synonym)}
                                            className="hover:bg-purple-100 rounded p-0.5"
                                          >
                                            <XMarkIcon className="h-3 w-3" />
                                          </button>
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-4 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-2 flex-shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSynonymModalClose}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  {pendingSynonym ? (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (selectedSpecialtyForSynonyms && pendingSynonym) {
                          handleAddSynonym();
                          setPendingSynonym("");
                        }
                      }}
                      disabled={!selectedSpecialtyForSynonyms}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Add to Selected Specialty
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handleSaveSynonyms}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </React.Fragment>
        )}
      </AnimatePresence>

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
                        const [vendor, ...specialtyParts] = key.split(':');
                        // Join back the specialty parts to handle cases where specialty name contains colons
                        const specialty = specialtyParts.join(':');
                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 shadow-sm hover:bg-gray-50"
                          >
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {specialtiesByVendor[vendor]?.find(s => s.specialty === specialty)?.specialty || specialty}
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
                                  const loadedSpecialties = specialtyManager.getAllSpecialties().map(convertToSpecialtyWithStats);
                                  setAllSpecialties(loadedSpecialties);
                                  specialty = convertToSpecialtyWithStats(newSpecialty);
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
                                const updatedSpecialties = specialtyManager.getAllSpecialties().map(convertToSpecialtyWithStats);
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

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[425px] bg-white">
          <DialogHeader>
            <DialogTitle>Delete Specialty</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{specialtyToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHelpModal} onOpenChange={setShowHelpModal}>
        <DialogContent className="sm:max-w-[800px] bg-white max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
              How to Use Specialty Mapping Studio
            </DialogTitle>
            <DialogDescription>
              A comprehensive guide to mapping medical specialties across different survey vendors
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[calc(90vh-180px)] pr-6">
            <div className="space-y-6">
              {/* Auto-Mapping System */}
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">Auto-Mapping System</h3>
                <div className="space-y-4 text-gray-600">
                  <p>The auto-mapping system uses pattern matching and text analysis to identify potential specialty matches across different vendors:</p>
                  
                  <div className="pl-4 space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Match Detection</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Exact String Matches: Direct specialty name comparisons</li>
                        <li>Synonym Database: Using predefined and custom synonyms</li>
                        <li>Text Analysis: Basic prefix, suffix, and acronym detection</li>
                        <li>String Similarity: Fuzzy matching for close variations</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">Confidence Score Calculation</h4>
                      <p>Confidence scores (0-1) indicate match quality:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><span className="font-medium">1.0 (Exact Match)</span>: Perfect string match or known synonym match</li>
                        <li><span className="font-medium">0.95 (High)</span>: Known variations or predefined specialty patterns</li>
                        <li><span className="font-medium">0.8-0.94 (Strong)</span>: Strong similarity or partial pattern match</li>
                        <li><span className="font-medium">0.6-0.79 (Moderate)</span>: Moderate similarity or potential match</li>
                        <li><span className="font-medium">&lt;0.6 (Low)</span>: Not shown in suggestions</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Special Cases</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Critical Care specialties receive additional pattern matching</li>
                        <li>Vendor-specific naming patterns are considered</li>
                        <li>Common medical abbreviations are recognized</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Synonym Management System */}
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">Synonym Management System</h3>
                <div className="space-y-4 text-gray-600">
                  <p>The synonym system helps maintain consistent specialty mapping through three types of synonyms:</p>
                  
                  <div className="pl-4 space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900">Predefined Synonyms</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>System-provided standard specialty variations</li>
                        <li>Based on industry-standard terminology</li>
                        <li>Example: "Otorhinolaryngology" → ["ENT", "Ear Nose and Throat"]</li>
                        <li>Cannot be deleted but can be temporarily disabled</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">Custom Synonyms</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>User-defined specialty variations</li>
                        <li>Organization-specific terminology</li>
                        <li>Can be added, edited, or removed</li>
                        <li>Syncs across all mapping sessions</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-900">Learned Synonyms</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Automatically generated from approved mappings</li>
                        <li>Based on historical mapping decisions</li>
                        <li>Improves with continued use</li>
                        <li>Can be promoted to custom synonyms</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900">Synonym Rules</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Each specialty name can only be a synonym for one primary specialty</li>
                        <li>Synonyms are bi-directional (A → B means B → A)</li>
                        <li>Transitive relationships are automatically applied (if A → B and B → C, then A → C)</li>
                        <li>Conflicts are prevented during synonym addition</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Best Practices */}
              <div>
                <h3 className="text-lg font-semibold text-blue-700 mb-2">Best Practices</h3>
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Auto-Mapping</h4>
                  <ul className="list-disc pl-4 space-y-1 text-gray-600">
                    <li>Review high-confidence matches (0.95+) first</li>
                    <li>Use "Accept All" for groups of high-confidence matches</li>
                    <li>Manually verify moderate confidence matches (0.6-0.79)</li>
                    <li>Consider adding custom synonyms for recurring variations</li>
                  </ul>

                  <h4 className="font-medium text-gray-900 mt-3">Synonym Management</h4>
                  <ul className="list-disc pl-4 space-y-1 text-gray-600">
                    <li>Add custom synonyms for organization-specific terms</li>
                    <li>Review and validate learned synonyms regularly</li>
                    <li>Document synonym decisions for consistency</li>
                    <li>Use the synonym search to check existing mappings</li>
                  </ul>

                  <h4 className="font-medium text-gray-900 mt-3">Manual Mapping</h4>
                  <ul className="list-disc pl-4 space-y-1 text-gray-600">
                    <li>Use for complex specialty relationships</li>
                    <li>Create single-source mappings when needed</li>
                    <li>Document mapping decisions in notes</li>
                    <li>Review mappings periodically for accuracy</li>
                  </ul>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="flex-shrink-0 mt-6">
            <Button onClick={() => setShowHelpModal(false)}>
              Got it, thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add the autoMapSuggestions UI here */}
      {autoMapSuggestions && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Suggested Matches for "{autoMapSuggestions.sourceSpecialty.specialty}"
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                  {autoMapSuggestions.sourceSpecialty.vendor}
                </span>
              </h3>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => acceptAllMatches(autoMapSuggestions, 0.9)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Accept All Matches ({autoMapSuggestions.suggestedMatches.filter(m => m.confidence >= 0.9).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAutoMapSuggestions(null)}
                  className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
          <div className="px-6 py-4 max-h-96 overflow-y-auto">
            <div className="space-y-3">
              {autoMapSuggestions.suggestedMatches.map((match, index) => (
                <div 
                  key={`${match.specialty.vendor}:${match.specialty.specialty}`}
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    match.confidence >= 0.9 
                      ? 'border-green-200 bg-green-50' 
                      : match.confidence >= 0.7 
                        ? 'border-yellow-200 bg-yellow-50' 
                        : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">{match.specialty.specialty}</span>
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                        {match.specialty.vendor}
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-500 flex items-center">
                      <span className={`inline-block w-16 text-xs font-medium ${
                        match.confidence >= 0.9 ? 'text-green-600' : 
                        match.confidence >= 0.7 ? 'text-yellow-600' : 'text-gray-500'
                      }`}>
                        {Math.round(match.confidence * 100)}% match
                      </span>
                      <span className="ml-2">{match.reason}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Add to synonyms
                        if (selectedSpecialtyForSynonyms) {
                          handleAddSynonym();
                        } else {
                          handleAddToSynonyms(match.specialty.specialty);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                    >
                      Add to Synonyms
                    </button>
                    <button
                      type="button"
                      onClick={() => acceptSuggestedMatches(autoMapSuggestions, [match])}
                      className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Accept Match
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtyMappingStudio; 
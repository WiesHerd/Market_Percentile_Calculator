"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { MagnifyingGlassIcon, ArrowsRightLeftIcon, XMarkIcon, CheckIcon, CheckCircleIcon, ArrowPathIcon, PlusIcon, InformationCircleIcon, ChevronDownIcon, ChevronUpIcon, ChevronRightIcon, ComputerDesktopIcon, Cog6ToothIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
}

interface MappedGroup {
  id: string;
  specialties: SpecialtyData[];
  createdAt: Date;
  notes?: string;
  isSingleSource: boolean;
}

interface SpecialtyMappingStudioProps {
  surveys: Array<{
    id: string;
    vendor: string;
    data: any[];
  }>;
  onMappingChange?: (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => void;
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

// Add at the top of the file, after imports
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
);

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 mb-4">
          Something went wrong. Please try refreshing the page.
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Page
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

// Update the main component
const SpecialtyMappingStudio: React.FC<SpecialtyMappingStudioProps> = (props) => {
  return (
    <ErrorBoundary>
      <SpecialtyMappingStudioContent {...props} />
    </ErrorBoundary>
  );
};

const SpecialtyMappingStudioContent: React.FC<SpecialtyMappingStudioProps> = ({
  surveys,
  onMappingChange,
  onSave,
  initialMappings,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load initial data
        if (surveys.length > 0) {
          const surveyId = surveys[0].id;
          const response = await fetch(`/api/surveys/${surveyId}`);
          
          if (!response.ok) {
            throw new Error('Failed to load survey data');
          }

          const data = await response.json();
          // Initialize your state with the loaded data
          // ... your existing initialization code ...
        }
      } catch (err) {
        console.error('Error initializing component:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    initializeComponent();
  }, [surveys]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  // Your existing component JSX
  return (
    <div className="h-full flex flex-col">
      {/* Your existing content */}
    </div>
  );
};

export default SpecialtyMappingStudio; 
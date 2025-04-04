'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChartBarIcon, ArrowUpTrayIcon, DocumentTextIcon, ExclamationCircleIcon, CheckCircleIcon, XCircleIcon, DocumentChartBarIcon, ArrowPathIcon, CheckIcon, TableCellsIcon, ArrowDownTrayIcon, UserGroupIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';
import Papa, { ParseResult, ParseError as PapaParseError } from 'papaparse';
import Select, { MultiValue, StylesConfig } from 'react-select';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formatCurrency, formatNumber } from '@/utils/formatting';
import { calculateStringSimilarity } from '@/utils/string';
import SpecialtyMappingStudio from '@/components/SpecialtyMappingStudio';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Link from 'next/link';
import { Dialog } from '@headlessui/react';
import { SpecialtyProgressDisplay } from '@/components/SpecialtyProgressDisplay';
import { SpecialtyMappingTest } from '@/components/SpecialtyMappingTest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Utility function to format vendor names with vendor map
const formatVendorName = (vendor: string): string => {
  const vendorMap: Record<string, string> = {
    'MGMA': 'MGMA',
    'GALLAGHER': 'Gallagher',
    'SULLIVANCOTTER': 'SullivanCotter',
    'SULLIVAN': 'SullivanCotter',
    'SULLIVAN COTTER': 'SullivanCotter',
    'SULLIVAN-COTTER': 'SullivanCotter',
    'ECG': 'ECG Management',
    'AAMGA': 'AAMGA',
    'MERRIT_HAWKINS': 'Merrit Hawkins'
  };
  // If it's a custom survey, return the custom name
  if (vendor.startsWith('CUSTOM:')) {
    return vendor.replace('CUSTOM:', '');
  }
  return vendorMap[vendor.toUpperCase()] || vendor.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
};

interface ColumnMappingMetric {
  p25: string;
  p50: string;
  p75: string;
  p90: string;
}

interface ColumnMapping {
  specialty: string;
  provider_type: string;
  geographic_region: string;
  n_orgs: string;
  n_incumbents: string;
  tcc: ColumnMappingMetric;
  wrvu: ColumnMappingMetric;
  cf: ColumnMappingMetric;
}

interface MappingTemplate {
  id: string;
  name: string;
  vendor: string;
  year: string;
  mapping: ColumnMapping;
  lastUsed: string;
}

interface SpecialtyMapping {
  mappedSpecialties: string[];
  notes?: string;
  resolved?: boolean;
  isSingleSource?: boolean;
  confidence?: number;
}

interface MappingState {
  [specialty: string]: SpecialtyMapping;
}

interface ValidationError {
  sourceSpecialty: string;
  error: string;
}

interface AggregatedData {
  specialty: string;
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
}

interface ParseError {
  message: string;
  type?: string;
  code?: string;
  row?: number;
}

interface PreviewRow {
  [key: string]: string | number;
}

interface SurveyData {
  id: string;
  vendor: string;
  year: string;
  data: PreviewRow[];
  columnMappings?: ColumnMapping;
  columns?: string[];
  specialtyMappings?: MappingState;
  mappingProgress?: number;
}

// Add new interface for select options
interface SelectOption {
  value: string;
  label: string;
}

// Remove the duplicate ParseError interface and update the patterns type
interface VendorPatterns {
  required: string[];
  patterns: {
    specialty: RegExp;
    provider_type: RegExp;
    geographic_region: RegExp;
    n_orgs: RegExp;
    n_incumbents: RegExp;
    tcc: {
      base: RegExp;
      p25: RegExp;
      p50: RegExp;
      p75: RegExp;
      p90: RegExp;
    };
    wrvu: {
      base: RegExp;
      p25: RegExp;
      p50: RegExp;
      p75: RegExp;
      p90: RegExp;
    };
    cf: {
      base: RegExp;
      p25: RegExp;
      p50: RegExp;
      p75: RegExp;
      p90: RegExp;
    };
  };
}

const SURVEY_PATTERNS: { [key: string]: VendorPatterns } = {
  'MGMA': {
    required: ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'],
    patterns: {
      specialty: /^(specialty|specialties|specialty.*type|specialty.*category|provider.*specialty)$/i,
      provider_type: /^(provider.*type|physician.*type|role|position.*type|job.*title|title|position|provider.*role|physician.*role|staff.*type|staff.*role|employment.*type|employment.*role)$/i,
      geographic_region: /region|geographic|geography|location|market|area|territory/i,
      n_orgs: /n.*orgs|num.*org|organizations|org.*count|reporting.*orgs|participants/i,
      n_incumbents: /n.*incumbents|num.*incumbents|incumbents|individuals|respondents|physicians|providers/i,
      tcc: {
        base: /compensation|salary|total|cash|tcc|tc/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      },
      wrvu: {
        base: /rvu|production|volume|work|wrvu|wvu/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      },
      cf: {
        base: /rate|factor|per|conversion|cf/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      }
    }
  },
  'SULLIVANCOTTER': {
    required: ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'],
    patterns: {
      specialty: /^(specialty|specialties|specialty.*type|specialty.*category|provider.*specialty)$/i,
      provider_type: /^(provider.*type|physician.*type|role|position.*type|job.*title|title|position|provider.*role|physician.*role|staff.*type|staff.*role|employment.*type|employment.*role)$/i,
      geographic_region: /region|geographic|geography|location|market|area|territory/i,
      n_orgs: /n.*orgs|num.*org|organizations|org.*count|reporting.*orgs|participants/i,
      n_incumbents: /n.*incumbents|num.*incumbents|incumbents|individuals|respondents|physicians|providers/i,
      tcc: {
        base: /compensation|salary|total|cash|tcc|tc/i,
        p25: /p25|25th|25%|_25$|tcc25/i,
        p50: /p50|50th|50%|_50$|median|tcc50/i,
        p75: /p75|75th|75%|_75$|tcc75/i,
        p90: /p90|90th|90%|_90$|tcc90/i
      },
      wrvu: {
        base: /rvu|production|volume|work|wrvu|wvu/i,
        p25: /p25|25th|25%|_25$|wrvu25/i,
        p50: /p50|50th|50%|_50$|median|wrvu50/i,
        p75: /p75|75th|75%|_75$|wrvu75/i,
        p90: /p90|90th|90%|_90$|wrvu90/i
      },
      cf: {
        base: /rate|factor|per|conversion|cf/i,
        p25: /p25|25th|25%|_25$|cf25/i,
        p50: /p50|50th|50%|_50$|median|cf50/i,
        p75: /p75|75th|75%|_75$|cf75/i,
        p90: /p90|90th|90%|_90$|cf90/i
      }
    }
  },
  'GALLAGHER': {
    required: ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'],
    patterns: {
      specialty: /^(specialty|specialties|specialty.*type|specialty.*category|provider.*specialty)$/i,
      provider_type: /^(provider.*type|physician.*type|role|position.*type|job.*title|title|position|provider.*role|physician.*role|staff.*type|staff.*role|employment.*type|employment.*role)$/i,
      geographic_region: /region|geographic|geography|location|market|area|territory/i,
      n_orgs: /n.*orgs|num.*org|organizations|org.*count|reporting.*orgs|participants/i,
      n_incumbents: /n.*incumbents|num.*incumbents|incumbents|individuals|respondents|physicians|providers/i,
      tcc: {
        base: /compensation|salary|total|cash|tcc|tc/i,
        p25: /p25|25th|25%|_25$|tcc25/i,
        p50: /p50|50th|50%|_50$|median|tcc50/i,
        p75: /p75|75th|75%|_75$|tcc75/i,
        p90: /p90|90th|90%|_90$|tcc90/i
      },
      wrvu: {
        base: /rvu|production|volume|work|wrvu|wvu/i,
        p25: /p25|25th|25%|_25$|wrvu25/i,
        p50: /p50|50th|50%|_50$|median|wrvu50/i,
        p75: /p75|75th|75%|_75$|wrvu75/i,
        p90: /p90|90th|90%|_90$|wrvu90/i
      },
      cf: {
        base: /rate|factor|per|conversion|cf/i,
        p25: /p25|25th|25%|_25$|cf25/i,
        p50: /p50|50th|50%|_50$|median|cf50/i,
        p75: /p75|75th|75%|_75$|cf75/i,
        p90: /p90|90th|90%|_90$|cf90/i
      }
    }
  },
  'CUSTOM': {
    required: ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'],
    patterns: {
      specialty: /^(specialty|specialties|specialty.*type|specialty.*category|provider.*specialty)$/i,
      provider_type: /^(provider.*type|physician.*type|role|position.*type|job.*title|title|position|provider.*role|physician.*role|staff.*type|staff.*role|employment.*type|employment.*role)$/i,
      geographic_region: /region|geographic|geography|location|market|area|territory/i,
      n_orgs: /n.*orgs|num.*org|organizations|org.*count|reporting.*orgs|participants/i,
      n_incumbents: /n.*incumbents|num.*incumbents|incumbents|individuals|respondents|physicians|providers/i,
      tcc: {
        base: /compensation|salary|total|cash|tcc|tc/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      },
      wrvu: {
        base: /rvu|production|volume|work|wrvu|wvu/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      },
      cf: {
        base: /rate|factor|per|conversion|cf/i,
        p25: /p25|25th|25%|_25$/i,
        p50: /p50|50th|50%|_50$|median/i,
        p75: /p75|75th|75%|_75$/i,
        p90: /p90|90th|90%|_90$/i
      }
    }
  }
};

// Update the interface for uploaded surveys
interface UploadedSurvey {
  id: string;
  vendor: string;
  year: string;
  data: PreviewRow[];
  columnMappings: ColumnMapping;
  specialtyMappings: MappingState;
  columns: string[];
  mappingProgress?: number;
}

interface UnmappedSpecialty {
  specialty: string;
  vendor: string;
}

interface SpecialtyMatch {
  specialty: string;
  vendor: string;
  confidence: number;
}

// Add this function before the SurveyManagementPage component
function getLocalStorageSize() {
  let totalSize = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      totalSize += (localStorage[key].length * 2) / 1024 / 1024; // Size in MB
    }
  }
  return totalSize.toFixed(2);
}

interface DBSurvey {
  id: string;
  vendor: string;
  year: string;
  data: any[];
  mappings: ColumnMapping;
  specialtyMappings: MappingState;
  columns: string[];
  mappingProgress?: number;
  updatedAt: string;
}

// Add YearPicker component
function YearPicker({ value, onChange }: { value: string, onChange: (year: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [decade, setDecade] = useState(Math.floor(new Date().getFullYear() / 10) * 10);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const years = Array.from({ length: 12 }, (_, i) => decade + i - 1);

  return (
    <div className="relative" ref={pickerRef}>
      <div className="flex flex-col space-y-1">
        <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
          Survey Year
        </label>
        <button
          type="button"
          id="year-select"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full h-[38px] px-3 py-2
            text-left text-sm
            rounded-lg border border-gray-300
            focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600
            ${value ? 'text-gray-900 bg-white' : 'text-gray-500 bg-white'}
          `}
        >
          {value || 'Select Year'}
        </button>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-2">
            {/* Decade navigation */}
            <div className="flex items-center justify-between mb-2 px-1">
              <button
                type="button"
                onClick={() => setDecade(decade - 10)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium text-gray-900">
                {decade} - {decade + 11}
              </span>
              <button
                type="button"
                onClick={() => setDecade(decade + 10)}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-600"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
            
            {/* Year grid */}
            <div className="grid grid-cols-3 gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    onChange(year.toString());
                    setIsOpen(false);
                  }}
                  className={`
                    p-2 text-sm rounded-lg transition-colors
                    ${value === year.toString()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                    ${year === new Date().getFullYear()
                      ? 'font-semibold'
                      : 'font-normal'
                    }
                  `}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Update the type of activeStep
type StepType = 'upload' | 'mapping' | 'specialties';

export default function SurveyManagementPage(): JSX.Element {
  const [uploadedSurveys, setUploadedSurveys] = useState<SurveyData[]>([]);
  const [activeStep, setActiveStep] = useState<StepType>('upload');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [fileData, setFileData] = useState<any[]>([]);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    specialty: '',
    provider_type: '',
    geographic_region: '',
    n_orgs: '',
    n_incumbents: '',
    tcc: { p25: '', p50: '', p75: '', p90: '' },
    wrvu: { p25: '', p50: '', p75: '', p90: '' },
    cf: { p25: '', p50: '', p75: '', p90: '' }
  });
  const [specialtyMappings, setSpecialtyMappings] = useState<MappingState>({});
  const [isSurveySaved, setIsSurveySaved] = useState(false);
  const [specialtyProgress, setSpecialtyProgress] = useState(0);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [autoDetectStatus, setAutoDetectStatus] = useState<'idle' | 'detecting' | 'complete'>('idle');
  const [mappingValidation, setMappingValidation] = useState<{[key: string]: boolean}>({});
  const [showMappingPreview, setShowMappingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMappingInterface, setShowMappingInterface] = useState(false);
  const [customVendorName, setCustomVendorName] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [currentStep, setCurrentStep] = useState<StepType>('upload');

  // Add loadSurveys function outside useEffect so we can call it manually
    const loadSurveys = async () => {
      try {
        const response = await fetch('/api/surveys');
        if (!response.ok) {
          throw new Error('Failed to fetch surveys');
        }
      const surveys = await response.json();
      setUploadedSurveys(surveys);

      // Set active step based on the most recent survey's progress
      if (surveys.length > 0) {
        const latestSurvey = surveys[0]; // Assuming surveys are ordered by uploadDate desc
        if (!latestSurvey.columnMappings || Object.keys(latestSurvey.columnMappings).length === 0) {
          setActiveStep('upload');
        } else if (!latestSurvey.specialtyMappings || Object.keys(latestSurvey.specialtyMappings).length === 0) {
            setActiveStep('mapping');
        } else {
          setActiveStep('specialties');
        }
        }
      } catch (error) {
        console.error('Error loading surveys:', error);
      toast.error('Failed to load surveys');
      }
    };

  // Use loadSurveys in useEffect
  useEffect(() => {
    loadSurveys();
  }, []);

  // Mock data for existing specialties (in a real app, this would come from your database)
  const existingSpecialties: string[] = [
    'Family Medicine',
    'Family Medicine with OB',
    'Internal Medicine',
    'General Internal Medicine',
    'Cardiology',
    'Interventional Cardiology',
    'General Surgery',
    'Orthopedic Surgery',
    'Pediatrics',
    'General Pediatrics',
    'Neurology',
    'Clinical Neurology'
  ];

  const vendors = [
    { 
      id: 'mgma',
      name: 'MGMA',
      patterns: {
        specialty: ['specialty_description', 'provider_specialty', 'specialty_category'],
        provider_type: ['provider_type', 'physician_type', 'position_type', 'role', 'job_title'],
        geographic_region: ['region', 'geographic_region', 'market', 'location', 'area'],
        n_orgs: ['n_orgs', 'num_orgs', 'organizations', 'org_count', 'reporting_orgs'],
        n_incumbents: ['n_incumbents', 'num_incumbents', 'incumbents', 'physicians', 'providers'],
        tcc: {
          p25: ['comp_25', 'total_comp_25', 'physician_comp_25', 'total_compensation_25'],
          p50: ['comp_50', 'total_comp_50', 'physician_comp_50', 'total_compensation_50', 'comp_median'],
          p75: ['comp_75', 'total_comp_75', 'physician_comp_75', 'total_compensation_75'],
          p90: ['comp_90', 'total_comp_90', 'physician_comp_90', 'total_compensation_90']
        },
        wrvu: {
          p25: ['wrvu_25', 'work_rvu_25', 'physician_wrvu_25'],
          p50: ['wrvu_50', 'work_rvu_50', 'physician_wrvu_50', 'wrvu_median'],
          p75: ['wrvu_75', 'work_rvu_75', 'physician_wrvu_75'],
          p90: ['wrvu_90', 'work_rvu_90', 'physician_wrvu_90']
        },
        cf: {
          p25: ['comp_per_wrvu_25', 'compensation_per_wrvu_25'],
          p50: ['comp_per_wrvu_50', 'compensation_per_wrvu_50', 'comp_per_wrvu_median'],
          p75: ['comp_per_wrvu_75', 'compensation_per_wrvu_75'],
          p90: ['comp_per_wrvu_90', 'compensation_per_wrvu_90']
        }
      }
    },
    {
      id: 'sullivan',
      name: 'SullivanCotter',
      patterns: {
        specialty: ['specialty', 'physician_specialty', 'provider_type'],
        provider_type: ['provider_type', 'physician_type', 'position_type', 'role', 'job_title'],
        geographic_region: ['region', 'geographic_region', 'market', 'location', 'area'],
        n_orgs: ['n_orgs', 'num_orgs', 'organizations', 'org_count', 'reporting_orgs'],
        n_incumbents: ['n_incumbents', 'num_incumbents', 'incumbents', 'physicians', 'providers'],
        tcc: {
          p25: ['tcc_25', 'total_cash_25', 'total_direct_comp_25'],
          p50: ['tcc_50', 'total_cash_50', 'total_direct_comp_50', 'tcc_median'],
          p75: ['tcc_75', 'total_cash_75', 'total_direct_comp_75'],
          p90: ['tcc_90', 'total_cash_90', 'total_direct_comp_90']
        },
        wrvu: {
          p25: ['wrvu_25', 'work_rvu_25', 'physician_wrvu_25'],
          p50: ['wrvu_50', 'work_rvu_50', 'physician_wrvu_50', 'wrvu_median'],
          p75: ['wrvu_75', 'work_rvu_75', 'physician_wrvu_75'],
          p90: ['wrvu_90', 'work_rvu_90', 'physician_wrvu_90']
        },
        cf: {
          p25: ['cf_25', 'comp_factor_25', 'compensation_factor_25'],
          p50: ['cf_50', 'comp_factor_50', 'compensation_factor_50', 'cf_median'],
          p75: ['cf_75', 'comp_factor_75', 'compensation_factor_75'],
          p90: ['cf_90', 'comp_factor_90', 'compensation_factor_90']
        }
      }
    },
    {
      id: 'gallagher',
      name: 'Gallagher',
      patterns: {
        specialty: ['specialty', 'provider_category', 'physician_category'],
        provider_type: ['provider_type', 'physician_type', 'position_type', 'role', 'job_title'],
        geographic_region: ['region', 'geographic_region', 'market', 'location', 'area'],
        n_orgs: ['n_orgs', 'num_orgs', 'organizations', 'org_count', 'reporting_orgs'],
        n_incumbents: ['n_incumbents', 'num_incumbents', 'incumbents', 'physicians', 'providers'],
        tcc: {
          p25: ['cash_comp_25', 'total_comp_25', 'total_cash_comp_25'],
          p50: ['cash_comp_50', 'total_comp_50', 'total_cash_comp_50', 'cash_comp_median'],
          p75: ['cash_comp_75', 'total_comp_75', 'total_cash_comp_75'],
          p90: ['cash_comp_90', 'total_comp_90', 'total_cash_comp_90']
        },
        wrvu: {
          p25: ['wrvus_25', 'work_rvus_25', 'clinical_rvus_25'],
          p50: ['wrvus_50', 'work_rvus_50', 'clinical_rvus_50', 'wrvus_median'],
          p75: ['wrvus_75', 'work_rvus_75', 'clinical_rvus_75'],
          p90: ['wrvus_90', 'work_rvus_90', 'clinical_rvus_90']
        },
        cf: {
          p25: ['comp_factor_25', 'dollars_per_wrvu_25', 'comp_per_wrvu_25'],
          p50: ['comp_factor_50', 'dollars_per_wrvu_50', 'comp_per_wrvu_50', 'comp_factor_median'],
          p75: ['comp_factor_75', 'dollars_per_wrvu_75', 'comp_per_wrvu_75'],
          p90: ['comp_factor_90', 'dollars_per_wrvu_90', 'comp_per_wrvu_90']
        }
      }
    },
    {
      id: 'merritt',
      name: 'Merritt Hawkins',
      patterns: {
        specialty: ['specialty', 'provider_type', 'position_type'],
        tcc: {
          p25: ['total_comp_25', 'compensation_25', 'annual_comp_25'],
        },
        wrvu: {
          p25: ['wrvu_25', 'work_rvu_25', 'physician_wrvu_25'],
          p50: ['wrvu_50', 'work_rvu_50', 'physician_wrvu_50', 'wrvu_median'],
          p75: ['wrvu_75', 'work_rvu_75', 'physician_wrvu_75'],
          p90: ['wrvu_90', 'work_rvu_90', 'physician_wrvu_90']
        },
        cf: {
          p25: ['comp_25', 'compensation_25', 'annual_comp_25'],
          p50: ['comp_50', 'compensation_50', 'annual_comp_50', 'comp_median'],
          p75: ['comp_75', 'compensation_75', 'annual_comp_75'],
          p90: ['comp_90', 'compensation_90', 'annual_comp_90']
        }
      }
    },
    {
      id: 'aamga',
      name: 'AAMGA',
      patterns: {
        specialty: ['compensation', 'rvu', 'dollars_per_rvu']
      }
    },
    {
      id: 'ecg',
      name: 'ECG',
      patterns: {
        specialty: ['total_comp', 'work_rvus', 'compensation_per_rvu']
      }
    }
  ];

  // Load saved templates from localStorage
  useEffect(() => {
    const savedTemplatesStr = localStorage.getItem('surveyMappingTemplates');
    if (savedTemplatesStr) {
      try {
        const templates = JSON.parse(savedTemplatesStr);
        setSavedTemplates(templates);
      } catch (error) {
        console.error('Error loading saved templates:', error);
      }
    }
  }, []);

  // Vendor patterns for column matching
  const vendorPatterns = {
    sullivancotter: {
      patterns: {
        specialty: ['specialty'],
        provider_type: ['providerType', 'provider_type', 'provider type'],
        geographic_region: ['region', 'geographic_region', 'geographic region'],
        n_orgs: ['nOrgs', 'n_orgs', 'number of organizations'],
        n_incumbents: ['nIncumbents', 'n_incumbents', 'number of incumbents'],
      tcc: {
          p25: ['tccP25', 'tcc_p25', 'tcc 25th'],
          p50: ['tccP50', 'tcc_p50', 'tcc 50th'],
          p75: ['tccP75', 'tcc_p75', 'tcc 75th'],
          p90: ['tccP90', 'tcc_p90', 'tcc 90th']
      },
      wrvu: {
          p25: ['wrvuP25', 'wrvu_p25', 'wrvu 25th'],
          p50: ['wrvuP50', 'wrvu_p50', 'wrvu 50th'],
          p75: ['wrvuP75', 'wrvu_p75', 'wrvu 75th'],
          p90: ['wrvuP90', 'wrvu_p90', 'wrvu 90th']
      },
      cf: {
          p25: ['cfP25', 'cf_p25', 'cf 25th'],
          p50: ['cfP50', 'cf_p50', 'cf 50th'],
          p75: ['cfP75', 'cf_p75', 'cf 75th'],
          p90: ['cfP90', 'cf_p90', 'cf 90th']
        }
      }
    },
    mgma: {
      patterns: {
        specialty: ['specialty'],
        provider_type: ['providerType', 'provider_type', 'provider type'],
        geographic_region: ['region', 'geographic_region', 'geographic region'],
        n_orgs: ['nOrgs', 'n_orgs', 'number of organizations'],
        n_incumbents: ['nIncumbents', 'n_incumbents', 'number of incumbents'],
        tcc: {
          p25: ['tccP25', 'tcc_p25', 'tcc 25th'],
          p50: ['tccP50', 'tcc_p50', 'tcc 50th'],
          p75: ['tccP75', 'tcc_p75', 'tcc 75th'],
          p90: ['tccP90', 'tcc_p90', 'tcc 90th']
        },
        wrvu: {
          p25: ['wrvuP25', 'wrvu_p25', 'wrvu 25th'],
          p50: ['wrvuP50', 'wrvu_p50', 'wrvu 50th'],
          p75: ['wrvuP75', 'wrvu_p75', 'wrvu 75th'],
          p90: ['wrvuP90', 'wrvu_p90', 'wrvu 90th']
        },
        cf: {
          p25: ['cfP25', 'cf_p25', 'cf 25th'],
          p50: ['cfP50', 'cf_p50', 'cf 50th'],
          p75: ['cfP75', 'cf_p75', 'cf 75th'],
          p90: ['cfP90', 'cf_p90', 'cf 90th']
        }
      }
    },
    gallagher: {
      patterns: {
        specialty: ['specialty'],
        provider_type: ['providerType', 'provider_type', 'provider type'],
        geographic_region: ['region', 'geographic_region', 'geographic region'],
        n_orgs: ['nOrgs', 'n_orgs', 'number of organizations'],
        n_incumbents: ['nIncumbents', 'n_incumbents', 'number of incumbents'],
        tcc: {
          p25: ['tccP25', 'tcc_p25', 'tcc 25th'],
          p50: ['tccP50', 'tcc_p50', 'tcc 50th'],
          p75: ['tccP75', 'tcc_p75', 'tcc 75th'],
          p90: ['tccP90', 'tcc_p90', 'tcc 90th']
        },
        wrvu: {
          p25: ['wrvuP25', 'wrvu_p25', 'wrvu 25th'],
          p50: ['wrvuP50', 'wrvu_p50', 'wrvu 50th'],
          p75: ['wrvuP75', 'wrvu_p75', 'wrvu 75th'],
          p90: ['wrvuP90', 'wrvu_p90', 'wrvu 90th']
        },
        cf: {
          p25: ['cfP25', 'cf_p25', 'cf 25th'],
          p50: ['cfP50', 'cf_p50', 'cf 50th'],
          p75: ['cfP75', 'cf_p75', 'cf 75th'],
          p90: ['cfP90', 'cf_p90', 'cf 90th']
        }
      }
    }
  };

  function autoDetectMappings(columns: string[], vendor: string): ColumnMapping {
    console.log('Auto-detecting mappings for vendor:', vendor, 'columns:', columns);

    // Helper function to find best match from patterns
    function findBestMatch(columnNames: string[], patterns: string[]): string | undefined {
      // Normalize column names for comparison
      const normalizedColumns = columnNames.map(col => col.toLowerCase().trim());
      
      // Try exact matches first
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase().trim();
        const exactMatch = normalizedColumns.find(col => col === normalizedPattern);
        if (exactMatch) {
          const index = normalizedColumns.indexOf(exactMatch);
          return columnNames[index];
        }
      }

      // Try contains matches
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase().trim();
        const containsMatch = normalizedColumns.find(col => col.includes(normalizedPattern));
        if (containsMatch) {
          const index = normalizedColumns.indexOf(containsMatch);
          return columnNames[index];
        }
      }

      // Try word matches
      for (const pattern of patterns) {
        const normalizedPattern = pattern.toLowerCase().trim();
        const words = normalizedPattern.split(/\s+/);
        for (let i = 0; i < normalizedColumns.length; i++) {
          const colWords = normalizedColumns[i].split(/\s+/);
          if (words.some(word => colWords.includes(word))) {
            return columnNames[i];
          }
        }
      }

      return undefined;
    }

    // Get vendor patterns
    const vendorConfig = vendorPatterns[vendor.toLowerCase() as keyof typeof vendorPatterns];
    if (!vendorConfig) {
      console.warn('No vendor patterns found for:', vendor);
            return {
        specialty: '',
        provider_type: '',
        geographic_region: '',
        n_orgs: '',
        n_incumbents: '',
        tcc: { p25: '', p50: '', p75: '', p90: '' },
        wrvu: { p25: '', p50: '', p75: '', p90: '' },
        cf: { p25: '', p50: '', p75: '', p90: '' }
      };
    }

    // Initialize mappings with empty strings
    const mappings: ColumnMapping = {
      specialty: '',
      provider_type: '',
      geographic_region: '',
      n_orgs: '',
      n_incumbents: '',
      tcc: { p25: '', p50: '', p75: '', p90: '' },
      wrvu: { p25: '', p50: '', p75: '', p90: '' },
      cf: { p25: '', p50: '', p75: '', p90: '' }
    };

    // Detect basic fields
    mappings.specialty = findBestMatch(columns, vendorConfig.patterns.specialty) || '';
    mappings.provider_type = findBestMatch(columns, vendorConfig.patterns.provider_type) || '';
    mappings.geographic_region = findBestMatch(columns, vendorConfig.patterns.geographic_region) || '';
    mappings.n_orgs = findBestMatch(columns, vendorConfig.patterns.n_orgs) || '';
    mappings.n_incumbents = findBestMatch(columns, vendorConfig.patterns.n_incumbents) || '';

    // Detect metrics
    const metrics = ['tcc', 'wrvu', 'cf'] as const;
    const percentiles = ['p25', 'p50', 'p75', 'p90'] as const;

    metrics.forEach(metric => {
      percentiles.forEach(percentile => {
        const patterns = vendorConfig.patterns[metric][percentile];
        const match = findBestMatch(columns, patterns);
        if (match) {
          mappings[metric][percentile] = match;
        }
          });
        });

    console.log('Detected mappings:', mappings);
    return mappings;
  }

  const findMatchingSpecialties = (sourceSpecialty: string): string[] => {
    if (!sourceSpecialty) return [];
    
    const normalize = (s: string) => s?.toLowerCase?.()?.replace(/[^a-z0-9\s]/g, '')?.trim() ?? '';
    const normalizedSource = normalize(sourceSpecialty);
    const matches: Array<[string, number]> = [];

    for (const standard of existingSpecialties) {
      if (!standard) continue;
      const normalizedStandard = normalize(standard);
      let score = 0;

      // Exact match
      if (normalizedSource === normalizedStandard) {
        score = 100;
      }
      // Contains match
      else if (normalizedSource.includes(normalizedStandard) || normalizedStandard.includes(normalizedSource)) {
        score = 80;
      }
      // Word match
      else {
        const sourceWords = normalizedSource.split(/\s+/);
        const standardWords = normalizedStandard.split(/\s+/);
        const commonWords = sourceWords.filter(word => standardWords.includes(word));
        score = (commonWords.length / Math.max(sourceWords.length, standardWords.length)) * 60;
      }

      if (score > 40) {
        matches.push([standard, score]);
      }
    }

    // Sort by score and return top matches
    return matches
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([specialty]) => specialty);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Validate required fields
      if (!file) {
        throw new Error('Please select a file to upload');
      }
      if (!selectedVendor) {
        throw new Error('Please select a vendor');
      }
      if (!selectedYear) {
        throw new Error('Please select a year');
      }
      if (selectedVendor === 'CUSTOM' && !customVendorName) {
        throw new Error('Please enter a custom vendor name');
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendor', selectedVendor === 'CUSTOM' ? customVendorName : selectedVendor);
      formData.append('year', selectedYear);

      // Upload to API
      const response = await fetch('/api/surveys', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload survey');
      }

      const result = await response.json();
      
      // Parse the file for preview
      Papa.parse<PreviewRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          // Get columns from the first row
          const columns = Object.keys(results.data[0] || {});
          setColumns(columns);

          // Auto-detect mappings based on vendor
          const detectedMappings = autoDetectMappings(columns, selectedVendor);
          setColumnMapping(detectedMappings);

          // Store the parsed data and preview
          const typedData = results.data as PreviewRow[];
          setFileData(typedData);
          setPreviewData(typedData.slice(0, 5));

          // Add to uploaded surveys
          const newSurvey: UploadedSurvey = {
            id: result.surveyId,
            vendor: selectedVendor === 'CUSTOM' ? customVendorName : selectedVendor,
            year: selectedYear,
            data: typedData,
            columnMappings: detectedMappings,
            specialtyMappings: {},
            columns: columns,
            mappingProgress: 0,
          };

          setUploadedSurveys(prev => [...prev, newSurvey]);
          toast.success('Survey uploaded successfully!');
        },
        error: (error) => {
          console.error('Error parsing file:', error);
          setUploadError('Error parsing file');
        }
      });
    } catch (error) {
      console.error('Error uploading survey:', error);
      setUploadError(error instanceof Error ? error.message : 'Error uploading survey');
      toast.error(error instanceof Error ? error.message : 'Failed to upload survey');
    } finally {
      setIsUploading(false);
    }
  };

  const handleColumnMappingChange = (
    category: keyof ColumnMapping,
    subcategory: keyof ColumnMappingMetric | null,
    value: string
  ) => {
    setColumnMapping(prevMapping => {
      if (!prevMapping) return prevMapping;

      const newMapping = { ...prevMapping };
      if (subcategory && (category === 'tcc' || category === 'wrvu' || category === 'cf')) {
        const metricMapping = { ...(newMapping[category] as ColumnMappingMetric) };
        metricMapping[subcategory] = value;
        newMapping[category] = metricMapping;
      } else if (!subcategory && category !== 'tcc' && category !== 'wrvu' && category !== 'cf') {
        newMapping[category] = value;
      }
      return newMapping;
    });

    // Update the selected survey's mappings
    if (selectedMapping) {
      setUploadedSurveys(prevSurveys => {
        return prevSurveys.map(survey => {
          if (survey.id === selectedMapping) {
            const updatedSurvey: SurveyData = {
              ...survey,
              columnMappings: columnMapping ? {
                ...columnMapping,
                [category]: subcategory && (category === 'tcc' || category === 'wrvu' || category === 'cf')
                  ? {
                      ...(columnMapping[category] as ColumnMappingMetric),
        [subcategory]: value
                    }
                  : value
              } : undefined,
              mappingProgress: columnMapping ? calculateProgress(columnMapping) : 0
            };
            return updatedSurvey;
          }
          return survey;
        });
      });
    }
  };

  const saveTemplate = () => {
    // TODO: Implement template saving logic
  };

  const loadTemplate = (template: MappingTemplate) => {
    setColumnMapping(template.mapping);
    
    // Update last used timestamp
    const updatedTemplates = savedTemplates.map(t => 
      t.id === template.id 
        ? { ...t, lastUsed: new Date().toISOString() }
        : t
    );
    localStorage.setItem('surveyMappingTemplates', JSON.stringify(updatedTemplates));
    setSavedTemplates(updatedTemplates);

    // Show preview after loading template
    setShowMappingPreview(true);
  };

  // Helper function to extract vendor and specialty
  const getVendorAndSpecialty = (specialty: string): [string, string] => {
    // If the specialty contains a colon, it's a vendor-prefixed specialty
    if (specialty.includes(':')) {
      const [vendor, ...rest] = specialty.split(':');
      // Join the rest back together in case the specialty name itself contains colons
      return [vendor.trim(), rest.join(':').trim()];
    }
    // If no colon, return empty vendor and the full specialty name
    return ['', specialty.trim()];
  };

  const handleSpecialtyMappingChange = (
    sourceSpecialty: string,
    mappedSpecialties: string[],
    notes?: string,
    resolved?: boolean
  ) => {
    if (!selectedMapping) return;

    const newMapping: SpecialtyMapping = {
      mappedSpecialties,
      notes: notes || '',
      resolved: resolved || false,
      confidence: calculateMappingConfidence(sourceSpecialty, mappedSpecialties)
    };

    const updatedMappings = {
      ...specialtyMappings,
      [sourceSpecialty]: newMapping
    };

    setSpecialtyMappings(updatedMappings);
    
    // Calculate new progress
    const progress = calculateSpecialtyProgress();
    setSpecialtyProgress(progress);

    // Update the survey in the database
    fetch(`/api/surveys/${selectedMapping}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        columnMappings: columnMapping,
        specialtyMappings: updatedMappings,
        mappingProgress: progress
      }),
    }).catch(error => {
      console.error('Error saving specialty mappings:', error);
      toast.error('Failed to save specialty mappings');
    });

    // Update local state
    setUploadedSurveys(prevSurveys =>
      prevSurveys.map(survey => {
        if (survey.id === selectedMapping) {
          return {
            ...survey,
            specialtyMappings: updatedMappings,
            mappingProgress: progress
          };
        }
        return survey;
      })
    );
  };

  const handleDrop = (sourceSpecialty: string, targetSpecialty: string) => {
    const mapping = specialtyMappings[sourceSpecialty] || { mappedSpecialties: [], notes: '' };
    handleSpecialtyMappingChange(
      sourceSpecialty,
      [...mapping.mappedSpecialties, targetSpecialty],
      mapping.notes
    );
  };

  const handleNotesChange = (sourceSpecialty: string, notes: string) => {
    const mapping = specialtyMappings[sourceSpecialty];
    handleSpecialtyMappingChange(
      sourceSpecialty,
      mapping?.mappedSpecialties || [],
      notes
    );
  };

  const getFilteredSpecialties = (searchTerm: string): string[] => {
    return existingSpecialties.filter(specialty => 
      specialty.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const validateMappings = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    if (!fileData) return errors;

    fileData.forEach((row: any) => {
      const sourceSpecialty = row[columnMapping.specialty];
      const mapping = specialtyMappings[sourceSpecialty];
      
      if (!mapping) {
        errors.push({
          sourceSpecialty,
          error: 'No mapping defined'
        });
      } else if (mapping.mappedSpecialties.length === 0) {
        errors.push({
          sourceSpecialty,
          error: 'No standard specialties mapped'
        });
      }
    });

    return errors;
  };

  const aggregateData = (): AggregatedData[] => {
    const aggregated: { [key: string]: AggregatedData } = {};

    if (!fileData) return [];

    // Process each specialty mapping
    Object.entries(specialtyMappings).forEach(([sourceSpecialty, mapping]) => {
      mapping.mappedSpecialties.forEach(targetSpecialty => {
        if (!aggregated[targetSpecialty]) {
          aggregated[targetSpecialty] = {
            specialty: targetSpecialty,
            sourceSpecialties: [],
            tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
            wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
            cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
          };
        }

        aggregated[targetSpecialty].sourceSpecialties.push(sourceSpecialty);

        // Find the row in fileData that matches this source specialty
        const sourceData = fileData?.find(row => 
          row[columnMapping.specialty] === sourceSpecialty
        );

        if (sourceData) {
          // Update metrics
          (['p25', 'p50', 'p75', 'p90'] as const).forEach(percentile => {
            const tccValue = parseFloat(sourceData[columnMapping.tcc[percentile]] as string) || 0;
            aggregated[targetSpecialty].tcc[percentile] += tccValue;

            const wrvuValue = parseFloat(sourceData[columnMapping.wrvu[percentile]] as string) || 0;
            aggregated[targetSpecialty].wrvu[percentile] += wrvuValue;

            const cfValue = parseFloat(sourceData[columnMapping.cf[percentile]] as string) || 0;
            aggregated[targetSpecialty].cf[percentile] += cfValue;
          });
        }
      });
    });

    // Average the values based on number of source specialties
    Object.values(aggregated).forEach(data => {
      const count = data.sourceSpecialties.length;
      if (count > 1) {
        (['tcc', 'wrvu', 'cf'] as const).forEach(metric => {
          (['p25', 'p50', 'p75', 'p90'] as const).forEach(percentile => {
            data[metric][percentile] = data[metric][percentile] / count;
          });
        });
      }
    });

    return Object.values(aggregated);
  };

  const saveTemplateToStorage = (name: string) => {
    const template: MappingTemplate = {
      id: Date.now().toString(),
      name,
      vendor: selectedVendor,
      year: new Date().getFullYear().toString(),
      mapping: columnMapping,
      lastUsed: new Date().toISOString()
    };

    const updatedTemplates = [...savedTemplates, template];
    localStorage.setItem('surveyMappingTemplates', JSON.stringify(updatedTemplates));
    setSavedTemplates(updatedTemplates);
    setShowTemplateSaveModal(false);
  };

  // Update handleSaveMappings to use the API
  const handleSaveMappings = async () => {
    if (!selectedMapping) {
      toast.error('No survey selected');
      return;
    }

    try {
      const response = await fetch(`/api/surveys/${selectedMapping}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnMappings: columnMapping,
          specialtyMappings: specialtyMappings,
          mappingProgress: calculateProgress(columnMapping)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save mappings');
      }

      // Update local state only
      setUploadedSurveys(prevSurveys =>
        prevSurveys.map(survey => {
          if (survey.id === selectedMapping) {
            return {
              ...survey,
              columnMappings: columnMapping,
              specialtyMappings: specialtyMappings,
              mappingProgress: calculateProgress(columnMapping)
            };
          }
          return survey;
        })
      );

      toast.success('Mappings saved successfully');
      setActiveStep('specialties');
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast.error('Failed to save mappings');
    }
  };

  const isColumnMappingComplete = (): boolean => {
    if (!columnMapping) return false;
    
    // Check required fields
    const requiredFields = ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'];
    for (const field of requiredFields) {
      if (!columnMapping[field as keyof ColumnMapping]) return false;
    }

    // Check TCC mappings
    if (!columnMapping.tcc.p25 || !columnMapping.tcc.p50 || !columnMapping.tcc.p75 || !columnMapping.tcc.p90) return false;

    // Check WRVU mappings
    if (!columnMapping.wrvu.p25 || !columnMapping.wrvu.p50 || !columnMapping.wrvu.p75 || !columnMapping.wrvu.p90) return false;

    // Check CF mappings
    if (!columnMapping.cf.p25 || !columnMapping.cf.p50 || !columnMapping.cf.p75 || !columnMapping.cf.p90) return false;

    return true;
  };

  const renderStepIndicator = (): JSX.Element => (
    <div className="relative py-12">
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Survey Upload Step */}
        <div className="flex flex-col items-center relative">
          <div 
            onClick={() => setActiveStep('upload')}
            className="cursor-pointer relative"
          >
            <div className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center bg-[#4361ee] transition-all duration-300">
              <ArrowUpTrayIcon className="w-5 h-5 text-white" />
            </div>
            {uploadedSurveys.length > 0 && (
              <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {uploadedSurveys.length}
              </div>
            )}
          </div>
          <span className="mt-3 text-sm font-medium text-gray-900">Survey Upload</span>
        </div>

        {/* Connecting Line 1 */}
        <div className="flex-1 mx-4">
          <div className="h-0.5 bg-[#4361ee]/20 rounded-full"></div>
        </div>

        {/* Map Columns Step */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => setActiveStep('mapping')}
            className="cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center bg-[#4361ee] transition-all duration-300">
              <TableCellsIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="mt-3 text-sm font-medium text-gray-900">Map Columns</span>
        </div>

        {/* Connecting Line 2 */}
        <div className="flex-1 mx-4">
          <div className="h-0.5 bg-[#4361ee]/20 rounded-full"></div>
        </div>

        {/* Map Specialties Step */}
        <div className="flex flex-col items-center">
          <div 
            onClick={() => setActiveStep('specialties')}
            className="cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl shadow-sm flex items-center justify-center bg-[#4361ee] transition-all duration-300">
              <UserGroupIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="mt-3 text-sm font-medium text-gray-900">Map Specialties</span>
        </div>
      </div>
    </div>
  );

  const autoArrangeSpecialties = async (): Promise<void> => {
    // Get all unmapped specialties (excluding single source)
    const unmappedList: UnmappedSpecialty[] = uploadedSurveys.reduce((acc: UnmappedSpecialty[], survey) => {
      const specialties = survey.data
        .map(row => ({
          specialty: String(row[survey.columnMappings?.specialty || ''] || '').trim(),
          vendor: survey.vendor
        }))
        .filter(s => {
          const mapping = specialtyMappings[s.specialty];
          return s.specialty && 
            !mapping?.resolved && 
            !mapping?.isSingleSource && 
            !mapping?.mappedSpecialties?.length;
        });
      return [...acc, ...specialties];
    }, []);
    
    // Process each unmapped specialty
    for (const source of unmappedList) {
      // Skip if already mapped
      if (specialtyMappings[source.specialty]) continue;

      // Find potential matches from other vendors
      const potentialMatches: SpecialtyMatch[] = uploadedSurveys
        .flatMap(survey => 
          survey.data
            .map(row => ({
              specialty: String(row[survey.columnMappings?.specialty || ''] || '').trim(),
              vendor: survey.vendor,
              confidence: calculateStringSimilarity(source.specialty, String(row[survey.columnMappings?.specialty || ''] || '').trim())
            }))
            .filter(match => 
              match.specialty &&
              match.vendor !== source.vendor &&
              !Object.values(specialtyMappings).flatMap(m => m.mappedSpecialties).includes(match.specialty)
            )
        )
        .filter(match => match.confidence > 0.8)
        .sort((a, b) => b.confidence - a.confidence);

      // If we found good matches, create the mapping
      if (potentialMatches.length > 0) {
        const matchedSpecialties = potentialMatches.map(m => m.specialty);
        
        // Update specialty mappings through the handler (which saves to DB)
        await handleSpecialtyMappingChange(
          source.specialty,
          matchedSpecialties,
          'Auto-mapped specialty',
          true
        );
      }
    }

    // After processing specialties, calculate progress
    const progress = calculateProgress(columnMapping);
    setSpecialtyProgress(progress);
    
    // Update surveys with new progress
    const updatedSurveys = uploadedSurveys.map(survey => ({
      ...survey,
      specialtyMappings,
      mappingProgress: progress
    }));
    
    setUploadedSurveys(updatedSurveys);

    // Save the updated surveys to the database
    try {
      await Promise.all(updatedSurveys.map(async (survey) => {
        const response = await fetch(`/api/surveys/${survey.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            columnMappings: survey.columnMappings,
            specialtyMappings: survey.specialtyMappings,
            mappingProgress: survey.mappingProgress,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to save survey updates');
        }
      }));
    
    toast.success('Auto-arrangement complete! Mappings have been saved.');
    } catch (err) {
      console.error('Error saving survey updates:', err);
      toast.error('Failed to save some mappings. Please try again.');
    }
  };

  const renderSpecialtyCard = (sourceSpecialty: string, mapping: SpecialtyMapping, survey: any) => {
    const confidence = calculateMappingConfidence(sourceSpecialty, mapping.mappedSpecialties);
    const metrics = getSpecialtyMetrics(sourceSpecialty, survey);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-white rounded-lg border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md"
      >
        <div className="p-4">
          {/* Header with confidence score */}
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-medium text-gray-900">{sourceSpecialty}</h4>
              <div className="flex items-center space-x-2">
              <div className="h-2 w-24 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence * 100}%` }}
                  className="h-full bg-blue-600"
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-sm text-gray-500">{Math.round(confidence * 100)}%</span>
        </div>
      </div>

          {/* Metrics Preview */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-500">TCC</div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(metrics.tcc)}
                  </div>
                </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">wRVUs</div>
              <div className="text-sm font-medium text-gray-900">
                {formatNumber(metrics.wrvu)}
                  </div>
                </div>
            <div className="text-center">
              <div className="text-xs text-gray-500">CF</div>
              <div className="text-sm font-medium text-gray-900">
                {formatCurrency(metrics.cf)}
              </div>
        </div>
      </div>

          {/* Mapped Specialties */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Mapped to Standard Specialties
            </label>
            <div className="flex flex-wrap gap-2">
              {mapping.mappedSpecialties.map(specialty => (
                <motion.span
                  key={specialty}
                  layout
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {specialty}
                  <button
                    onClick={() => handleSpecialtyMappingChange(
                      sourceSpecialty,
                      mapping.mappedSpecialties.filter(s => s !== specialty),
                      mapping.notes
                    )}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                  </button>
                </motion.span>
              ))}
            </div>
          </div>

          {/* Suggested Mappings */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Suggested Mappings
            </label>
            <div className="flex flex-wrap gap-2">
              {findMatchingSpecialties(sourceSpecialty)
                .filter(suggestion => !mapping.mappedSpecialties.includes(suggestion))
                .map(suggestion => (
                  <motion.button
                    key={suggestion}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSpecialtyMappingChange(
                      sourceSpecialty,
                      [...mapping.mappedSpecialties, suggestion],
                      mapping.notes
                    )}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                    {suggestion}
                  </motion.button>
              ))}
                            </div>
                          </div>

          {/* Notes */}
          <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes
                              </label>
                              <textarea
                                value={mapping.notes || ''}
                                onChange={(e) => handleNotesChange(sourceSpecialty, e.target.value)}
                                placeholder="Add notes about this mapping..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                rows={2}
                              />
                            </div>
        </div>
      </motion.div>
    );
  };

  // Add these helper functions
  const calculateMappingConfidence = (source: string, mappedSpecialties: string[]): number => {
    if (mappedSpecialties.length === 0) return 0;
    
    return mappedSpecialties.reduce((maxConfidence, target) => {
      const similarity = calculateStringSimilarity(source, target);
      return Math.max(maxConfidence, similarity);
    }, 0);
  };

  const getSpecialtyMetrics = (specialty: string, survey: any) => {
    const data = survey.data.find((d: any) => d[survey.columnMappings?.specialty] === specialty);
    return {
      tcc: data?.tcc?.p50 || 0,
      wrvu: data?.wrvu?.p50 || 0,
      cf: data?.cf?.p50 || 0
    };
  };

  // Move the useEffect from renderSpecialtyMappingStep to here
  useEffect(() => {
    if (activeStep === 'specialties' && uploadedSurveys.length > 0) {
      console.log('Auto-triggering specialty mapping');
      autoArrangeSpecialties();
    }
  }, [activeStep, uploadedSurveys.length]);

  // Update the mapping section in renderSpecialtyMappingStep
  const renderSpecialtyMappingStep = () => {
    const progress = calculateSpecialtyProgress();
    
    // Transform uploaded surveys to match the expected Survey type
    const transformedSurveys = uploadedSurveys.map(survey => {
      // Get all unique specialties from the survey data
      const specialties = Array.from(new Set(
        survey.data
          .map(row => String(row.specialty || '').trim())
          .filter(s => s && s !== '')
      ));

      // Create the transformed survey object with empty metric objects
      return {
        id: survey.id,
        vendor: survey.vendor,
        data: specialties.map(specialty => ({
          specialty,
          tcc: { p25: 0, p50: 0, p75: 0, p90: 0 },
          wrvu: { p25: 0, p50: 0, p75: 0, p90: 0 },
          cf: { p25: 0, p50: 0, p75: 0, p90: 0 }
        }))
      };
    });

    return (
      <div className="space-y-6">
        {/* Main Content */}
        <div className="bg-white rounded-lg border border-gray-200 min-h-[600px] overflow-hidden relative">
          <ErrorBoundary>
            <SpecialtyMappingStudio
              surveys={transformedSurveys}
              onMappingChange={(sourceSpecialty: string, mappedSpecialties: string[]) => {
                handleSpecialtyMappingChange(sourceSpecialty, mappedSpecialties);
                
                // Update the current survey's specialty mappings
                if (selectedMapping) {
                  const updatedSurveys = uploadedSurveys.map(survey => {
                    if (survey.id === selectedMapping) {
                      return {
                        ...survey,
                        specialtyMappings: {
                          ...survey.specialtyMappings,
                          [sourceSpecialty]: {
                            mappedSpecialties,
                            notes: '',
                            resolved: false
                          }
                        }
                      };
                    }
                    return survey;
                  });
                  
                  setUploadedSurveys(updatedSurveys);
                  localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
                }
              }}
            />
          </ErrorBoundary>
        </div>
      </div>
    );
  };

  const renderDataPreview = (): JSX.Element => (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col space-y-6">
            {/* Header with Vendor Selection */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Survey Data</h3>
                <p className="text-gray-600 max-w-2xl">
                  Upload your compensation survey data files (CSV format). You can upload multiple surveys before mapping.
                </p>
                <div className="mt-2 flex items-center space-x-4">
                  <Link
                    href="/survey-format-guide"
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <DocumentTextIcon className="w-4 h-4 mr-1" />
                    View Format Guide
                  </Link>
                  <a
                    href="/sample-survey-template.csv"
                    download
                    className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
                    Download Template
                  </a>
                </div>
              </div>
              <div className="flex-shrink-0 w-64 space-y-4">
                <div className="flex flex-col space-y-1">
                  <label htmlFor="vendor-select" className="text-sm font-medium text-gray-700">
                    Survey Vendor
                  </label>
                <select
                  id="vendor-select"
                  value={selectedVendor}
                  onChange={(e) => {
                    setSelectedVendor(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setCustomVendorName('');
                    }
                  }}
                    className="block w-full h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                >
                    <option value="" disabled>Select Vendor</option>
                  <option value="MGMA">MGMA</option>
                  <option value="SULLIVANCOTTER">SullivanCotter</option>
                  <option value="GALLAGHER">Gallagher</option>
                  <option value="ECG">ECG Management</option>
                  <option value="AAMGA">AAMGA</option>
                  <option value="MERRIT_HAWKINS">Merrit Hawkins</option>
                  <option value="CUSTOM">Custom Survey</option>
                </select>
                </div>
                
                {selectedVendor === 'CUSTOM' && (
                  <div className="flex flex-col space-y-1">
                    <label htmlFor="custom-vendor" className="text-sm font-medium text-gray-700">
                      Custom Vendor Name
                    </label>
                  <input
                      id="custom-vendor"
                    type="text"
                    value={customVendorName}
                    onChange={(e) => setCustomVendorName(e.target.value)}
                      placeholder="Enter vendor name"
                      className="block w-full h-[38px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                  />
                  </div>
                )}
                
                <YearPicker
                  value={selectedYear}
                  onChange={setSelectedYear}
                />
              </div>
            </div>

            {/* Enhanced Upload Area */}
            <div 
              className={`
                relative group border-2 border-dashed rounded-xl p-12 transition-all duration-300 ease-in-out
                ${selectedVendor 
                  ? 'hover:border-blue-400 hover:bg-blue-50/50' 
                  : 'border-gray-200'
                }
              `}
              onDragOver={(e) => {
                e.preventDefault();
                if (selectedVendor) {
                  e.currentTarget.classList.add('border-blue-500', 'bg-blue-50');
                  e.dataTransfer.dropEffect = 'copy';
                }
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50');
                if (!selectedVendor) return;
                const file = e.dataTransfer?.files[0];
                if (file) handleFileUpload(file);
              }}
            >
              <div className="relative flex flex-col items-center">
                <div className={`
                  mb-4 p-3 rounded-full transition-all duration-300
                  ${selectedVendor 
                    ? 'bg-blue-100 text-blue-600 group-hover:scale-110 group-hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400'
                  }
                `}>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>

                <div className="text-center mb-4">
                  <h3 className={`text-lg font-medium mb-1 ${selectedVendor ? 'text-gray-900' : 'text-gray-400'}`}>
                    {selectedVendor ? 'Drop files here or click to browse' : 'Please select a vendor first'}
                  </h3>
                  <p className={`text-sm ${selectedVendor ? 'text-gray-500' : 'text-gray-400'}`}>
                    Drag and drop your file or click to browse • Supported formats: <span className={selectedVendor ? 'text-blue-600 font-medium' : 'text-gray-400'}>.xlsx, .xls, .csv</span>
                  </p>
                </div>

                <label
                  className={`
                    relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-lg shadow-sm transition-all duration-300
                    ${selectedVendor 
                      ? 'border-transparent text-white bg-blue-600 hover:bg-blue-700 hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer'
                      : 'border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed'
                    }
                  `}
                >
                  <svg className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    disabled={!selectedVendor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Uploaded Surveys List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <span>Uploaded Surveys</span>
            {uploadedSurveys.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-sm bg-blue-100 text-blue-700 rounded-full">
                {uploadedSurveys.length}
              </span>
            )}
          </h3>
          
          {uploadedSurveys.length > 0 ? (
            <div className="space-y-4">
              {uploadedSurveys.map((survey) => (
                <Link
                  key={survey.id}
                  href={`/survey-management/view-surveys?surveyId=${survey.id}`}
                  className="block bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {formatVendorName(survey.vendor)}
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                          {survey.data.length} specialties • Uploaded {new Date(parseInt(survey.id)).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!window.confirm('Are you sure you want to delete this survey?')) {
                            return;
                          }
                          try {
                            const response = await fetch(`/api/surveys?id=${survey.id}`, {
                              method: 'DELETE',
                            });
                            
                            if (!response.ok) {
                              throw new Error('Failed to delete survey');
                            }
                            
                            const index = uploadedSurveys.findIndex(s => s.id === survey.id);
                            if (index !== -1) {
                              const updatedSurveys = [...uploadedSurveys];
                              updatedSurveys.splice(index, 1);
                              setUploadedSurveys(updatedSurveys);
                              localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
                            }
                          } catch (error) {
                            console.error('Error deleting survey:', error);
                            alert('Failed to delete survey. Please try again.');
                          }
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-6 1h6m-3-3v6m3-6v6M9 6h6m-6 1h6m-3-3v6m3-6v6" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No Surveys Uploaded</h3>
              <p className="text-gray-500 mb-4">Select a vendor and upload your first survey to get started</p>
              <button
                onClick={() => document.getElementById('vendor-select')?.focus()}
                className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Select Vendor
              </button>
            </div>
          )}

          {uploadedSurveys.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveStep('mapping')}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm hover:shadow transition-all duration-300"
              >
                Continue to Mapping
                <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderMappingInterface = () => (
    <div className="space-y-8">
      {/* Survey Selection */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Select Survey to Map</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a survey to begin mapping its columns to standardized fields
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedMapping || ''}
                onChange={(e) => handleSurveySelect(e.target.value)}
                className="block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choose a survey...</option>
                {uploadedSurveys.map(survey => (
                  <option key={survey.id} value={survey.id}>
                    {formatVendorName(survey.vendor)} Survey ({survey.data.length} rows)
                  </option>
                ))}
              </select>
              <button
                onClick={async () => {
                  if (!selectedVendor || columns.length === 0) {
                    toast.error('Please select a survey first');
                    return;
                  }

                  try {
                    // Detect mappings
                    const detectedMappings = autoDetectMappings(columns, selectedVendor);
                    console.log('Auto-detected mappings:', detectedMappings);

                    // Update local state
                    setColumnMapping(detectedMappings);

                    // Save to database if we have a selected survey
                    if (selectedMapping) {
                      const response = await fetch(`/api/surveys/${selectedMapping}`, {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          columnMappings: detectedMappings,
                          specialtyMappings: specialtyMappings || {}, // Include current specialty mappings
                        }),
                      });

                      if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || 'Failed to save mappings');
                      }

                      // Reload surveys to get updated data
                      await loadSurveys();

                      // Update the selected survey in the list with new mappings
                      setUploadedSurveys((prevSurveys) => {
                        return prevSurveys.map((survey) => {
                          if (survey.id === selectedMapping) {
                            const updatedSurvey: SurveyData = {
                              ...survey,
                              columnMappings: detectedMappings,
                              specialtyMappings: specialtyMappings || {},
                              mappingProgress: calculateProgress(detectedMappings),
                            };
                            return updatedSurvey;
                          }
                          return survey;
                        });
                      });

                      toast.success('Columns mapped successfully');
                    }
                  } catch (error) {
                    console.error('Error in auto-mapping:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to auto-map columns');
                  }
                }}
                disabled={!selectedVendor || columns.length === 0}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${!selectedVendor || columns.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Auto-map Columns
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Mapping Progress</span>
            <span className="text-sm font-medium text-gray-900">{calculateProgress(columnMapping)}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${calculateProgress(columnMapping)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mapping Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Fields */}
        {['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'].map((field) => (
          <div key={field} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow duration-300 hover:shadow-md">
            <div className="p-5 flex items-center space-x-3 border-b border-gray-100 bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <p className="text-sm text-gray-500">Map the {field.replace(/_/g, ' ')} column</p>
              </div>
            </div>
            <div className="p-5">
              <select
                value={columnMapping?.[field as keyof ColumnMapping] as string || ''}
                onChange={(e) => handleColumnMappingChange(field as keyof ColumnMapping, null, e.target.value)}
                className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Select {field.replace(/_/g, ' ')} column</option>
                {columns.map((column) => (
                  <option key={`${field}-${column}`} value={column}>{column}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {/* Metric Fields */}
        {['tcc', 'wrvu', 'cf'].map((metric) => (
          <div key={metric} className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow duration-300 hover:shadow-md">
            <div className="p-5 flex items-center space-x-3 border-b border-gray-100 bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{metric.toUpperCase()}</h3>
                <p className="text-sm text-gray-500">Map the {metric.toUpperCase()} percentile columns</p>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {['p25', 'p50', 'p75', 'p90'].map((percentile) => (
                <div key={`${metric}-${percentile}`}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {percentile.toUpperCase()}
                  </label>
                  <select
                    value={(columnMapping?.[metric as keyof ColumnMapping] as ColumnMappingMetric)?.[percentile as keyof ColumnMappingMetric] || ''}
                    onChange={(e) => handleColumnMappingChange(metric as keyof ColumnMapping, percentile as keyof ColumnMappingMetric, e.target.value)}
                    className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select {percentile} column</option>
                    {columns.map((column) => (
                      <option key={`${metric}-${percentile}-${column}`} value={column}>{column}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end pt-6">
        <button
          onClick={() => setActiveStep('specialties')}
          disabled={!isColumnMappingComplete()}
          className={`
            inline-flex items-center px-6 py-3 rounded-xl text-sm font-medium shadow-sm
            transition-all duration-300 transform hover:scale-105
            ${isColumnMappingComplete()
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Continue to Specialty Mapping
          <svg className="ml-2 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Calculate mapping progress
  function calculateProgress(mapping: ColumnMapping | undefined): number {
    if (!mapping) return 0;
    
    let totalPoints = 0;
    let mappedPoints = 0;
    
    // Required fields
    const requiredFields = ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'];
    totalPoints += requiredFields.length;
    mappedPoints += requiredFields.filter(field => mapping[field as keyof ColumnMapping] && mapping[field as keyof ColumnMapping] !== '').length;

    // Percentile metrics (tcc, wrvu, cf)
    const metrics = ['tcc', 'wrvu', 'cf'];
    const percentiles = ['p25', 'p50', 'p75', 'p90'];
    
    // Each metric with all percentiles counts as one point
    metrics.forEach(metric => {
        totalPoints += 1;
      const metricMapping = mapping[metric as keyof ColumnMapping] as ColumnMappingMetric;
      if (metricMapping && percentiles.some(p => metricMapping[p as keyof ColumnMappingMetric] !== '')) {
          mappedPoints += 1;
        }
    });
    
    return Math.round((mappedPoints / totalPoints) * 100);
  }

  const renderTemplateSaveModal = () => (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Save Mapping Template</h3>
        <div className="space-y-6">
          <div>
            <label htmlFor="templateName" className="block text-sm font-medium text-gray-700">
              Template Name
            </label>
            <input
              type="text"
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Enter template name..."
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setShowTemplateSaveModal(false)}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => saveTemplateToStorage(templateName)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              disabled={!templateName}
            >
              Save Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const handleSurveySelect = async (surveyId: string) => {
    try {
      // Find the selected survey
      const selectedSurvey = uploadedSurveys.find(s => s.id === surveyId);
      if (!selectedSurvey) {
        toast.error('Survey not found');
        return;
      }

      console.log('Selected survey:', selectedSurvey);

      // Set basic survey info
      setSelectedMapping(surveyId);
      setSelectedVendor(selectedSurvey.vendor);
      
      // Important: Set columns first and ensure they exist
      if (selectedSurvey.columns && selectedSurvey.columns.length > 0) {
        console.log('Setting columns:', selectedSurvey.columns);
        setColumns(selectedSurvey.columns);
      } else if (selectedSurvey.data && selectedSurvey.data.length > 0) {
        // Fallback: Get columns from the first row of data
        const columnsFromData = Object.keys(selectedSurvey.data[0]);
        console.log('Setting columns from data:', columnsFromData);
        setColumns(columnsFromData);
      } else {
        console.error('No columns found in survey');
        toast.error('No columns found in survey');
        return;
      }

      // Set existing mappings or auto-detect
      if (selectedSurvey.columnMappings && Object.keys(selectedSurvey.columnMappings).length > 0) {
        console.log('Using existing mappings:', selectedSurvey.columnMappings);
        setColumnMapping(selectedSurvey.columnMappings);
      } else {
        // Auto-detect mappings using the columns we just set
        const columnsToUse = selectedSurvey.columns || Object.keys(selectedSurvey.data[0]);
        console.log('Auto-detecting mappings for columns:', columnsToUse);
        const detectedMappings = autoDetectMappings(columnsToUse, selectedSurvey.vendor);
        console.log('Detected mappings:', detectedMappings);
        setColumnMapping(detectedMappings);
        
        // Save the detected mappings
        await fetch(`/api/surveys/${surveyId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ columnMappings: detectedMappings })
        });
      }

      // Set specialty mappings if they exist
      if (selectedSurvey.specialtyMappings) {
        setSpecialtyMappings(selectedSurvey.specialtyMappings);
      }

      // Move to mapping step
      setCurrentStep('mapping');

    } catch (error) {
      console.error('Error selecting survey:', error);
      toast.error('Failed to select survey');
    }
  };

  const renderMappingVisualization = (): JSX.Element => {
    // Get specialties from each survey
    const surveySpecialties = uploadedSurveys.map(survey => {
      const specialties = Array.from(new Set(
        survey.data
          .map(row => {
            // Safely access the specialty field from mappings
            const specialtyField = survey.columnMappings?.specialty || 'specialty';
            return String(row[specialtyField] || '');
          })
          .filter(s => s.trim() !== '')
      ));
      return {
        vendor: survey.vendor,
        id: survey.id,
        specialties
      };
    });

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-medium text-gray-900">Specialty Mapping Overview</h4>
          <div className="text-sm text-gray-500">
            {Object.keys(specialtyMappings).length} specialties mapped across {uploadedSurveys.length} surveys
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {surveySpecialties.map((surveyData) => (
            <div key={surveyData.id} className="space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium text-gray-900">{surveyData.vendor}</h5>
                <span className="text-xs text-gray-500">{surveyData.specialties.length} specialties</span>
              </div>
              <div className="space-y-2">
                {surveyData.specialties.map((specialty: string) => {
                  const mapping = specialtyMappings[specialty];
                  return (
                    <div
                      key={`${surveyData.id}-${specialty}`}
                      className={`
                        p-3 rounded-lg border transition-all duration-200
                        ${mapping ? 'border-blue-200 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{specialty}</p>
                          {mapping && mapping.mappedSpecialties.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {mapping.mappedSpecialties.map((mapped) => (
                                <span
                                  key={`${specialty}-${mapped}`}
                                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700"
                                >
                                  {mapped}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedMapping(surveyData.id);
                            const element = document.getElementById(`specialty-${specialty}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth' });
                            }
                          }}
                          className="ml-2 p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7h3a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h3m4.5-4v4m0 0h-9m9 0H12" />
                          </svg>
                        </button>
                      </div>
                      {mapping?.notes && (
                        <p className="mt-2 text-xs text-gray-500">{mapping.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Add this effect after the other useEffects
  useEffect(() => {
    // Check if we're in the mapping step and have surveys
    if (activeStep === 'mapping' && uploadedSurveys.length > 0) {
      // Check if all surveys have complete mappings
      const allMapped = uploadedSurveys.every(survey => {
        // Add null check for mappings
        if (!survey.columnMappings) return false;
        
        const mappings = survey.columnMappings;
        if (!mappings.specialty) return false;
        
        // Check all percentile mappings
        const metrics = ['tcc', 'wrvu', 'cf'] as const;
        const percentiles = ['p25', 'p50', 'p75', 'p90'] as const;
        
        return metrics.every(metric => 
          percentiles.every(percentile => {
            const metricMapping = mappings[metric] as ColumnMappingMetric;
            // Add null check for metricMapping
            if (!metricMapping) return false;
            return !!metricMapping[percentile];
          })
        );
      });

      if (allMapped) {
        toast.success('All columns mapped successfully! Click "Next" to proceed to specialty mapping.');
      }
    }
  }, [activeStep, uploadedSurveys]);

  useEffect(() => {
    const handleSpecialtyProgress = (event: CustomEvent<number>) => {
      setSpecialtyProgress(event.detail);
    };

    window.addEventListener('specialtyMappingProgress', handleSpecialtyProgress as EventListener);
    return () => {
      window.removeEventListener('specialtyMappingProgress', handleSpecialtyProgress as EventListener);
    };
  }, []);

  const calculateSpecialtyProgress = (): number => {
    const totalSpecialties = Object.keys(specialtyMappings).length;
    if (totalSpecialties === 0) return 0;

    const resolvedSpecialties = Object.values(specialtyMappings).filter(
      mapping => mapping.resolved || mapping.isSingleSource
    ).length;

    return Math.round((resolvedSpecialties / totalSpecialties) * 100);
  };

  const handleSaveSurvey = async () => {
    try {
      if (!originalFile || !selectedVendor || !selectedYear) {
        throw new Error('Missing required data for survey upload');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', originalFile);
      formData.append('vendor', selectedVendor);
      formData.append('year', selectedYear);

      // Upload to API
      const response = await fetch('/api/surveys', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload survey');
      }

      const result = await response.json();
      
      // Update local state
      const newSurvey = {
        id: result.surveyId,
        vendor: selectedVendor,
        year: selectedYear,
        data: fileData || [],
        columnMappings: columnMapping,
        specialtyMappings,
        columns,
        mappingProgress: 0,
      };

      setUploadedSurveys(prev => [...prev, newSurvey]);
      setIsSurveySaved(true);
      toast.success('Survey uploaded successfully!');
    } catch (error) {
      console.error('Error saving survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload survey');
    }
  };

  const areAllStepsComplete = (): boolean => {
    // Check if we have uploaded surveys
    if (uploadedSurveys.length === 0) return false;

    // Check if column mapping is complete
    if (calculateProgress(columnMapping) !== 100) return false;

    // Check if specialty mapping is complete
    if (calculateSpecialtyProgress() !== 100) return false;

    return true;
  };

  // Update the handleAcceptSingleSource function to properly persist mappings
  const handleAcceptSingleSource = async (specialty: string, vendor: string) => {
    try {
      // Create the mapping for the single source specialty
      const newMapping: SpecialtyMapping = {
        mappedSpecialties: [specialty], // Map to itself
        notes: `Accepted as single source from ${vendor}`,
        resolved: true,
        isSingleSource: true,
        confidence: 1.0
      };

      // Update local state with the new mapping
      const updatedMappings = {
        ...specialtyMappings,
        [specialty]: newMapping
      };
      setSpecialtyMappings(updatedMappings);

      // Calculate new progress
      const progress = calculateSpecialtyProgress();
      setSpecialtyProgress(progress);

      // Update the survey in the database
      const response = await fetch(`/api/surveys/${uploadedSurveys[0].id}/mappings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          specialtyMappings: updatedMappings,
          mappingProgress: progress
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update survey mappings');
      }

      // Update local state
      const updatedSurveys = uploadedSurveys.map(survey => ({
        ...survey,
        specialtyMappings: updatedMappings,
        mappingProgress: progress
      }));
      setUploadedSurveys(updatedSurveys);

      toast.success(`Accepted ${specialty} as single source`);
    } catch (error) {
      console.error('Error accepting single source:', error);
      toast.error('Failed to accept single source. Please try again.');
    }
  };

  // Add reload button in the UI near the survey selection
  const renderSurveySelection = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            onChange={(e) => handleSurveySelect(e.target.value)}
            value=""
          >
            <option value="">Select a survey to map</option>
            {uploadedSurveys.map((survey) => (
              <option key={survey.id} value={survey.id}>
                {formatVendorName(survey.vendor)} ({survey.year})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadSurveys}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Reload
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Enhanced Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 mb-8 overflow-hidden">
          <div className="bg-blue-50 px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-white rounded-xl shadow-sm">
                  <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-gray-900">Survey Management</h1>
                  <p className="mt-2 text-gray-600 max-w-2xl">
                    Upload and manage compensation survey data from multiple vendors. Map specialties and analyze trends across surveys.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setShowSaveConfirmation(true)}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl shadow-lg text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 transform hover:scale-105"
                >
                  <CheckCircleIcon className="w-5 h-5 mr-2" />
                  Mapping Complete
                </button>
              </div>
            </div>
          </div>

          {renderStepIndicator()}

          {/* Main Content */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
            <div className="p-6">
              {activeStep === 'upload' ? (
                renderDataPreview()
              ) : activeStep === 'mapping' ? (
                renderMappingInterface()
              ) : showPreview ? (
                renderDataPreview()
              ) : (
                renderSpecialtyMappingStep()
              )}
            </div>
          </div>

          {showTemplateSaveModal && renderTemplateSaveModal()}

          {/* Save Confirmation Dialog */}
          <Dialog 
            open={showSaveConfirmation} 
            onClose={() => setShowSaveConfirmation(false)}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-center min-h-screen">
              <div className="fixed inset-0 bg-black opacity-30" />
              
              <Dialog.Panel className="relative bg-white rounded-lg max-w-md w-full mx-4 p-6 shadow-xl">
                <Dialog.Title className="text-lg font-medium text-gray-900">
                  Save Specialty Mappings
                </Dialog.Title>
                
                <div className="mt-4">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to save the current specialty mappings? This will update all surveys with the new mappings.
                  </p>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowSaveConfirmation(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMappings}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Save Mappings
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </div>
      </div>
    </div>
  );
} 
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ChartBarIcon, ArrowUpTrayIcon, DocumentTextIcon, ExclamationCircleIcon, CheckCircleIcon, XCircleIcon, DocumentChartBarIcon, ArrowPathIcon, CheckIcon, TableCellsIcon, ArrowDownTrayIcon, UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline';
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
import { Dialog, Transition } from '@headlessui/react';
import { SpecialtyProgressDisplay } from '@/components/SpecialtyProgressDisplay';
import { SpecialtyMappingTest } from '@/components/SpecialtyMappingTest';
import { v4 as uuidv4 } from 'uuid';
import { validateSurveyUpload, backupDataBeforeChange } from '@/utils/globalRules';

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
  mappings?: ColumnMapping;
  columns?: string[];
  specialtyMappings?: MappingState;
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
  columns?: string[];
  specialtyMappings?: MappingState;
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

interface Survey {
  id: string;
  vendor: string;
  year: string;
  data: any[];
  mappings: ColumnMapping;
  specialtyMappings: MappingState;
  columns: string[];
}

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

export default function SurveyManagementPage(): JSX.Element {
  const [activeStep, setActiveStep] = useState<'upload' | 'mapping' | 'specialties' | 'preview'>('upload');
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [customVendorName, setCustomVendorName] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [fileData, setFileData] = useState<PreviewRow[]>([]);
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
  const [savedTemplates, setSavedTemplates] = useState<MappingTemplate[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [specialtyMappings, setSpecialtyMappings] = useState<MappingState>({});
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [autoDetectStatus, setAutoDetectStatus] = useState<'idle' | 'detecting' | 'complete'>('idle');
  const [mappingValidation, setMappingValidation] = useState<{[key: string]: boolean}>({});
  const [showMappingPreview, setShowMappingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedSurveys, setUploadedSurveys] = useState<UploadedSurvey[]>([]);
  const [showMappingInterface, setShowMappingInterface] = useState(false);
  const [isSurveySaved, setIsSurveySaved] = useState(false);
  const [specialtyProgress, setSpecialtyProgress] = useState(0);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [currentDecade, setCurrentDecade] = useState<number>(Math.floor(new Date().getFullYear() / 10) * 10);
  const [viewDecade, setViewDecade] = useState(Math.floor(new Date().getFullYear() / 10) * 10);
  const [surveys, setSurveys] = useState<DBSurvey[]>([]);
  const [currentSurvey, setCurrentSurvey] = useState<Survey | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping | null>(null);
  const [templates, setTemplates] = useState<MappingTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [showTemplateLoadModal, setShowTemplateLoadModal] = useState(false);

  const loadTemplates = async () => {
    try {
      setIsLoadingTemplates(true);
      const response = await fetch('/api/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoadingTemplates(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Load surveys only from Prisma
  useEffect(() => {
    loadSurveys();
  }, []);

  // Move loadSurveys outside of useEffect
  const loadSurveys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/surveys');
      
      if (!response.ok) {
        throw new Error('Failed to fetch surveys');
      }
      
      const data = await response.json();
      setSurveys(data);
      setUploadedSurveys(data); // Update the uploadedSurveys state with database data
    } catch (error) {
      console.error('Error loading surveys:', error);
      toast.error('Failed to load surveys');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Fix autoDetectMappings calls
  const handleAutoDetectMappings = (): void => {
    if (!selectedMapping || !columns) return;
    
    setAutoDetectStatus('detecting');
    const detectedMappings = autoDetectMappings(columns, selectedVendor);
    
    // Update the column mappings for the selected survey while preserving the survey list
    setUploadedSurveys((prevSurveys: UploadedSurvey[]) => 
      prevSurveys.map(survey => 
        survey.id === selectedMapping
          ? { ...survey, columnMappings: detectedMappings }
          : survey
      )
    );
    
    setColumnMapping(detectedMappings);
    setAutoDetectStatus('complete');
    
    // Update validation status
    const validations: {[key: string]: boolean} = {
      specialty: !!detectedMappings.specialty,
      provider_type: !!detectedMappings.provider_type,
      geographic_region: !!detectedMappings.geographic_region,
      n_orgs: !!detectedMappings.n_orgs,
      n_incumbents: !!detectedMappings.n_incumbents
    };

    ['tcc', 'wrvu', 'cf'].forEach(metric => {
      ['p25', 'p50', 'p75', 'p90'].forEach(percentile => {
        const key = `${metric}_${percentile}`;
        validations[key] = !!(detectedMappings[metric as keyof typeof detectedMappings] as any)[percentile];
      });
    });

    setMappingValidation(validations);
    setShowMappingPreview(true);
  };

  const autoDetectMappings = (columns: string[], vendor: string): ColumnMapping => {
    console.log('Starting autoDetectMappings with:', {
      columns,
      selectedMapping,
      selectedVendor
    });

    // Enhanced patterns for each field type
    const patterns = {
      specialty: [
        /specialty/i,
        /provider.*type/i,
        /physician.*type/i,
        /provider.*specialty/i,
        /physician.*specialty/i,
        /practice.*type/i,
        /department/i,
        /position/i
      ],
      provider_type: [
        /provider.*type/i,
        /physician.*type/i,
        /role/i,
        /position.*type/i,
        /job.*title/i,
        /title/i
      ],
      geographic_region: [
        /region/i,
        /geographic/i,
        /geography/i,
        /location/i,
        /market/i,
        /area/i,
        /territory/i
      ],
      n_orgs: [
        /n.*orgs/i,
        /num.*org/i,
        /organizations/i,
        /org.*count/i,
        /reporting.*orgs/i,
        /participants/i
      ],
      n_incumbents: [
        /n.*incumbents/i,
        /num.*incumbents/i,
        /incumbents/i,
        /individuals/i,
        /respondents/i,
        /physicians/i,
        /providers/i
      ],
      tcc: {
        p25: [
          /25.*(?:tcc|total.*cash|total.*comp|compensation)/i,
          /(?:tcc|total.*cash|total.*comp|compensation).*25/i,
          /comp.*25/i,
          /cash.*25/i,
          /salary.*25/i
        ],
        p50: [
          /50.*(?:tcc|total.*cash|total.*comp|compensation)/i,
          /(?:tcc|total.*cash|total.*comp|compensation).*50/i,
          /median.*(?:tcc|total.*cash|total.*comp|compensation)/i,
          /(?:tcc|total.*cash|total.*comp|compensation).*median/i,
          /comp.*50/i,
          /cash.*50/i,
          /salary.*50/i,
          /comp.*median/i
        ],
        p75: [
          /75.*(?:tcc|total.*cash|total.*comp|compensation)/i,
          /(?:tcc|total.*cash|total.*comp|compensation).*75/i,
          /comp.*75/i,
          /cash.*75/i,
          /salary.*75/i
        ],
        p90: [
          /90.*(?:tcc|total.*cash|total.*comp|compensation)/i,
          /(?:tcc|total.*cash|total.*comp|compensation).*90/i,
          /comp.*90/i,
          /cash.*90/i,
          /salary.*90/i
        ]
      },
      wrvu: {
        p25: [
          /25.*(?:wrvu|work.*rvu|rvu)/i,
          /(?:wrvu|work.*rvu|rvu).*25/i,
          /productivity.*25/i,
          /production.*25/i
        ],
        p50: [
          /50.*(?:wrvu|work.*rvu|rvu)/i,
          /(?:wrvu|work.*rvu|rvu).*50/i,
          /median.*(?:wrvu|work.*rvu|rvu)/i,
          /(?:wrvu|work.*rvu|rvu).*median/i,
          /productivity.*50/i,
          /production.*50/i,
          /productivity.*median/i
        ],
        p75: [
          /75.*(?:wrvu|work.*rvu|rvu)/i,
          /(?:wrvu|work.*rvu|rvu).*75/i,
          /productivity.*75/i,
          /production.*75/i
        ],
        p90: [
          /90.*(?:wrvu|work.*rvu|rvu)/i,
          /(?:wrvu|work.*rvu|rvu).*90/i,
          /productivity.*90/i,
          /production.*90/i
        ]
      },
      cf: {
        p25: [
          /25.*(?:cf|conversion.*factor|comp.*per.*rvu)/i,
          /(?:cf|conversion.*factor|comp.*per.*rvu).*25/i,
          /rate.*per.*rvu.*25/i,
          /dollars.*per.*rvu.*25/i
        ],
        p50: [
          /50.*(?:cf|conversion.*factor|comp.*per.*rvu)/i,
          /(?:cf|conversion.*factor|comp.*per.*rvu).*50/i,
          /median.*(?:cf|conversion.*factor|comp.*per.*rvu)/i,
          /(?:cf|conversion.*factor|comp.*per.*rvu).*median/i,
          /rate.*per.*rvu.*50/i,
          /dollars.*per.*rvu.*50/i,
          /rate.*per.*rvu.*median/i
        ],
        p75: [
          /75.*(?:cf|conversion.*factor|comp.*per.*rvu)/i,
          /(?:cf|conversion.*factor|comp.*per.*rvu).*75/i,
          /rate.*per.*rvu.*75/i,
          /dollars.*per.*rvu.*75/i
        ],
        p90: [
          /90.*(?:cf|conversion.*factor|comp.*per.*rvu)/i,
          /(?:cf|conversion.*factor|comp.*per.*rvu).*90/i,
          /rate.*per.*rvu.*90/i,
          /dollars.*per.*rvu.*90/i
        ]
      }
    };

    // Helper function to find best matching column using regex patterns
    const findBestMatch = (patterns: RegExp[], columns: string[]): string => {
      const normalizedColumns = columns.map(col => col.toLowerCase().replace(/[^a-z0-9]/g, '_'));
      
      // Try exact matches first
      for (const pattern of patterns) {
        const match = normalizedColumns.findIndex(col => pattern.test(col));
        if (match !== -1) {
          return columns[match];
        }
      }
      
      return '';
    };

    // Create new mapping for the selected survey
    const newMapping: ColumnMapping = {
      specialty: findBestMatch(patterns.specialty, columns),
      provider_type: findBestMatch(patterns.provider_type, columns),
      geographic_region: findBestMatch(patterns.geographic_region, columns),
      n_orgs: findBestMatch(patterns.n_orgs, columns),
      n_incumbents: findBestMatch(patterns.n_incumbents, columns),
      tcc: {
        p25: findBestMatch(patterns.tcc.p25, columns),
        p50: findBestMatch(patterns.tcc.p50, columns),
        p75: findBestMatch(patterns.tcc.p75, columns),
        p90: findBestMatch(patterns.tcc.p90, columns)
      },
      wrvu: {
        p25: findBestMatch(patterns.wrvu.p25, columns),
        p50: findBestMatch(patterns.wrvu.p50, columns),
        p75: findBestMatch(patterns.wrvu.p75, columns),
        p90: findBestMatch(patterns.wrvu.p90, columns)
      },
      cf: {
        p25: findBestMatch(patterns.cf.p25, columns),
        p50: findBestMatch(patterns.cf.p50, columns),
        p75: findBestMatch(patterns.cf.p75, columns),
        p90: findBestMatch(patterns.cf.p90, columns)
      }
    };

    // Update the survey with new mappings
    setUploadedSurveys(prevSurveys => 
      prevSurveys.map(survey => 
        survey.id === selectedMapping 
          ? { ...survey, columnMappings: newMapping }
          : survey
      )
    );

    return newMapping;
  };

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
    // Validate using global rules
    if (!validateSurveyUpload({
      vendor: selectedVendor,
      year: selectedYear,
      file: file
    })) {
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('vendor', selectedVendor === 'custom' ? customVendorName : selectedVendor);
      formData.append('year', selectedYear);

      // Get the API URL from environment or use the current origin
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      
      console.log('Attempting to upload to:', `${apiUrl}/api/surveys`);
      console.log('Form data contents:', {
        file: file.name,
        vendor: selectedVendor === 'custom' ? customVendorName : selectedVendor,
        year: selectedYear
      });
      
      const response = await fetch(`${apiUrl}/api/surveys`, {
        method: 'POST',
        // Don't set Content-Type header - let the browser set it with the boundary
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const result = await response.json();
      setCurrentSurvey(result);
      await loadSurveys();
      toast.success('Survey uploaded successfully');
      setIsSurveySaved(true);
      setActiveStep('mapping');
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError(error instanceof Error ? error.message : String(error));
      toast.error(`Failed to upload survey: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleColumnMappingChange = (
    category: keyof ColumnMapping,
    subcategory: keyof ColumnMappingMetric | null,
    value: string
  ) => {
    setColumnMapping(prev => {
      if (subcategory === null) {
        return {
          ...prev,
          [category]: value
        };
      }

      const metricData = prev[category] as ColumnMappingMetric;
      const updatedMetric = {
        ...metricData,
        [subcategory]: value
      };

      return {
        ...prev,
        [category]: updatedMetric
      };
    });
  };

  const saveTemplate = async () => {
    try {
      if (!currentSurvey || !columnMappings) {
        toast.error('No survey or column mappings to save');
        return;
      }

      const template: MappingTemplate = {
        id: uuidv4(),
        name: templateName,
        vendor: currentSurvey.vendor,
        year: currentSurvey.year,
        mapping: columnMappings,
        lastUsed: new Date().toISOString(),
      };

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(template),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      toast.success('Template saved successfully');
      setShowTemplateSaveModal(false);
      setTemplateName('');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const loadTemplate = async (template: MappingTemplate) => {
    try {
      const response = await fetch(`/api/templates/${template.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to load template');
      }

      const loadedTemplate = await response.json();
      setColumnMappings(loadedTemplate.mapping);
      toast.success('Template loaded successfully');
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    }
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
    // Preserve the full specialty name without any splitting or modification
    const updatedMappings = {
      ...specialtyMappings,
      [sourceSpecialty]: {
        mappedSpecialties: mappedSpecialties || [],
        notes,
        resolved: resolved ?? specialtyMappings[sourceSpecialty]?.resolved
      }
    };

    // Update state
    setSpecialtyMappings(updatedMappings);
    
    // Update all surveys with the new mappings
    const updatedSurveys = uploadedSurveys.map(survey => ({
      ...survey,
      specialtyMappings: updatedMappings
    }));
    
    setUploadedSurveys(updatedSurveys);
    localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
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

  const saveTemplateToStorage = async (name: string) => {
    try {
      if (!currentSurvey) return;

      const template = {
        id: uuidv4(),
        name,
        vendor: currentSurvey.vendor,
        year: currentSurvey.year,
        mapping: columnMapping,
        lastUsed: new Date().toISOString(),
      };

      await fetch("/api/surveys/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });

      toast.success("Template saved successfully");
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    }
  };

  // Update handleSaveMappings to use the API
  const handleSaveMappings = async () => {
    try {
      if (!currentSurvey) return;

      const updatedSurvey = {
        ...currentSurvey,
        columnMappings: columnMapping,
        specialtyMappings,
      };

      const response = await fetch("/api/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedSurvey),
      });

      if (!response.ok) {
        throw new Error("Failed to save survey");
      }

      const savedSurvey = await response.json();
      setCurrentSurvey(savedSurvey);
      toast.success("Mappings saved successfully");
    } catch (error) {
      console.error("Error saving mappings:", error);
      toast.error("Failed to save mappings");
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

  const autoArrangeSpecialties = () => {
    // Get all unmapped specialties (excluding single source)
    const unmappedList: UnmappedSpecialty[] = uploadedSurveys.reduce((acc: UnmappedSpecialty[], survey) => {
      const specialties = survey.data
        .map(row => ({
          specialty: String(row[survey.columnMappings.specialty] || '').trim(),
          vendor: survey.vendor
        }))
        .filter(s => {
          const mapping = specialtyMappings[s.specialty];
          return s.specialty && 
            !mapping?.resolved && 
            !mapping?.isSingleSource && // Explicitly check for single source
            !mapping?.mappedSpecialties?.length;
        });
      return [...acc, ...specialties];
    }, []);
    
    // Process each unmapped specialty
    unmappedList.forEach(source => {
      // Skip if already mapped
      if (specialtyMappings[source.specialty]) return;

      // Find potential matches from other vendors
      const potentialMatches: SpecialtyMatch[] = uploadedSurveys
        .flatMap(survey => 
          survey.data
            .map(row => ({
              specialty: String(row[survey.columnMappings.specialty] || '').trim(),
              vendor: survey.vendor,
              confidence: calculateStringSimilarity(source.specialty, String(row[survey.columnMappings.specialty] || '').trim())
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
        
        // Update both local state and parent component
        handleSpecialtyMappingChange(
          source.specialty,
          matchedSpecialties,
          'Auto-mapped specialty',
          true
        );

        // Save to localStorage
        const updatedSurveys = uploadedSurveys.map(survey => ({
          ...survey,
          specialtyMappings: {
            ...survey.specialtyMappings,
            [source.specialty]: {
              mappedSpecialties: matchedSpecialties,
              notes: 'Auto-mapped specialty',
              resolved: true
            }
          }
        }));
        
        setUploadedSurveys(updatedSurveys);
        localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
      }
    });

    // After processing specialties, calculate and save progress
    const progress = calculateSpecialtyProgress();
    setSpecialtyProgress(progress);
    
    // Update surveys with new progress
    const updatedSurveys = uploadedSurveys.map(survey => ({
      ...survey,
      specialtyMappings: specialtyMappings,
      mappingProgress: progress
    }));
    
    setUploadedSurveys(updatedSurveys);
    localStorage.setItem('uploadedSurveys', JSON.stringify(updatedSurveys));
    
    toast.success('Auto-arrangement complete! Mappings have been saved.');
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
    const data = survey.data.find((d: any) => d[survey.columnMappings.specialty] === specialty);
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
              <div className="flex-shrink-0 w-64 space-y-2">
                <select
                  id="vendor-select"
                  value={selectedVendor}
                  onChange={(e) => {
                    setSelectedVendor(e.target.value);
                    if (e.target.value !== 'CUSTOM') {
                      setCustomVendorName('');
                    }
                  }}
                  className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                >
                  <option value="" disabled>Select Survey Vendor</option>
                  <option value="MGMA">MGMA</option>
                  <option value="SULLIVANCOTTER">SullivanCotter</option>
                  <option value="GALLAGHER">Gallagher</option>
                  <option value="ECG">ECG Management</option>
                  <option value="AAMGA">AAMGA</option>
                  <option value="MERRIT_HAWKINS">Merrit Hawkins</option>
                  <option value="CUSTOM">Custom Survey</option>
                </select>
                {selectedVendor === 'CUSTOM' && (
                  <input
                    type="text"
                    value={customVendorName}
                    onChange={(e) => setCustomVendorName(e.target.value)}
                    placeholder="Enter custom survey name"
                    className="mt-2 block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6"
                  />
                )}
                
                {/* Year Input */}
                <div className="relative mt-2">
                  <input
                    type="text"
                    value={selectedYear || ''}
                    placeholder="Select Year"
                    onClick={() => setShowYearPicker(true)}
                    readOnly
                    className="block w-full rounded-md border-0 py-2 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-600 sm:text-sm sm:leading-6 cursor-pointer"
                  />
                </div>

                {/* Year Picker Calendar */}
                {showYearPicker && (
                  <div 
                    className="absolute mt-1 w-64 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50"
                  >
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between p-2 border-b border-gray-200">
                      <button
                        type="button"
                        onClick={() => setViewDecade(prev => prev - 10)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        {viewDecade} - {viewDecade + 9}
                      </span>
                      <button
                        type="button"
                        onClick={() => setViewDecade(prev => prev + 10)}
                        className="p-1 hover:bg-gray-100 rounded text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Years Grid */}
                    <div className="grid grid-cols-4 p-2 gap-1">
                      {Array.from({ length: 16 }, (_, i) => {
                        const year = viewDecade + i;
                        const isCurrentYear = year === new Date().getFullYear();
                        const isSelected = year.toString() === selectedYear;
                        const isFutureYear = year > new Date().getFullYear() + 1;
                        
                        return (
                          <button
                            key={year}
                            type="button"
                            disabled={isFutureYear}
                            onClick={() => {
                              setSelectedYear(year.toString());
                              setShowYearPicker(false);
                            }}
                            className={`
                              p-2 text-sm font-medium rounded transition-colors
                              ${isSelected 
                                ? 'bg-blue-600 text-white' 
                                : isCurrentYear
                                  ? 'bg-blue-50 text-blue-600'
                                  : isFutureYear
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-600 hover:bg-gray-50'
                              }
                            `}
                          >
                            {year}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                        onClick={(e) => {
                          e.preventDefault();
                          handleDeleteSurvey(survey.id);
                        }}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Delete Survey"
                      >
                        <TrashIcon className="h-5 w-5" />
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
                onClick={handleAutoDetectMappings}
                disabled={!selectedMapping}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white ${!selectedMapping ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Auto-Detect Mappings
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Mapping Progress</span>
            <span className="text-sm font-medium text-gray-900">{calculateProgress()}%</span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
              style={{ width: `${calculateProgress()}%` }}
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

  const calculateProgress = (): number => {
    if (!columnMapping) return 0;
    
    let totalPoints = 0;
    let mappedPoints = 0;
    
    // Required fields (1 point each)
    const requiredFields = ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'];
    requiredFields.forEach(field => {
      totalPoints += 1;
      if (columnMapping[field as keyof ColumnMapping]) mappedPoints += 1;
    });
    
    // TCC, WRVU, CF percentiles (4 points each = 12 points total)
    ['tcc', 'wrvu', 'cf'].forEach((metric) => {
      ['p25', 'p50', 'p75', 'p90'].forEach((percentile) => {
        totalPoints += 1;
        const metricMapping = columnMapping[metric as keyof ColumnMapping] as ColumnMappingMetric;
        if (metricMapping[percentile as keyof ColumnMappingMetric]) {
          mappedPoints += 1;
        }
      });
    });
    
    return Math.round((mappedPoints / totalPoints) * 100);
  };

  const renderTemplateSaveModal = () => (
    <Transition show={showTemplateSaveModal} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={() => setShowTemplateSaveModal(false)}
      >
        <div className="flex min-h-screen items-center justify-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-medium">Save Template</Dialog.Title>
              <div className="mt-4">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full rounded-md border border-gray-300 p-2"
                />
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowTemplateSaveModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={!templateName}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                    templateName ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'
                  }`}
                >
                  Save
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  const renderTemplateLoadModal = () => (
    <Transition show={showTemplateLoadModal} as={React.Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-50 overflow-y-auto"
        onClose={() => setShowTemplateLoadModal(false)}
      >
        <div className="flex min-h-screen items-center justify-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-30" />
          </Transition.Child>

          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="relative mx-auto max-w-md rounded-lg bg-white p-6 shadow-lg">
              <Dialog.Title className="text-lg font-medium">Load Template</Dialog.Title>
              <div className="mt-4 space-y-4">
                {isLoadingTemplates ? (
                  <div className="flex items-center justify-center">
                    <ArrowPathIcon className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-center text-gray-500">No templates found</p>
                ) : (
                  templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        loadTemplate(template);
                        setShowTemplateLoadModal(false);
                      }}
                      className="flex w-full items-center justify-between rounded-md border border-gray-300 p-4 hover:bg-gray-50"
                    >
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatVendorName(template.vendor)} - {template.year}
                        </p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Last used: {new Date(template.lastUsed).toLocaleDateString()}
                      </p>
                    </button>
                  ))
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowTemplateLoadModal(false)}
                  className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );

  const handleSurveySelect = async (surveyId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey');
      }
      const survey = await response.json();
      
      setSelectedMapping(surveyId);
      setColumns(survey.columns || []);
      setSelectedVendor(survey.vendor);
      setSelectedYear(survey.year);
      
      // Set column mappings if they exist, otherwise use empty defaults
      const defaultMapping: ColumnMapping = {
        specialty: '',
        provider_type: '',
        geographic_region: '',
        n_orgs: '',
        n_incumbents: '',
        tcc: { p25: '', p50: '', p75: '', p90: '' },
        wrvu: { p25: '', p50: '', p75: '', p90: '' },
        cf: { p25: '', p50: '', p75: '', p90: '' }
      };
      
      setColumnMapping(survey.columnMappings || defaultMapping);
      
      // Reset validation status
      setMappingValidation({});
      setShowMappingPreview(false);
      setAutoDetectStatus('idle');
      
    } catch (err) {
      console.error('Error fetching survey:', err);
      toast.error('Failed to fetch survey details');
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
    if (!specialtyMappings || Object.keys(specialtyMappings).length === 0) {
      return 0;
    }

    const totalSpecialties = Object.keys(specialtyMappings).length;
    const mappedSpecialties = Object.values(specialtyMappings).filter(
      (mapping) => mapping.resolved
    ).length;

    return (mappedSpecialties / totalSpecialties) * 100;
  };

  const handleSaveSurvey = async () => {
    try {
      setIsSaving(true);

      if (!currentSurvey) {
        toast.error('No survey to save');
        return;
      }

      const surveyData = {
        id: currentSurvey.id,
        vendor: currentSurvey.vendor,
        year: currentSurvey.year,
        data: currentSurvey.data,
        columnMappings: columnMapping,
        specialtyMappings,
        columns: currentSurvey.columns,
      };

      const method = currentSurvey.id ? 'PUT' : 'POST';
      const url = currentSurvey.id ? `/api/surveys/${currentSurvey.id}` : '/api/surveys';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(surveyData),
      });

      if (!response.ok) {
        throw new Error('Failed to save survey');
      }

      const savedSurvey = await response.json();
      toast.success('Survey saved successfully');
      
      // Update the surveys list
      await loadSurveys();
      
      // Update current survey with saved data
      setCurrentSurvey(savedSurvey);
    } catch (error) {
      console.error('Error saving survey:', error);
      toast.error('Failed to save survey');
    } finally {
      setIsSaving(false);
    }
  };

  const areAllStepsComplete = (): boolean => {
    // Check if we have uploaded surveys
    if (uploadedSurveys.length === 0) return false;

    // Check if column mapping is complete
    if (calculateProgress() !== 100) return false;

    // Check if specialty mapping is complete
    if (calculateSpecialtyProgress() !== 100) return false;

    return true;
  };

  // Update the handleAcceptSingleSource function to properly persist mappings
  const handleAcceptSingleSource = async (specialty: string, source: string) => {
    try {
      // Update the mapping state
      setSpecialtyMappings((prevMappings) => ({
        ...prevMappings,
        [specialty]: {
          ...prevMappings[specialty],
          accepted: source,
          status: 'complete'
        }
      }));
    } catch (error) {
      console.error('Error accepting single source:', error);
      toast.error('Failed to accept single source. Please try again.');
    }
  };

  // Add useEffect for loading surveys
  useEffect(() => {
    loadSurveys();
  }, []); // Empty dependency array since loadSurveys is defined outside useEffect

  // Add useEffect for calculating progress
  useEffect(() => {
    const progress = calculateProgress();
    setProgress(progress);
  }, [columnMapping]); // Recalculate when columnMapping changes

  // Add useEffect for calculating specialty progress
  useEffect(() => {
    const progress = calculateSpecialtyProgress();
    setSpecialtyProgress(progress);
  }, [specialtyMappings]); // Recalculate when specialtyMappings changes

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: templateName,
          mapping: columnMapping,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      const savedTemplate = await response.json();
      setTemplates([...templates, savedTemplate]);
      setShowTemplateSaveModal(false);
      setTemplateName('');
      toast.success('Template saved successfully');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5558';

  const handleDeleteSurvey = async (surveyId: string): Promise<void> => {
    if (!window.confirm('Are you sure you want to delete this survey?')) {
      return;
    }
    
    try {
      const response = await fetch(`${apiUrl}/api/surveys/${surveyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete survey');
      }
      
      // Update the local state
      setUploadedSurveys(prev => prev.filter(s => s.id !== surveyId));
      toast.success('Survey deleted successfully');
      
      // Refresh the surveys list
      await loadSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast.error('Failed to delete survey. Please try again.');
    }
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
          {showTemplateLoadModal && renderTemplateLoadModal()}

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
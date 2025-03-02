'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MappingState } from '@/types/mapping';

interface SurveyData {
  vendor: string;
  data: Array<{
    specialty: string;
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
  }>;
}

interface SurveyContextType {
  specialtyMappings: MappingState;
  surveyData: SurveyData[];
  confidenceScores: Record<string, number>;
  updateSpecialtyMapping: (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => void;
  loadSurveyData: () => void;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

// Use the existing storage key from SpecialtyMappingStudio
const STORAGE_KEY = 'specialty-mappings-v1';

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [specialtyMappings, setSpecialtyMappings] = useState<MappingState>({});
  const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});

  // Load specialty mappings from localStorage on mount and when storage changes
  useEffect(() => {
    const loadMappings = () => {
      try {
        const savedMappings = localStorage.getItem(STORAGE_KEY);
        if (savedMappings) {
          const parsedMappings = JSON.parse(savedMappings);
          // Convert MappedGroup[] to MappingState
          const mappingState: MappingState = {};
          parsedMappings.forEach((group: any) => {
            const sourceSpecialty = group.specialties[0].specialty;
            const mappedSpecialties = group.specialties.slice(1).map((s: any) => s.specialty);
            mappingState[sourceSpecialty] = {
              mappedSpecialties,
              notes: group.notes,
              isSingleSource: group.isSingleSource
            };
          });
          setSpecialtyMappings(mappingState);
        }
      } catch (error) {
        console.error('Error loading specialty mappings:', error);
      }
    };

    loadMappings();

    // Listen for changes to specialty-mappings-v1
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadMappings();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const updateSpecialtyMapping = (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => {
    console.log('Updating specialty mapping:', {
      sourceSpecialty,
      mappedSpecialties,
      notes
    });

    const updatedMappings = {
      ...specialtyMappings,
      [sourceSpecialty]: {
        mappedSpecialties,
        notes
      }
    };
    
    console.log('New specialty mappings state:', updatedMappings);
    
    // Update state
    setSpecialtyMappings(updatedMappings);
  };

  const loadSurveyData = () => {
    try {
      // Load survey data
      const storedSurveys = localStorage.getItem('uploadedSurveys');
      if (storedSurveys) {
        const parsedSurveys = JSON.parse(storedSurveys);
        
        // Transform the surveys into the expected format
        const transformedSurveys = parsedSurveys.map((survey: any) => {
          // Get all unique specialties from the survey data
          const specialties = Array.from(new Set(
            survey.data
              .map((row: any) => String(row[survey.mappings.specialty] || ''))
              .filter((s: string) => s && s.trim() !== '')
          ));

          // Create the transformed survey object
          return {
            vendor: survey.vendor,
            data: survey.data.map((row: any) => {
              const specialty = String(row[survey.mappings.specialty] || '').trim();
              if (!specialty) return null;

              return {
                specialty,
                tcc: {
                  p25: parseFloat(String(row[survey.mappings.tcc.p25] || '0')),
                  p50: parseFloat(String(row[survey.mappings.tcc.p50] || '0')),
                  p75: parseFloat(String(row[survey.mappings.tcc.p75] || '0')),
                  p90: parseFloat(String(row[survey.mappings.tcc.p90] || '0')),
                },
                wrvu: {
                  p25: parseFloat(String(row[survey.mappings.wrvu.p25] || '0')),
                  p50: parseFloat(String(row[survey.mappings.wrvu.p50] || '0')),
                  p75: parseFloat(String(row[survey.mappings.wrvu.p75] || '0')),
                  p90: parseFloat(String(row[survey.mappings.wrvu.p90] || '0')),
                },
                cf: {
                  p25: parseFloat(String(row[survey.mappings.cf.p25] || '0')),
                  p50: parseFloat(String(row[survey.mappings.cf.p50] || '0')),
                  p75: parseFloat(String(row[survey.mappings.cf.p75] || '0')),
                  p90: parseFloat(String(row[survey.mappings.cf.p90] || '0')),
                }
              };
            }).filter((row: any) => row !== null) // Remove null entries
          };
        });

        setSurveyData(transformedSurveys);
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    }
  };

  // Add effect to reload data when localStorage changes
  useEffect(() => {
    loadSurveyData();
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'uploadedSurveys') {
        loadSurveyData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = {
    specialtyMappings,
    surveyData,
    confidenceScores,
    updateSpecialtyMapping,
    loadSurveyData,
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurveyContext() {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error('useSurveyContext must be used within a SurveyProvider');
  }
  return context;
} 
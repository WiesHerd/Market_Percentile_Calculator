'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MappingState, SpecialtyMappingState } from '@/types/mapping';

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

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [specialtyMappings, setSpecialtyMappings] = useState<MappingState>({});
  const [surveyData, setSurveyData] = useState<SurveyData[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});

  const updateSpecialtyMapping = (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => {
    const updatedMappings = {
      ...specialtyMappings,
      [sourceSpecialty]: {
        mappedSpecialties,
        notes
      }
    };
    
    // Update state
    setSpecialtyMappings(updatedMappings);
    
    // Persist to localStorage
    try {
      localStorage.setItem('specialtyMappings', JSON.stringify(updatedMappings));
    } catch (error) {
      console.error('Error saving specialty mappings:', error);
    }
  };

  const loadSurveyData = () => {
    try {
      // First, try to load specialty mappings from localStorage
      const storedMappings = localStorage.getItem('specialtyMappings');
      if (storedMappings) {
        const parsedMappings = JSON.parse(storedMappings);
        setSpecialtyMappings(parsedMappings);
      }

      // Then load survey data
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
        
        // Only set specialty mappings from survey if none were found in localStorage
        if (!storedMappings) {
          // Set up the mappings exactly as shown in the first line of mapped specialties
          const defaultMappings: MappingState = {
            'Allergy and Immunology': {
              mappedSpecialties: ['Allergy/Immunology'],
              notes: 'Standard mapping for Allergy and Immunology variations',
              resolved: true
            }
          };

          setSpecialtyMappings(defaultMappings);
          localStorage.setItem('specialtyMappings', JSON.stringify(defaultMappings));
        }
      }
    } catch (error) {
      console.error('Error loading survey data:', error);
    }
  };

  // Calculate string similarity score (0-1)
  const calculateStringSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    // Remove common words and special characters
    const normalize = (s: string) => {
      return s
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\b(and|or|the|of|in|with|without)\b/g, '')
        .trim();
    };
    
    const n1 = normalize(s1);
    const n2 = normalize(s2);
    
    // Calculate Levenshtein distance
    const matrix: number[][] = [];
    
    for (let i = 0; i <= n1.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= n2.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= n1.length; i++) {
      for (let j = 1; j <= n2.length; j++) {
        if (n1[i-1] === n2[j-1]) {
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i-1][j-1] + 1,  // substitution
            matrix[i][j-1] + 1,    // insertion
            matrix[i-1][j] + 1     // deletion
          );
        }
      }
    }
    
    const maxLength = Math.max(n1.length, n2.length);
    const distance = matrix[n1.length][n2.length];
    
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
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
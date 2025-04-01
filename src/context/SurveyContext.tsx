'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface MappingState {
  [sourceSpecialty: string]: {
    mappedSpecialties: string[];
    notes?: string;
    isSingleSource?: boolean;
  };
}

interface SurveyContextType {
  specialtyMappings: MappingState;
  updateSpecialtyMapping: (surveyId: string, sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => Promise<void>;
  loadSurveyData: (surveyId: string) => Promise<void>;
}

const SurveyContext = createContext<SurveyContextType | undefined>(undefined);

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [specialtyMappings, setSpecialtyMappings] = useState<MappingState>({});

  // Load specialty mappings from API on mount
  useEffect(() => {
    const loadMappings = async () => {
      try {
        const response = await fetch('/api/specialty-mappings');
        if (!response.ok) {
          throw new Error('Failed to fetch specialty mappings');
        }
        const dbMappings = await response.json();

        // Convert API response to MappingState format
        const mappingState: MappingState = {};
        dbMappings.forEach((mapping: { sourceSpecialty: string; mappedSpecialty: string; notes?: string }) => {
          if (!mappingState[mapping.sourceSpecialty]) {
            mappingState[mapping.sourceSpecialty] = {
              mappedSpecialties: [],
              notes: mapping.notes
            };
          }
          mappingState[mapping.sourceSpecialty].mappedSpecialties.push(mapping.mappedSpecialty);
        });

        setSpecialtyMappings(mappingState);
      } catch (error) {
        console.error('Error loading specialty mappings:', error);
        toast.error('Failed to load specialty mappings');
      }
    };

    loadMappings();
  }, []);

  const updateSpecialtyMapping = async (surveyId: string, sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => {
    try {
      const response = await fetch('/api/specialty-mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId,
          sourceSpecialty,
          mappedSpecialties,
          notes
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update specialty mappings');
      }

      // Update state
      setSpecialtyMappings(prev => ({
        ...prev,
        [sourceSpecialty]: {
          mappedSpecialties,
          notes
        }
      }));

      toast.success('Specialty mapping updated successfully');
    } catch (error) {
      console.error('Error updating specialty mapping:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update specialty mapping');
    }
  };

  const loadSurveyData = async (surveyId: string) => {
    try {
      // Load survey data
      const response = await fetch(`/api/surveys/${surveyId}/data`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
      const data = await response.json();

      if (!data.surveyData?.length) {
        toast.error('No survey data found');
        return;
      }

      // Load associated specialty mappings
      const mappingsResponse = await fetch(`/api/specialty-mappings?surveyId=${surveyId}`);
      if (!mappingsResponse.ok) {
        throw new Error('Failed to fetch specialty mappings');
      }
      const mappings = await mappingsResponse.json();

      // Convert to MappingState format
      const mappingState: MappingState = {};
      mappings.forEach((mapping: { sourceSpecialty: string; mappedSpecialty: string; notes?: string }) => {
        if (!mappingState[mapping.sourceSpecialty]) {
          mappingState[mapping.sourceSpecialty] = {
            mappedSpecialties: [],
            notes: mapping.notes
          };
        }
        mappingState[mapping.sourceSpecialty].mappedSpecialties.push(mapping.mappedSpecialty);
      });

      setSpecialtyMappings(mappingState);
    } catch (error) {
      console.error('Error loading survey data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load survey data');
    }
  };

  return (
    <SurveyContext.Provider value={{
      specialtyMappings,
      updateSpecialtyMapping,
      loadSurveyData
    }}>
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey() {
  const context = useContext(SurveyContext);
  if (context === undefined) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
} 
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

interface SpecialtyMapping {
  id: string;
  sourceSpecialty: string;
  mappedSpecialty: string;
  notes?: string;
  confidence: number;
  isVerified: boolean;
  surveyId: string;
  surveyVendor: string;
  surveyYear: string;
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
        console.log("Fetching specialty mappings from API...");
        const response = await fetch('/api/specialty-mappings');
        if (!response.ok) {
          // If there are no mappings yet, that's okay - just return empty state
          if (response.status === 404) {
            console.log("No specialty mappings found yet - this is expected for new surveys");
            setSpecialtyMappings({});
            return;
          }
          throw new Error('Failed to fetch specialty mappings');
        }
        const mappings = await response.json();
        console.log("Received specialty mappings:", mappings);

        // Convert API response to MappingState format
        const mappingState: MappingState = {};
        
        // Handle both array and object formats
        if (Array.isArray(mappings)) {
          mappings.forEach((mapping: SpecialtyMapping) => {
            if (!mappingState[mapping.sourceSpecialty]) {
              mappingState[mapping.sourceSpecialty] = {
                mappedSpecialties: [],
                notes: mapping.notes || "",
                isSingleSource: false
              };
            }
            mappingState[mapping.sourceSpecialty].mappedSpecialties.push(mapping.mappedSpecialty);
          });
        } else {
          Object.entries(mappings).forEach(([sourceSpecialty, mapping]: [string, any]) => {
            mappingState[sourceSpecialty] = {
              mappedSpecialties: mapping.mappedSpecialties,
              notes: mapping.notes || "",
              isSingleSource: mapping.resolved
            };
          });
        }

        console.log("Transformed mapping state:", mappingState);
        setSpecialtyMappings(mappingState);
      } catch (error) {
        console.error("Error loading specialty mappings:", error);
        // Don't show error toast for expected empty state
        if (error instanceof Error && error.message !== 'Failed to fetch specialty mappings') {
          toast.error("Failed to load specialty mappings");
        }
      }
    };

    loadMappings();
  }, []);

  const updateSpecialtyMapping = async (
    surveyId: string,
    sourceSpecialty: string,
    mappedSpecialties: string[],
    notes?: string
  ) => {
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
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update specialty mapping');
      }

      // Update local state
      setSpecialtyMappings(prev => ({
        ...prev,
        [sourceSpecialty]: {
          mappedSpecialties,
          notes: notes || "",
          isSingleSource: mappedSpecialties.length === 1
        }
      }));
    } catch (error) {
      console.error('Error updating specialty mapping:', error);
      toast.error('Failed to update specialty mapping');
    }
  };

  const loadSurveyData = async (surveyId: string) => {
    try {
      const response = await fetch(`/api/surveys/${surveyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
      const data = await response.json();

      if (!data) {
        toast.error('No survey data found');
        return;
      }

      // Load associated specialty mappings
      const mappingsResponse = await fetch(`/api/specialty-mappings?surveyIds=${surveyId}`);
      if (!mappingsResponse.ok) {
        // If there are no mappings yet, that's okay
        if (mappingsResponse.status === 404) {
          console.log("No specialty mappings found for survey - this is expected for new surveys");
          return;
        }
        throw new Error('Failed to fetch specialty mappings');
      }
      const { mappings } = await mappingsResponse.json();

      // Convert to MappingState format
      const mappingState: MappingState = {};
      Object.entries(mappings).forEach(([sourceSpecialty, mapping]: [string, any]) => {
        mappingState[sourceSpecialty] = {
          mappedSpecialties: mapping.mappedSpecialties,
          notes: mapping.notes || "",
          isSingleSource: mapping.resolved
        };
      });

      setSpecialtyMappings(mappingState);
    } catch (error) {
      console.error('Error loading survey data:', error);
      toast.error('Failed to load survey data');
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
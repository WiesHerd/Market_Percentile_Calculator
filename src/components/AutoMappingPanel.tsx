"use client";

import React, { useState, useEffect } from 'react';
import { specialtyMappingService } from '@/services/specialtyMappingService';
import { specialtyManager } from '@/utils/specialtyManager';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SpecialtyData {
  specialty: string;
  vendor: string;
  metrics?: {
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
  };
}

interface AutoMapSuggestion {
  sourceSpecialty: SpecialtyData;
  suggestedMatches: Array<{
    specialty: SpecialtyData;
    confidence: number;
    reason: string;
    status?: 'approved' | 'rejected';
  }>;
}

interface AutoMappingPanelProps {
  specialtiesByVendor: Record<string, SpecialtyData[]>;
  onApproveMapping: (source: SpecialtyData, target: SpecialtyData) => void;
  onRejectMapping: (source: SpecialtyData, target: SpecialtyData) => void;
  onAddToSynonyms: (specialty: string) => void;
  mappedGroups: Array<{
    id: string;
    specialties: SpecialtyData[];
  }>;
}

export function AutoMappingPanel({
  specialtiesByVendor,
  onApproveMapping,
  onRejectMapping,
  onAddToSynonyms,
  mappedGroups
}: AutoMappingPanelProps) {
  const [autoMappings, setAutoMappings] = useState<AutoMapSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [synonymVersion, setSynonymVersion] = useState(0);

  // Create a set of already mapped specialties
  const mappedSpecialtySet = new Set(
    mappedGroups.flatMap(group =>
      group.specialties.map(s => `${s.specialty}:${s.vendor}`)
    )
  );

  // Listen for synonym changes
  useEffect(() => {
    const handleSynonymChange = () => {
      console.log('Synonym change detected in AutoMappingPanel');
      setSynonymVersion(v => v + 1);
    };

    // Subscribe to synonym changes
    window.addEventListener('synonyms-updated', handleSynonymChange);

    return () => {
      window.removeEventListener('synonyms-updated', handleSynonymChange);
    };
  }, []);

  useEffect(() => {
    console.log('Generating auto mappings, synonym version:', synonymVersion);
    generateAutoMappings();
  }, [specialtiesByVendor, mappedGroups, synonymVersion]);

  const generateAutoMappings = () => {
    setIsLoading(true);
    
    try {
      const newMappings: AutoMapSuggestion[] = [];
      
      // Helper function to normalize specialty names for comparison
      const normalizeSpecialty = (name: string) => {
        return name.toLowerCase()
          .replace(/\s+/g, ' ')  // normalize spaces
          .replace(/[\/\-–]/g, ' ')  // replace slashes and hyphens with spaces
          .trim();
      };

      // Process each vendor's specialties
      Object.entries(specialtiesByVendor).forEach(([sourceVendor, sourceSpecialties]) => {
        sourceSpecialties.forEach(sourceSpecialty => {
          // Skip if already mapped
          const sourceKey = `${sourceSpecialty.specialty}:${sourceVendor}`;
          if (mappedSpecialtySet.has(sourceKey)) {
            return;
          }

          const matches: AutoMapSuggestion['suggestedMatches'] = [];
          const normalizedSourceName = normalizeSpecialty(sourceSpecialty.specialty);
          
          console.log('Processing source specialty:', {
            original: sourceSpecialty.specialty,
            normalized: normalizedSourceName,
            vendor: sourceVendor
          });

          // First check for synonyms in the specialty manager
          const sourceSpecialtyObj = specialtyManager.searchSpecialties(sourceSpecialty.specialty)[0];
          const sourceSynonyms = sourceSpecialtyObj 
            ? [
                sourceSpecialtyObj.name,
                ...sourceSpecialtyObj.synonyms.predefined,
                ...sourceSpecialtyObj.synonyms.custom,
              ].map(s => normalizeSpecialty(s))
            : [normalizedSourceName];

          // Look for matches in other vendors
          Object.entries(specialtiesByVendor).forEach(([targetVendor, targetSpecialties]) => {
            if (targetVendor === sourceVendor) return;

            targetSpecialties.forEach(targetSpecialty => {
              // Skip if target is already mapped
              const targetKey = `${targetSpecialty.specialty}:${targetVendor}`;
              if (mappedSpecialtySet.has(targetKey)) {
                return;
              }

              const normalizedTargetName = normalizeSpecialty(targetSpecialty.specialty);
              
              console.log('Comparing specialties:', {
                source: {
                  original: sourceSpecialty.specialty,
                  normalized: normalizedSourceName,
                  vendor: sourceVendor,
                  synonyms: sourceSynonyms
                },
                target: {
                  original: targetSpecialty.specialty,
                  normalized: normalizedTargetName,
                  vendor: targetVendor
                }
              });

              // Check target specialty against source synonyms
              const targetSpecialtyObj = specialtyManager.searchSpecialties(targetSpecialty.specialty)[0];
              const targetSynonyms = targetSpecialtyObj
                ? [
                    targetSpecialtyObj.name,
                    ...targetSpecialtyObj.synonyms.predefined,
                    ...targetSpecialtyObj.synonyms.custom,
                  ].map(s => normalizeSpecialty(s))
                : [normalizedTargetName];

              // Check for direct matches first (including normalized forms)
              if (normalizedSourceName === normalizedTargetName) {
                console.log('Found exact match after normalization:', {
                  source: sourceSpecialty.specialty,
                  target: targetSpecialty.specialty
                });
                matches.push({
                  specialty: targetSpecialty,
                  confidence: 1,
                  reason: 'Exact match (normalized)'
                });
                return;
              }

              // Check for synonym matches
              const hasDirectSynonymMatch = sourceSynonyms.some(s1 => 
                targetSynonyms.some(s2 => s1 === s2)
              );

              if (hasDirectSynonymMatch) {
                console.log('Found synonym match:', {
                  source: sourceSpecialty.specialty,
                  target: targetSpecialty.specialty,
                  sourceSynonyms,
                  targetSynonyms
                });
                matches.push({
                  specialty: targetSpecialty,
                  confidence: 0.95,
                  reason: 'Synonym match'
                });
                return;
              }

              // Special handling for Critical Care variations
              const isCriticalCare = (name: string) => {
                const normalized = normalizeSpecialty(name);
                return normalized.includes('critical care') || 
                       normalized.includes('intensivist');
              };

              if (isCriticalCare(sourceSpecialty.specialty) && isCriticalCare(targetSpecialty.specialty)) {
                console.log('Found Critical Care match:', {
                  source: sourceSpecialty.specialty,
                  target: targetSpecialty.specialty
                });
                matches.push({
                  specialty: targetSpecialty,
                  confidence: 0.9,
                  reason: 'Critical Care specialty match'
                });
                return;
              }
            });
          });

          // Only add to auto-mappings if we found matches
          if (matches.length > 0) {
            newMappings.push({
              sourceSpecialty,
              suggestedMatches: matches.sort((a, b) => b.confidence - a.confidence)
            });
          }
        });
      });

      console.log('Generated mappings:', newMappings);
      setAutoMappings(newMappings);
    } catch (error) {
      console.error('Error generating auto-mappings:', error);
      toast.error('Error generating auto-mappings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = (mapping: AutoMapSuggestion, match: AutoMapSuggestion['suggestedMatches'][0]) => {
    onApproveMapping(mapping.sourceSpecialty, match.specialty);
    
    // Update local state
    setAutoMappings(current =>
      current.map(m => {
        if (m === mapping) {
          return {
            ...m,
            suggestedMatches: m.suggestedMatches.map(sm => ({
              ...sm,
              status: sm === match ? 'approved' : sm.status
            }))
          };
        }
        return m;
      })
    );
  };

  const handleReject = (mapping: AutoMapSuggestion, match: AutoMapSuggestion['suggestedMatches'][0]) => {
    onRejectMapping(mapping.sourceSpecialty, match.specialty);
    
    // Update local state
    setAutoMappings(current =>
      current.map(m => {
        if (m === mapping) {
          return {
            ...m,
            suggestedMatches: m.suggestedMatches.map(sm => ({
              ...sm,
              status: sm === match ? 'rejected' : sm.status
            }))
          };
        }
        return m;
      })
    );
  };

  if (isLoading) {
    return <div className="p-4 text-center">Loading auto mappings...</div>;
  }

  if (autoMappings.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No potential mappings found
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] w-full rounded-md border">
      <div className="p-4">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source Specialty
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Suggested Match
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Confidence
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {autoMappings.map((mapping) => (
              mapping.suggestedMatches.map((match, matchIndex) => (
                <tr key={`${mapping.sourceSpecialty.specialty}-${match.specialty.specialty}-${matchIndex}`}
                    className={match.status === 'rejected' ? 'bg-red-50' : match.status === 'approved' ? 'bg-green-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span>{mapping.sourceSpecialty.specialty}</span>
                      <span className="text-xs text-gray-500">{mapping.sourceSpecialty.vendor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex flex-col">
                      <span>{match.specialty.specialty}</span>
                      <span className="text-xs text-gray-500">{match.specialty.vendor}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {(match.confidence * 100).toFixed(0)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {match.reason}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex space-x-2">
                      {!match.status && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleApprove(mapping, match)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReject(mapping, match)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onAddToSynonyms(mapping.sourceSpecialty.specialty)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            ))}
          </tbody>
        </table>
      </div>
    </ScrollArea>
  );
} 
"use client";

import React, { useState, useEffect } from 'react';
import { specialtyMappingService } from '@/services/specialtyMappingService';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { normalizeSpecialtyName } from '@/utils/specialtyMapping';

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
      setSynonymVersion(v => v + 1);
    };

    // Subscribe to synonym changes
    window.addEventListener('synonyms-updated', handleSynonymChange);

    return () => {
      window.removeEventListener('synonyms-updated', handleSynonymChange);
    };
  }, []);

  useEffect(() => {
    generateAutoMappings();
  }, [specialtiesByVendor, mappedGroups, synonymVersion]);

  const generateAutoMappings = () => {
    setIsLoading(true);
    
    try {
      const newMappings: AutoMapSuggestion[] = [];

      // Process each vendor's specialties
      Object.entries(specialtiesByVendor).forEach(([sourceVendor, sourceSpecialties]) => {
        sourceSpecialties.forEach(sourceSpecialty => {
          // Skip if already mapped
          if (mappedSpecialtySet.has(`${sourceSpecialty.specialty}:${sourceVendor}`)) {
            return;
          }

          const matches: AutoMapSuggestion['suggestedMatches'] = [];

          // Look for matches in other vendors
          Object.entries(specialtiesByVendor).forEach(([targetVendor, targetSpecialties]) => {
            if (targetVendor === sourceVendor) return;

            targetSpecialties.forEach(targetSpecialty => {
              // Skip if target is already mapped
              if (mappedSpecialtySet.has(`${targetSpecialty.specialty}:${targetVendor}`)) {
                return;
              }

              // Get potential matches from the service
              const potentialMatches = specialtyMappingService.findPotentialMatches(sourceSpecialty.specialty);
              
              // Find if this target specialty is in the potential matches
              const matchInfo = potentialMatches.find(m => 
                normalizeSpecialtyName(m.match) === normalizeSpecialtyName(targetSpecialty.specialty)
              );

              if (matchInfo) {
                matches.push({
                  specialty: targetSpecialty,
                  confidence: matchInfo.confidence,
                  reason: matchInfo.reason
                });
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
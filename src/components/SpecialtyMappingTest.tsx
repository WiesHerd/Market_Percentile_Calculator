import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { specialtyManager } from '@/utils/specialtyManager';

interface MappingResult {
  sourceSpecialty: string;
  sourceVendor: string;
  matches: {
    targetSpecialty: string;
    targetVendor: string;
    confidence: number;
    matchType: 'exact' | 'synonym' | 'similar';
    reason: string;
  }[];
}

export function SpecialtyMappingTest() {
  const [mappingResults, setMappingResults] = useState<MappingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function testAutoMapping() {
      // Sample data from different vendors
      const testData = [
        {
          vendor: 'MGMA',
          specialties: [
            'Cardiology',
            'Family Medicine',
            'Internal Medicine',
            'Orthopedics',
            'Pediatrics'
          ]
        },
        {
          vendor: 'SULLIVANCOTTER',
          specialties: [
            'Cardiovascular Disease',
            'Family Practice',
            'General Internal Medicine',
            'Orthopaedic Surgery',
            'General Pediatrics'
          ]
        },
        {
          vendor: 'GALLAGHER',
          specialties: [
            'Cardiology (General)',
            'Family Medicine (General)',
            'Internal Medicine (General)',
            'Orthopedics (General)',
            'Pediatrics (General)'
          ]
        }
      ];

      const results: MappingResult[] = [];

      // Test each specialty against others
      for (const source of testData) {
        for (const sourceSpecialty of source.specialties) {
          const matches = [];

          for (const target of testData) {
            if (target.vendor === source.vendor) continue;

            for (const targetSpecialty of target.specialties) {
              // Use specialtyManager to find matches
              const sourceMatches = specialtyManager.searchSpecialties(sourceSpecialty);
              const targetMatches = specialtyManager.searchSpecialties(targetSpecialty);

              // Calculate similarity based on specialty matches
              let similarity = 0;
              let matchType: 'exact' | 'synonym' | 'similar' = 'similar';
              let reason = '';

              // Check for exact match
              const normalizedSource = sourceSpecialty.toLowerCase().trim();
              const normalizedTarget = targetSpecialty.toLowerCase().trim();
              
              if (normalizedSource === normalizedTarget) {
                similarity = 1;
                matchType = 'exact';
                reason = 'Exact match';
              }
              // Check for synonyms
              else if (sourceMatches.some(s1 => targetMatches.some(s2 => s1.id === s2.id))) {
                similarity = 0.95;
                matchType = 'synonym';
                reason = 'Synonym match';
              }
              // Check for similar specialties
              else {
                // Calculate string similarity
                const sourceWords = normalizedSource.split(/\s+/);
                const targetWords = normalizedTarget.split(/\s+/);
                const commonWords = sourceWords.filter(word => targetWords.includes(word));
                similarity = commonWords.length / Math.max(sourceWords.length, targetWords.length);
                reason = `String similarity: ${(similarity * 100).toFixed(1)}%`;
              }

              if (similarity > 0.7) {
                matches.push({
                  targetSpecialty,
                  targetVendor: target.vendor,
                  confidence: similarity,
                  matchType,
                  reason
                });
              }
            }
          }

          if (matches.length > 0) {
            results.push({
              sourceSpecialty,
              sourceVendor: source.vendor,
              matches: matches.sort((a, b) => b.confidence - a.confidence)
            });
          }
        }
      }

      setMappingResults(results);
      setIsLoading(false);
    }

    testAutoMapping();
  }, []);

  if (isLoading) {
    return <div>Loading test results...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Specialty Mapping Test Results</h2>
      {mappingResults.map((result, index) => (
        <Card key={index} className="p-4">
          <div className="font-semibold mb-2">
            {result.sourceSpecialty} ({result.sourceVendor})
          </div>
          <div className="space-y-2">
            {result.matches.map((match, matchIndex) => (
              <div key={matchIndex} className="flex items-center gap-2">
                <Badge variant={
                  match.matchType === 'exact' ? 'default' :
                  match.matchType === 'synonym' ? 'secondary' :
                  'outline'
                }>
                  {match.matchType}
                </Badge>
                <span className="font-medium">{match.targetSpecialty}</span>
                <span className="text-muted-foreground">({match.targetVendor})</span>
                <span className="text-sm text-muted-foreground">- {match.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
} 
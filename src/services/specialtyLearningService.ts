import { calculateStringSimilarity } from '@/utils/string';
import { specialtyManager } from '@/utils/specialtyManager';

export interface LearningEvent {
  type: 'manual_map' | 'auto_map_approve' | 'auto_map_reject' | 'synonym_add' | 'synonym_remove';
  sourceSpecialty: string;
  targetSpecialty?: string;
  confidence: number;
  reason: string;
  timestamp: Date;
  vendor?: string;
  patterns?: {
    wordMatch?: number;
    prefixMatch?: number;
    suffixMatch?: number;
    acronymMatch?: boolean;
    vendorSpecific?: boolean;
  };
  chainedSpecialties?: {
    specialty: string;
    vendor: string;
  }[];
}

export interface LearningRule {
  id: string;
  pattern: string;
  confidence: number;
  isActive: boolean;
  createdAt: Date;
  lastApplied?: Date;
  successCount: number;
  failureCount: number;
  matchType: 'exact' | 'prefix' | 'suffix' | 'acronym' | 'similar' | 'vendor_specific';
  examples: Array<{
    source: string;
    target: string;
    confidence: number;
    timestamp: Date;
  }>;
  vendorContext?: {
    vendor: string;
    successRate: number;
  };
}

export interface LearningStats {
  totalMappings: number;
  accuracyRate: number;
  activeRules: number;
  recentLearnings: LearningEvent[];
  vendorStats: Record<string, {
    totalMappings: number;
    successRate: number;
  }>;
  patternSuccess: {
    exact: number;
    prefix: number;
    suffix: number;
    acronym: number;
    similar: number;
    vendorSpecific: number;
  };
}

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

interface MappedGroup {
  id: string;
  specialties: SpecialtyData[];
  createdAt: Date;
  isSingleSource?: boolean;
}

export interface UnmappedSpecialty {
  specialty: string;
  vendor: string;
}

const MAPPINGS_STORAGE_KEY = 'specialty-mappings-v1';
const LEARNING_STORAGE_KEY = 'specialty-learning-data';

export class SpecialtyLearningService {
  private learningEvents: LearningEvent[] = [];
  private rules: LearningRule[] = [];
  private mappedGroups: MappedGroup[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      // Load mapped groups from SpecialtyMappingStudio
      const mappingsData = localStorage.getItem(MAPPINGS_STORAGE_KEY);
      if (mappingsData) {
        this.mappedGroups = JSON.parse(mappingsData).map((group: any) => ({
          ...group,
          createdAt: new Date(group.createdAt)
        }));
      }

      // Load learning data
      const learningData = localStorage.getItem(LEARNING_STORAGE_KEY);
      if (learningData) {
        const data = JSON.parse(learningData);
        
        // Initialize rules array if data is missing or malformed
        this.rules = Array.isArray(data?.rules) ? data.rules.map((rule: any) => ({
          id: rule.id || Math.random().toString(36).substr(2, 9),
          pattern: rule.pattern || '',
          confidence: rule.confidence || 0,
          isActive: rule.isActive ?? true,
          createdAt: new Date(rule.createdAt || Date.now()),
          lastApplied: rule.lastApplied ? new Date(rule.lastApplied) : undefined,
          successCount: rule.successCount || 0,
          failureCount: rule.failureCount || 0,
          matchType: rule.matchType || 'similar',
          examples: Array.isArray(rule.examples) ? rule.examples.map((ex: any) => ({
            source: ex.source || '',
            target: ex.target || '',
            confidence: ex.confidence || 0,
            timestamp: new Date(ex.timestamp || Date.now())
          })) : [],
          vendorContext: rule.vendorContext ? {
            vendor: rule.vendorContext.vendor || '',
            successRate: rule.vendorContext.successRate || 0
          } : undefined
        })) : [];
      }

      // Convert mapped groups to learning events - show complete mapping chains
      this.learningEvents = this.mappedGroups.map(group => {
        // Skip single source mappings
        if (group.isSingleSource || group.specialties.length < 2) {
          return null;
        }

        // Create a single event that represents the entire mapping chain
        return {
          type: 'manual_map',
          sourceSpecialty: group.specialties[0].specialty,
          targetSpecialty: group.specialties[0].specialty, // Same as source since it's the reference
          confidence: 1,
          reason: 'Mapping chain',
          timestamp: group.createdAt,
          vendor: group.specialties[0].vendor,
          chainedSpecialties: group.specialties.map(s => ({
            specialty: s.specialty,
            vendor: s.vendor
          }))
        };
      }).filter(Boolean) as LearningEvent[];
    } catch (error) {
      console.error('Error loading data:', error);
      this.learningEvents = [];
      this.rules = [];
      this.mappedGroups = [];
    }
  }

  private saveToStorage() {
    try {
      // Save learning rules
      localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify({
        rules: this.rules
      }));

      // Save mapped groups back to SpecialtyMappingStudio storage
      localStorage.setItem(MAPPINGS_STORAGE_KEY, JSON.stringify(this.mappedGroups));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  private analyzePatterns(source: string, target: string): LearningEvent['patterns'] {
    const normalizedSource = source.toLowerCase().trim();
    const normalizedTarget = target.toLowerCase().trim();
    
    const sourceWords = normalizedSource.split(' ');
    const targetWords = normalizedTarget.split(' ');
    
    const wordMatch = sourceWords.filter(word => targetWords.includes(word)).length / 
                     Math.max(sourceWords.length, targetWords.length);
    
    const prefixMatch = sourceWords[0] === targetWords[0] ? 1 : 0;
    const suffixMatch = sourceWords[sourceWords.length - 1] === targetWords[targetWords.length - 1] ? 1 : 0;
    
    // Check for acronym matches
    const sourceAcronym = sourceWords.map(w => w[0]).join('');
    const targetAcronym = targetWords.map(w => w[0]).join('');
    const acronymMatch = sourceAcronym === targetAcronym;

    return {
      wordMatch,
      prefixMatch,
      suffixMatch,
      acronymMatch
    };
  }

  recordManualMapping(sourceSpecialty: string, targetSpecialty: string, vendor?: string) {
    const patterns = this.analyzePatterns(sourceSpecialty, targetSpecialty);
    
    const event: LearningEvent = {
      type: 'manual_map',
      sourceSpecialty,
      targetSpecialty,
      confidence: 1,
      reason: 'Manual user mapping',
      timestamp: new Date(),
      vendor,
      patterns
    };

    this.learningEvents.push(event);
    this.saveToStorage();
    this.generateRules();
  }

  recordAutoMapDecision(
    sourceSpecialty: string,
    targetSpecialty: string,
    approved: boolean,
    confidence: number,
    vendor?: string
  ) {
    const patterns = this.analyzePatterns(sourceSpecialty, targetSpecialty);
    
    const event: LearningEvent = {
      type: approved ? 'auto_map_approve' : 'auto_map_reject',
      sourceSpecialty,
      targetSpecialty,
      confidence,
      reason: approved ? 'Auto-map approval' : 'Auto-map rejection',
      timestamp: new Date(),
      vendor,
      patterns
    };

    this.learningEvents.push(event);
    this.saveToStorage();
    this.generateRules();
  }

  recordSynonymChange(sourceSpecialty: string, synonym: string, isAdd: boolean) {
    const patterns = this.analyzePatterns(sourceSpecialty, synonym);
    
    const event: LearningEvent = {
      type: isAdd ? 'synonym_add' : 'synonym_remove',
      sourceSpecialty,
      targetSpecialty: synonym,
      confidence: 1,
      reason: isAdd ? 'Synonym addition' : 'Synonym removal',
      timestamp: new Date(),
      patterns
    };

    this.learningEvents.push(event);
    this.saveToStorage();
    this.generateRules();
  }

  getStats(): LearningStats {
    // Calculate total mappings (count all connections in chains)
    const totalMappings = this.mappedGroups.reduce((count, group) => {
      if (!group.isSingleSource && group.specialties.length > 1) {
        return count + (group.specialties.length - 1); // Count connections in chain
      }
      return count;
    }, 0);

    // Calculate vendor stats
    const vendorStats: Record<string, { totalMappings: number; successRate: number }> = {};
    this.mappedGroups.forEach(group => {
      if (!group.isSingleSource && group.specialties.length > 1) {
        group.specialties.forEach(specialty => {
          const vendor = specialty.vendor;
          if (vendor) {
            if (!vendorStats[vendor]) {
              vendorStats[vendor] = { totalMappings: 0, successRate: 1 };
            }
            vendorStats[vendor].totalMappings++;
          }
        });
      }
    });

    // Calculate pattern success rates
    const patternCounts = {
      exact: 0,
      prefix: 0,
      suffix: 0,
      acronym: 0,
      similar: 0,
      vendorSpecific: 0
    };

    this.mappedGroups.forEach(group => {
      if (!group.isSingleSource && group.specialties.length > 1) {
        // Compare each adjacent pair in the chain
        for (let i = 0; i < group.specialties.length - 1; i++) {
          const source = group.specialties[i];
          const target = group.specialties[i + 1];
          const patterns = this.analyzePatterns(source.specialty, target.specialty);
          if (patterns) {
            if (patterns.wordMatch === 1) patternCounts.exact++;
            else if (patterns.prefixMatch === 1) patternCounts.prefix++;
            else if (patterns.suffixMatch === 1) patternCounts.suffix++;
            else if (patterns.acronymMatch) patternCounts.acronym++;
            else patternCounts.similar++;
          }
        }
      }
    });

    // Calculate total pattern matches for percentage calculation
    const totalPatterns = Object.values(patternCounts).reduce((a, b) => a + b, 0);

    return {
      totalMappings,
      accuracyRate: 100, // All manual mappings are considered 100% accurate
      activeRules: this.rules.filter(r => r.isActive).length,
      recentLearnings: this.learningEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 100), // Only return the 100 most recent learnings
      vendorStats,
      patternSuccess: {
        exact: totalPatterns ? (patternCounts.exact / totalPatterns) * 100 : 0,
        prefix: totalPatterns ? (patternCounts.prefix / totalPatterns) * 100 : 0,
        suffix: totalPatterns ? (patternCounts.suffix / totalPatterns) * 100 : 0,
        acronym: totalPatterns ? (patternCounts.acronym / totalPatterns) * 100 : 0,
        similar: totalPatterns ? (patternCounts.similar / totalPatterns) * 100 : 0,
        vendorSpecific: 0 // Not currently used
      }
    };
  }

  private calculateAccuracyRate(): number {
    const autoMapEvents = this.learningEvents.filter(
      e => e.type === 'auto_map_approve' || e.type === 'auto_map_reject'
    );
    
    if (autoMapEvents.length === 0) return 0;
    
    const approvedCount = autoMapEvents.filter(
      e => e.type === 'auto_map_approve'
    ).length;
    
    return (approvedCount / autoMapEvents.length) * 100;
  }

  private generateRules() {
    // Clear existing rules that haven't been successful
    this.rules = this.rules.filter(rule => 
      rule.successCount > 0 || rule.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    // Analyze patterns in successful mappings
    const successfulMappings = this.learningEvents.filter(
      e => e.type === 'manual_map' || e.type === 'auto_map_approve'
    );

    // Group by source specialty
    const mappingsBySource = new Map<string, LearningEvent[]>();
    successfulMappings.forEach(event => {
      const current = mappingsBySource.get(event.sourceSpecialty) || [];
      mappingsBySource.set(event.sourceSpecialty, [...current, event]);
    });

    // Create or update rules based on patterns
    mappingsBySource.forEach((events, sourceSpecialty) => {
      events.forEach(event => {
        if (!event.targetSpecialty) return;

        // Determine match type based on patterns
        let matchType: LearningRule['matchType'] = 'similar';
        if (event.patterns) {
          if (event.patterns.wordMatch === 1) matchType = 'exact';
          else if (event.patterns.prefixMatch === 1) matchType = 'prefix';
          else if (event.patterns.suffixMatch === 1) matchType = 'suffix';
          else if (event.patterns.acronymMatch) matchType = 'acronym';
          else if (event.patterns.vendorSpecific) matchType = 'vendor_specific';
        }

        const rulePattern = `${sourceSpecialty} → ${event.targetSpecialty}`;
        const existingRule = this.rules.find(r => r.pattern === rulePattern);

        if (existingRule) {
          existingRule.successCount++;
          existingRule.lastApplied = new Date();
          existingRule.confidence = Math.min(1, existingRule.confidence + 0.1);
          existingRule.examples.push({
            source: sourceSpecialty,
            target: event.targetSpecialty,
            confidence: event.confidence,
            timestamp: event.timestamp
          });
          if (event.vendor && (!existingRule.vendorContext || existingRule.vendorContext.vendor === event.vendor)) {
            existingRule.vendorContext = {
              vendor: event.vendor,
              successRate: (existingRule.vendorContext?.successRate || 0) + 1
            };
          }
        } else {
          this.rules.push({
            id: Math.random().toString(36).substr(2, 9),
            pattern: rulePattern,
            confidence: event.confidence,
            isActive: true,
            createdAt: new Date(),
            lastApplied: new Date(),
            successCount: 1,
            failureCount: 0,
            matchType,
            examples: [{
              source: sourceSpecialty,
              target: event.targetSpecialty,
              confidence: event.confidence,
              timestamp: event.timestamp
            }],
            ...(event.vendor ? {
              vendorContext: {
                vendor: event.vendor,
                successRate: 1
              }
            } : {})
          });
        }
      });
    });

    this.saveToStorage();
  }

  getRules(): LearningRule[] {
    return this.rules.sort((a, b) => b.confidence - a.confidence);
  }

  toggleRule(ruleId: string) {
    const rule = this.rules.find(r => r.id === ruleId);
    if (rule) {
      rule.isActive = !rule.isActive;
      this.saveToStorage();
    }
  }

  // Get suggestions for a specialty
  getSuggestions(specialty: string, vendor: string): Array<{
    targetSpecialty: string;
    confidence: number;
    reason: string;
    rule?: LearningRule;
  }> {
    const suggestions: Array<{
      targetSpecialty: string;
      confidence: number;
      reason: string;
      rule?: LearningRule;
    }> = [];

    // Check active rules first
    this.rules
      .filter(r => r.isActive)
      .forEach(rule => {
        const [source] = rule.pattern.split(' → ');
        if (source === specialty) {
          const [, target] = rule.pattern.split(' → ');
          suggestions.push({
            targetSpecialty: target,
            confidence: rule.confidence,
            reason: `Based on ${rule.matchType} match pattern with ${rule.successCount} successful uses`,
            rule
          });
        }
      });

    // Add pattern-based suggestions
    const normalizedSpecialty = specialty.toLowerCase().trim();
    const patterns = this.analyzePatterns(specialty, specialty); // Get base patterns

    this.learningEvents
      .filter(e => e.type === 'manual_map' || e.type === 'auto_map_approve')
      .forEach(event => {
        if (!event.targetSpecialty) return;
        
        const eventPatterns = event.patterns || {};
        let confidence = 0;
        let reason = '';

        if (eventPatterns.wordMatch && eventPatterns.wordMatch > 0.7) {
          confidence = eventPatterns.wordMatch;
          reason = 'Similar word patterns';
        } else if (eventPatterns.acronymMatch) {
          confidence = 0.8;
          reason = 'Matching acronyms';
        } else if (eventPatterns.prefixMatch || eventPatterns.suffixMatch) {
          confidence = 0.7;
          reason = 'Matching prefix or suffix';
        }

        if (confidence > 0) {
          suggestions.push({
            targetSpecialty: event.targetSpecialty,
            confidence,
            reason
          });
        }
      });

    // Sort by confidence and remove duplicates
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .filter((suggestion, index, self) =>
        index === self.findIndex(s => s.targetSpecialty === suggestion.targetSpecialty)
      );
  }

  getUnmappedSpecialties(): UnmappedSpecialty[] {
    // Get all specialties from mapped groups
    const mappedSpecialties = new Set(
      this.mappedGroups.flatMap(group => 
        group.specialties.map(s => `${s.specialty}|${s.vendor}`)
      )
    );

    // Get all specialties that appear in learning events
    const allSpecialties = new Set(
      this.learningEvents.flatMap(event => {
        const specialties: string[] = [];
        if (event.sourceSpecialty && event.vendor) {
          specialties.push(`${event.sourceSpecialty}|${event.vendor}`);
        }
        if (event.targetSpecialty && event.vendor) {
          specialties.push(`${event.targetSpecialty}|${event.vendor}`);
        }
        return specialties;
      })
    );

    // Return specialties that appear in learning events but not in mapped groups
    return Array.from(allSpecialties)
      .filter(specialty => !mappedSpecialties.has(specialty))
      .map(specialty => {
        const [name, vendor] = specialty.split('|');
        return { specialty: name, vendor };
      });
  }
}

// Export a singleton instance
export const specialtyLearningService = new SpecialtyLearningService(); 
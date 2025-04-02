import { ColumnMapping, ColumnMappingMetric } from '../types';

export interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
}

export const validateColumnMappings = (mappings: ColumnMapping | undefined): ValidationResult => {
  const missingFields: string[] = [];
  const errors: string[] = [];

  if (!mappings) {
    return {
      isValid: false,
      missingFields: ['all fields'],
      errors: ['No column mappings provided']
    };
  }

  // Check basic fields
  const basicFields = ['specialty', 'provider_type', 'geographic_region', 'n_orgs', 'n_incumbents'] as const;
  basicFields.forEach(field => {
    if (!mappings[field]) {
      missingFields.push(field);
    }
  });

  // Check metric fields
  const metrics = ['tcc', 'wrvu', 'cf'] as const;
  const percentiles = ['p25', 'p50', 'p75', 'p90'] as const;

  metrics.forEach(metric => {
    const metricMapping = mappings[metric];
    if (!metricMapping) {
      missingFields.push(metric);
      return;
    }

    percentiles.forEach(percentile => {
      if (!metricMapping[percentile]) {
        missingFields.push(`${metric}.${percentile}`);
      }
    });
  });

  // Validate that mapped columns are strings and not empty
  Object.entries(mappings).forEach(([key, value]) => {
    if (key === 'tcc' || key === 'wrvu' || key === 'cf') {
      Object.entries(value as ColumnMappingMetric).forEach(([percentile, columnName]) => {
        if (typeof columnName !== 'string' || !columnName.trim()) {
          errors.push(`Invalid ${key}.${percentile} mapping: ${columnName}`);
        }
      });
    } else if (typeof value !== 'string' || !value.trim()) {
      errors.push(`Invalid ${key} mapping: ${value}`);
    }
  });

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors
  };
};

export const validateSpecialtyMappings = (mappings: Record<string, any>): ValidationResult => {
  const errors: string[] = [];
  const missingFields: string[] = [];

  if (!mappings || Object.keys(mappings).length === 0) {
    return {
      isValid: false,
      missingFields: ['specialtyMappings'],
      errors: ['No specialty mappings provided']
    };
  }

  Object.entries(mappings).forEach(([sourceSpecialty, mapping]) => {
    if (!mapping.mappedSpecialties || !Array.isArray(mapping.mappedSpecialties)) {
      errors.push(`Invalid mapping for specialty: ${sourceSpecialty}`);
    }
  });

  return {
    isValid: errors.length === 0,
    missingFields,
    errors
  };
}; 
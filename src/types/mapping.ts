export interface SpecialtyMappingState {
  mappedSpecialties: string[];
  notes?: string;
  resolved?: boolean;
  isSingleSource?: boolean;
}

export interface MappingState {
  [specialty: string]: SpecialtyMappingState;
}

export interface Node {
  id: string;
  label: string;
  type: 'source' | 'target';
  confidence?: number;
}

export interface Link {
  source: string;
  target: string;
  confidence: number;
}

export interface GraphNode extends Node {
  id: string;
  label: string;
  type: 'source' | 'target';
  confidence?: number;
  x?: number;
  y?: number;
}

export interface GraphLink extends Link {
  source: string;
  target: string;
  confidence: number;
} 
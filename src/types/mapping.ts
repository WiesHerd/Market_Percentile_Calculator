export interface SpecialtyMapping {
  mappedSpecialties: string[];
  notes?: string;
}

export interface MappingState {
  [specialty: string]: SpecialtyMapping;
}

export interface Node {
  id: string;
  label: string;
  type: 'source' | 'target';
  confidence?: number;
  x?: number;
  y?: number;
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
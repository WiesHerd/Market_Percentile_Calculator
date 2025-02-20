import React from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { motion } from 'framer-motion';
import { MappingState, Node, Link, SpecialtyMapping } from '@/types/mapping';

interface SpecialtyMappingVisualizerProps {
  specialtyMappings: MappingState;
  onMappingChange: (sourceSpecialty: string, mappedSpecialties: string[], notes?: string) => void;
  confidenceScores: Record<string, number>;
}

interface GraphNode extends Node {
  x?: number;
  y?: number;
}

interface GraphLink extends Link {
  source: string;
  target: string;
}

const SpecialtyMappingVisualizer: React.FC<SpecialtyMappingVisualizerProps> = ({
  specialtyMappings,
  onMappingChange,
  confidenceScores,
}) => {
  // Create nodes and links for the force graph
  const nodes = React.useMemo(() => {
    const result: GraphNode[] = [];
    const addedNodes = new Set<string>();
    
    // Add source specialty nodes
    Object.entries(specialtyMappings).forEach(([specialty, mapping]) => {
      if (!addedNodes.has(`source_${specialty}`)) {
        result.push({
          id: `source_${specialty}`,
          label: specialty,
          type: 'source',
          confidence: confidenceScores[specialty] || 0,
        });
        addedNodes.add(`source_${specialty}`);
      }

      // Add target specialty nodes
      mapping.mappedSpecialties.forEach(targetSpecialty => {
        if (!addedNodes.has(`target_${targetSpecialty}`)) {
          result.push({
            id: `target_${targetSpecialty}`,
            label: targetSpecialty,
            type: 'target',
          });
          addedNodes.add(`target_${targetSpecialty}`);
        }
      });
    });
    
    return result;
  }, [specialtyMappings, confidenceScores]);
  
  const links = React.useMemo(() => {
    const result: GraphLink[] = [];
    const addedLinks = new Set<string>();
    
    Object.entries(specialtyMappings).forEach(([source, mapping]) => {
      mapping.mappedSpecialties.forEach(target => {
        const linkId = `${source}-${target}`;
        if (!addedLinks.has(linkId)) {
          result.push({
            source: `source_${source}`,
            target: `target_${target}`,
            confidence: confidenceScores[source] || 0,
          });
          addedLinks.add(linkId);
        }
      });
    });
    
    return result;
  }, [specialtyMappings, confidenceScores]);

  return (
    <div className="w-full h-[600px] bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
      <ForceGraph2D
        graphData={{ nodes, links }}
        nodeLabel={(node: GraphNode) => node.label}
        nodeColor={(node: GraphNode) => node.type === 'source' ? '#93C5FD' : '#86EFAC'}
        linkColor={(link: GraphLink) => `rgba(59, 130, 246, ${link.confidence})`}
        nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.label;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = node.type === 'source' ? '#1E40AF' : '#047857';
          ctx.fillText(label, node.x || 0, node.y || 0);
          
          if (node.type === 'source' && node.confidence !== undefined) {
            const confidenceText = `${Math.round(node.confidence * 100)}%`;
            ctx.font = `${fontSize * 0.8}px Sans-Serif`;
            ctx.fillStyle = '#6B7280';
            ctx.fillText(confidenceText, node.x || 0, (node.y || 0) + fontSize);
          }
        }}
        width={800}
        height={600}
        linkWidth={2}
        linkDirectionalParticles={2}
        linkDirectionalParticleWidth={2}
        d3VelocityDecay={0.3}
      />
    </div>
  );
};

export default SpecialtyMappingVisualizer; 
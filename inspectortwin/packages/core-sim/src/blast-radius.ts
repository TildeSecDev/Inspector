import { Graph, Link } from '@inspectortwin/shared';

export interface BlastRadiusResult {
  compromisedNodeId: string;
  affectedNodeIds: string[];
  affectedLinkIds: string[];
  impactScore: number;
  criticalPaths: string[][];
}

/**
 * Compute blast radius - what nodes/links would be affected if a given node is compromised
 */
export function computeBlastRadius(graph: Graph, compromisedNodeId: string): BlastRadiusResult {
  const affectedNodeIds: string[] = [compromisedNodeId];
  const affectedLinkIds: string[] = [];
  const criticalPaths: string[][] = [];

  // Find all nodes directly connected
  const directLinks = graph.links.filter(
    (l: Link) => l.source === compromisedNodeId || l.target === compromisedNodeId
  );

  for (const link of directLinks) {
    affectedLinkIds.push(link.id);
    const connectedNodeId = link.source === compromisedNodeId ? link.target : link.source;
    
    if (!affectedNodeIds.includes(connectedNodeId)) {
      affectedNodeIds.push(connectedNodeId);
    }
  }

  // Calculate impact score based on:
  // - Number of affected nodes
  // - Criticality of affected nodes
  // - Number of paths disrupted

  const compromisedNode = graph.nodes.find((n: any) => n.id === compromisedNodeId);
  let impactScore = affectedNodeIds.length * 10;

  // Add weight for critical nodes
  for (const nodeId of affectedNodeIds) {
    const node = graph.nodes.find((n: any) => n.id === nodeId);
    if (node) {
      switch (node.riskCriticality) {
        case 'critical':
          impactScore += 50;
          break;
        case 'high':
          impactScore += 30;
          break;
        case 'medium':
          impactScore += 10;
          break;
      }
    }
  }

  // Check for nodes that would lose connectivity
  const remainingGraph = {
    ...graph,
    links: graph.links.filter(
      (l: Link) => l.source !== compromisedNodeId && l.target !== compromisedNodeId
    ),
  };

  // Simple connectivity check
  for (const node of graph.nodes) {
    if (node.id !== compromisedNodeId) {
      const wasConnected = isConnected(graph, node.id, compromisedNodeId);
      const stillConnected = hasAlternativePath(remainingGraph, node.id);
      
      if (wasConnected && !stillConnected) {
        impactScore += 20;
      }
    }
  }

  return {
    compromisedNodeId,
    affectedNodeIds,
    affectedLinkIds,
    impactScore,
    criticalPaths,
  };
}

function isConnected(graph: Graph, nodeId1: string, nodeId2: string): boolean {
  return graph.links.some(
    (l: Link) =>
      (l.source === nodeId1 && l.target === nodeId2) || (l.source === nodeId2 && l.target === nodeId1)
  );
}

function hasAlternativePath(graph: Graph, nodeId: string): boolean {
  // Check if node still has any connections
  return graph.links.some((l: Link) => l.source === nodeId || l.target === nodeId);
}

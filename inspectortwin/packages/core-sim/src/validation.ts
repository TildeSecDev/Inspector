import { Graph, Node, Link } from '@inspectortwin/shared';

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  nodeId?: string;
  linkId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateGraph(graph: Graph): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Validate node uniqueness
  const nodeIds = new Set<string>();
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push({
        type: 'error',
        message: `Duplicate node ID: ${node.id}`,
        nodeId: node.id,
      });
    }
    nodeIds.add(node.id);
  }

  // Validate links reference existing nodes
  for (const link of graph.links) {
    if (!nodeIds.has(link.source)) {
      errors.push({
        type: 'error',
        message: `Link ${link.id} references non-existent source node: ${link.source}`,
        linkId: link.id,
      });
    }
    if (!nodeIds.has(link.target)) {
      errors.push({
        type: 'error',
        message: `Link ${link.id} references non-existent target node: ${link.target}`,
        linkId: link.id,
      });
    }
  }

  // Check for isolated nodes (warning)
  const connectedNodes = new Set<string>();
  for (const link of graph.links) {
    connectedNodes.add(link.source);
    connectedNodes.add(link.target);
  }

  for (const node of graph.nodes) {
    if (!connectedNodes.has(node.id) && graph.nodes.length > 1) {
      warnings.push({
        type: 'warning',
        message: `Node ${node.label} (${node.id}) is isolated (no connections)`,
        nodeId: node.id,
      });
    }
  }

  // Check for single points of failure
  const criticalNodes = findSinglePointsOfFailure(graph);
  for (const nodeId of criticalNodes) {
    const node = graph.nodes.find((n: any) => n.id === nodeId);
    warnings.push({
      type: 'warning',
      message: `Node ${node?.label} (${nodeId}) is a single point of failure`,
      nodeId,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function findSinglePointsOfFailure(graph: Graph): string[] {
  const spofs: string[] = [];

  // Simple heuristic: nodes with high degree (many connections)
  const connectionCount = new Map<string, number>();

  for (const link of graph.links) {
    connectionCount.set(link.source, (connectionCount.get(link.source) || 0) + 1);
    connectionCount.set(link.target, (connectionCount.get(link.target) || 0) + 1);
  }

  for (const [nodeId, count] of connectionCount.entries()) {
    if (count >= 3) {
      // Node with 3+ connections might be a bottleneck
      spofs.push(nodeId);
    }
  }

  return spofs;
}

/**
 * Build adjacency list for routing
 */
export function buildAdjacencyList(graph: Graph): Map<string, { nodeId: string; linkId: string }[]> {
  const adj = new Map<string, { nodeId: string; linkId: string }[]>();

  // Initialize all nodes
  for (const node of graph.nodes) {
    adj.set(node.id, []);
  }

  // Add edges (bidirectional for non-directional links)
  for (const link of graph.links) {
    if (!link.failed) {
      adj.get(link.source)?.push({ nodeId: link.target, linkId: link.id });
      adj.get(link.target)?.push({ nodeId: link.source, linkId: link.id });
    }
  }

  return adj;
}

/**
 * Find shortest path between two nodes (BFS)
 */
export function findPath(
  graph: Graph,
  sourceId: string,
  targetId: string
): { path: string[]; links: string[] } | null {
  if (sourceId === targetId) {
    return { path: [sourceId], links: [] };
  }

  const adj = buildAdjacencyList(graph);
  const visited = new Set<string>();
  const queue: { nodeId: string; path: string[]; links: string[] }[] = [
    { nodeId: sourceId, path: [sourceId], links: [] },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.nodeId === targetId) {
      return { path: current.path, links: current.links };
    }

    if (visited.has(current.nodeId)) {
      continue;
    }

    visited.add(current.nodeId);

    const neighbors = adj.get(current.nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.nodeId)) {
        queue.push({
          nodeId: neighbor.nodeId,
          path: [...current.path, neighbor.nodeId],
          links: [...current.links, neighbor.linkId],
        });
      }
    }
  }

  return null; // No path found
}

/**
 * Calculate total latency for a path
 */
export function calculatePathLatency(graph: Graph, linkIds: string[]): number {
  let totalLatency = 0;

  for (const linkId of linkIds) {
    const link = graph.links.find((l: Link) => l.id === linkId);
    if (link) {
      totalLatency += link.latency;
    }
  }

  return totalLatency;
}

/**
 * Build reachability matrix (which nodes can reach which)
 */
export function buildReachabilityMatrix(graph: Graph): Map<string, Map<string, boolean>> {
  const matrix = new Map<string, Map<string, boolean>>();

  for (const source of graph.nodes) {
    const reachable = new Map<string, boolean>();
    
    for (const target of graph.nodes) {
      if (source.id === target.id) {
        reachable.set(target.id, true);
      } else {
        const path = findPath(graph, source.id, target.id);
        reachable.set(target.id, path !== null);
      }
    }

    matrix.set(source.id, reachable);
  }

  return matrix;
}

/**
 * Build latency matrix
 */
export function buildLatencyMatrix(graph: Graph): Map<string, Map<string, number>> {
  const matrix = new Map<string, Map<string, number>>();

  for (const source of graph.nodes) {
    const latencies = new Map<string, number>();

    for (const target of graph.nodes) {
      if (source.id === target.id) {
        latencies.set(target.id, 0);
      } else {
        const path = findPath(graph, source.id, target.id);
        if (path) {
          const latency = calculatePathLatency(graph, path.links);
          latencies.set(target.id, latency);
        } else {
          latencies.set(target.id, Infinity);
        }
      }
    }

    matrix.set(source.id, latencies);
  }

  return matrix;
}

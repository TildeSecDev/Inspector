import { describe, it, expect } from 'vitest';
import { validateGraph, findPath, buildReachabilityMatrix } from '../src/validation';
import { Graph } from '@inspectortwin/shared';

describe('Graph Validation', () => {
  it('should validate a simple graph', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'Router 1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n2', type: 'server', label: 'Server 1', position: { x: 100, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [
        { id: 'l1', source: 'n1', target: 'n2', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
      ],
    };

    const result = validateGraph(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect duplicate node IDs', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'Router 1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n1', type: 'server', label: 'Server 1', position: { x: 100, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [],
    };

    const result = validateGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should detect invalid link references', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'Router 1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [
        { id: 'l1', source: 'n1', target: 'n2', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
      ],
    };

    const result = validateGraph(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('Path Finding', () => {
  it('should find simple path', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'R1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n2', type: 'router', label: 'R2', position: { x: 100, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n3', type: 'server', label: 'S1', position: { x: 200, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [
        { id: 'l1', source: 'n1', target: 'n2', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
        { id: 'l2', source: 'n2', target: 'n3', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
      ],
    };

    const path = findPath(graph, 'n1', 'n3');
    expect(path).not.toBeNull();
    expect(path?.path).toEqual(['n1', 'n2', 'n3']);
    expect(path?.links).toEqual(['l1', 'l2']);
  });

  it('should return null for disconnected nodes', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'R1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n2', type: 'server', label: 'S1', position: { x: 100, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [],
    };

    const path = findPath(graph, 'n1', 'n2');
    expect(path).toBeNull();
  });
});

describe('Reachability Matrix', () => {
  it('should build correct reachability matrix', () => {
    const graph: Graph = {
      nodes: [
        { id: 'n1', type: 'router', label: 'R1', position: { x: 0, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
        { id: 'n2', type: 'server', label: 'S1', position: { x: 100, y: 0 }, tags: [], riskCriticality: 'medium', interfaces: [] },
      ],
      links: [
        { id: 'l1', source: 'n1', target: 'n2', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
      ],
    };

    const matrix = buildReachabilityMatrix(graph);
    expect(matrix.get('n1')?.get('n2')).toBe(true);
    expect(matrix.get('n2')?.get('n1')).toBe(true);
    expect(matrix.get('n1')?.get('n1')).toBe(true);
  });
});

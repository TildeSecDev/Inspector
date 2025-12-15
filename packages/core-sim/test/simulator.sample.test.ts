import { describe, it, expect } from 'vitest';
import { SimulationEngine } from '../src/simulator.js';
import { Graph, Scenario } from '@inspectortwin/shared';

const sampleGraph: Graph = {
  nodes: [
    { id: 'fw', type: 'firewall', label: 'FW', position: { x: 0, y: 0 }, tags: ['security'], riskCriticality: 'high', interfaces: [], properties: { policy: 'allow tcp from n1 to n2 port 443\ndeny any from Any to Any' } },
    { id: 'n1', type: 'workstation', label: 'User', position: { x: -100, y: 0 }, tags: ['users'], riskCriticality: 'medium', interfaces: [] },
    { id: 'n2', type: 'server', label: 'Server', position: { x: 100, y: 0 }, tags: ['servers'], riskCriticality: 'high', interfaces: [] },
  ],
  links: [
    { id: 'l1', source: 'n1', target: 'fw', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
    { id: 'l2', source: 'fw', target: 'n2', type: 'ethernet', bandwidth: 1000, latency: 1, loss: 0, jitter: 0, canFail: false, failed: false },
  ],
};

const sampleScenario: Scenario = {
  id: 'sc1',
  name: 'Allow HTTPS',
  description: 'Simple allowed flow',
  topologyId: 't1',
  flows: [
    { id: 'flow1', from: 'n1', to: 'n2', protocol: 'tcp', port: 443, rate: 1, label: 'https' },
  ],
  faults: [],
  attackEvents: [],
  duration: 1000,
  options: {},
};

describe('SimulationEngine', () => {
  it('completes a simple allowed flow with metrics and findings array', async () => {
    const engine = new SimulationEngine();
    const result = await engine.simulate(sampleGraph, sampleScenario, { verbose: false });

    expect(result.status).toBe('completed');
    expect(result.metrics.packetsProcessed).toBeGreaterThan(0);
    expect(result.metrics.packetsDropped).toBe(0);
    expect(result.findings).toBeInstanceOf(Array);
  });
});

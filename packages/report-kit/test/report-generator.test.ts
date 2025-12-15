import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { PDFDocument } from 'pdf-lib';
import { describe, it, expect, afterAll } from 'vitest';
import { ReportGenerator, type ReportData } from '../src/report-generator.js';

const tmpDir = mkdtempSync(path.join(tmpdir(), 'report-kit-'));

const baseData: ReportData = {
  projectName: 'Sample Project',
  scenario: {
    id: 'scenario-1',
    projectId: 'project-1',
    topologyId: 'topology-1',
    name: 'Reachability Drill',
    description: 'Validate reachability and finding rendering',
    flows: [
      {
        id: 'flow-1',
        from: 'node-router',
        to: 'node-server',
        protocol: 'tcp',
        port: 443,
        rate: 5,
        label: 'App traffic',
      },
    ],
    faults: [],
    attackEvents: [],
    duration: 10000,
    createdAt: new Date('2024-01-01T00:00:00Z').toISOString(),
    updatedAt: new Date('2024-01-02T00:00:00Z').toISOString(),
  },
  graph: {
    nodes: [
      {
        id: 'node-router',
        type: 'router',
        label: 'Router',
        tags: ['network'],
        riskCriticality: 'critical',
        interfaces: [],
        position: { x: 0, y: 0 },
      },
      {
        id: 'node-server',
        type: 'server',
        label: 'Server',
        tags: ['application'],
        riskCriticality: 'high',
        interfaces: [],
        position: { x: 100, y: 0 },
      },
      {
        id: 'node-client',
        type: 'workstation',
        label: 'Client',
        tags: ['user'],
        riskCriticality: 'medium',
        interfaces: [],
        position: { x: -100, y: 0 },
      },
    ],
    links: [
      {
        id: 'link-1',
        source: 'node-router',
        target: 'node-server',
        type: 'ethernet',
        bandwidth: 1000,
        latency: 1,
        loss: 0,
        jitter: 0,
        canFail: false,
        failed: false,
      },
      {
        id: 'link-2',
        source: 'node-router',
        target: 'node-client',
        type: 'ethernet',
        bandwidth: 1000,
        latency: 2,
        loss: 0,
        jitter: 0,
        canFail: false,
        failed: false,
      },
    ],
  },
  runResult: {
    id: 'run-1',
    scenarioId: 'scenario-1',
    status: 'completed',
    startedAt: new Date('2024-01-03T10:00:00Z').toISOString(),
    finishedAt: new Date('2024-01-03T10:05:00Z').toISOString(),
    events: [
      {
        timestamp: 0,
        type: 'flow-start',
        flowId: 'flow-1',
        message: 'Flow started',
      },
      {
        timestamp: 5000,
        type: 'packet-received',
        nodeId: 'node-server',
        flowId: 'flow-1',
        message: 'Packet received',
      },
    ],
    metrics: {
      reachabilityMatrix: {
        'node-router': { 'node-server': true, 'node-client': true },
        'node-client': { 'node-server': true },
      },
      latencyMatrix: {
        'node-router': { 'node-server': 1, 'node-client': 2 },
        'node-client': { 'node-server': 3 },
      },
      packetsProcessed: 1200,
      packetsDropped: 12,
      policiesEvaluated: 8,
      policiesBlocked: 1,
    },
    findings: [
      {
        id: 'finding-1',
        severity: 'high',
        title: 'Open management interface',
        description: 'Management interface reachable from client network.',
        affectedNodeIds: ['node-router'],
        affectedLinkIds: ['link-2'],
        remediation: 'Restrict management access to admin VLAN.',
        createdAt: new Date('2024-01-03T10:04:00Z').toISOString(),
      },
      {
        id: 'finding-2',
        severity: 'medium',
        title: 'TLS not enforced',
        description: 'Server accepts plaintext connections.',
        affectedNodeIds: ['node-server'],
        affectedLinkIds: [],
        remediation: 'Enforce TLS on ingress.',
        createdAt: new Date('2024-01-03T10:04:30Z').toISOString(),
      },
    ],
  },
};

const makeData = (): ReportData => JSON.parse(JSON.stringify(baseData));

describe('ReportGenerator', () => {
  const generator = new ReportGenerator();

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('writes JSON with summary, topology, metrics, and events when requested', async () => {
    const data = makeData();
    const outputPath = path.join(tmpDir, 'report.json');

    const writtenPath = await generator.generateReport(data, {
      outputPath,
      format: 'json',
      includeEvents: true,
      includeMetrics: true,
    });

    expect(writtenPath).toBe(outputPath);

    const json = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(json.metadata.scenarioName).toBe(data.scenario.name);
    expect(json.summary).toMatchObject({
      status: 'completed',
      totalFindings: 2,
      criticalFindings: 0,
      highFindings: 1,
    });

    expect(json.topology).toMatchObject({ nodeCount: 3, linkCount: 2 });
    expect(json.topology.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'node-router', criticality: 'critical' }),
        expect.objectContaining({ id: 'node-server', criticality: 'high' }),
      ])
    );

    expect(json.findings).toHaveLength(2);
    expect(json.metrics).toEqual(data.runResult.metrics);
    expect(json.events).toEqual(data.runResult.events);
  });

  it('omits metrics and events when not requested', async () => {
    const data = makeData();
    const outputPath = path.join(tmpDir, 'report-min.json');

    const writtenPath = await generator.generateReport(data, {
      outputPath,
      format: 'json',
    });

    expect(writtenPath).toBe(outputPath);
    const json = JSON.parse(readFileSync(outputPath, 'utf-8'));

    expect(json.metrics).toBeUndefined();
    expect(json.events).toBeUndefined();
  });

  it('writes a valid PDF with at least one page', async () => {
    const data = makeData();
    const outputPath = path.join(tmpDir, 'report.pdf');

    const writtenPath = await generator.generateReport(data, {
      outputPath,
      format: 'pdf',
    });

    expect(writtenPath).toBe(outputPath);

    const pdfBytes = readFileSync(outputPath);
    expect(pdfBytes.subarray(0, 4).toString()).toBe('%PDF');

    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});

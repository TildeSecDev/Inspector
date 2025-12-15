import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { ProjectStore } from '@inspectortwin/project-store';
import { ReportGenerator } from '@inspectortwin/report-kit';
import { mkdtempSync, rmSync, readFileSync } from 'fs';
import { sampleProjects } from '../src/sample-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const tmpDir = mkdtempSync(path.join(__dirname, 'tmp-'));

/**
 * Integration test: Project → Topology → Scenario → Report
 * Validates the full flow without UI (Playwright).
 * Uses sample data and focus on storage and reporting.
 */

describe('Inspector Twin Integration Flow', () => {
  let projectStore: ProjectStore;
  let dbPath: string;

  beforeAll(() => {
    dbPath = path.join(tmpDir, 'test.db');
    projectStore = new ProjectStore(dbPath);
  });

  afterAll(() => {
    if (projectStore) {
      projectStore.close();
    }
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should create a project with topology from sample data', async () => {
    const sample = sampleProjects[0];
    
    // Create project
    const project = projectStore.projects.create({
      name: sample.name,
      description: sample.description,
    });

    expect(project).toHaveProperty('id');
    expect(project.name).toBe(sample.name);
    expect(project.createdAt).toBeDefined();
    expect(project.updatedAt).toBeDefined();

    // Create topology
    const topology = projectStore.topologies.create({
      projectId: project.id,
      name: sample.topologies[0].name,
      graph: sample.topologies[0].graph,
    });

    expect(topology).toHaveProperty('id');
    expect(topology.projectId).toBe(project.id);
    expect(topology.graph.nodes.length).toBeGreaterThan(0);
    expect(topology.graph.links.length).toBeGreaterThan(0);
  });

  it('should create scenarios linked to topology', async () => {
    const sample = sampleProjects[0];
    
    // Get or create project and topology
    const project = projectStore.projects.create({
      name: `Test Project ${Date.now()}`,
      description: 'Integration test project',
    });

    const topology = projectStore.topologies.create({
      projectId: project.id,
      name: sample.topologies[0].name,
      graph: sample.topologies[0].graph,
    });

    // Create multiple scenarios
    const scenarios = [];
    for (const sampleScenario of sample.scenarios) {
      const scenario = projectStore.scenarios.create({
        projectId: project.id,
        topologyId: topology.id,
        name: sampleScenario.name,
        description: sampleScenario.description,
        flows: sampleScenario.flows,
        faults: sampleScenario.faults,
        attackEvents: sampleScenario.attackEvents,
        duration: sampleScenario.duration,
      });

      expect(scenario).toHaveProperty('id');
      expect(scenario.topologyId).toBe(topology.id);
      scenarios.push(scenario);
    }

    expect(scenarios.length).toBeGreaterThan(0);

    // Retrieve scenarios by project
    const projectScenarios = projectStore.scenarios.findByProjectId(project.id);
    expect(projectScenarios.length).toBe(scenarios.length);
  });

  it('should store and retrieve findings from a run', async () => {
    const sample = sampleProjects[0];
    
    // Setup
    const project = projectStore.projects.create({
      name: `Findings Test ${Date.now()}`,
      description: 'Test findings storage',
    });

    const topology = projectStore.topologies.create({
      projectId: project.id,
      name: sample.topologies[0].name,
      graph: sample.topologies[0].graph,
    });

    const scenario = projectStore.scenarios.create({
      projectId: project.id,
      topologyId: topology.id,
      name: sample.scenarios[0].name,
      description: sample.scenarios[0].description,
      flows: sample.scenarios[0].flows,
      faults: sample.scenarios[0].faults,
      attackEvents: sample.scenarios[0].attackEvents,
      duration: sample.scenarios[0].duration,
    });

    // Create a minimal run result
    const runResult = {
      id: `run-${Date.now()}`,
      scenarioId: scenario.id,
      status: 'completed' as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      events: [],
      metrics: {
        reachabilityMatrix: {},
        latencyMatrix: {},
        packetsProcessed: 100,
        packetsDropped: 5,
        policiesEvaluated: 10,
        policiesBlocked: 2,
      },
      findings: [
        {
          id: `finding-1-${Date.now()}`,
          severity: 'high' as const,
          title: 'Test Finding 1',
          description: 'A test security finding',
          affectedNodeIds: [topology.graph.nodes[0]?.id || 'node-1'],
          affectedLinkIds: [],
          remediation: 'Test remediation',
          createdAt: new Date().toISOString(),
        },
        {
          id: `finding-2-${Date.now()}`,
          severity: 'medium' as const,
          title: 'Test Finding 2',
          description: 'Another test finding',
          affectedNodeIds: [topology.graph.nodes[1]?.id || 'node-2'],
          affectedLinkIds: [],
          remediation: 'Another remediation',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Save run
    const savedRun = projectStore.runs.create(runResult);
    expect(savedRun.id).toBe(runResult.id);
    expect(savedRun.findings.length).toBe(2);

    // Save findings
    for (const finding of runResult.findings) {
      projectStore.findings.create({ ...finding, runId: savedRun.id });
    }

    // Retrieve findings
    const findings = projectStore.findings.findByRunId(savedRun.id);
    expect(findings.length).toBe(2);
    expect(findings[0].severity).toBe('high');
    expect(findings[1].severity).toBe('medium');
  });

  it('should generate JSON report with correct structure', async () => {
    const sample = sampleProjects[0];
    const reportDir = path.join(tmpDir, 'reports');

    // Setup
    const project = projectStore.projects.create({
      name: `Report Test ${Date.now()}`,
      description: 'Report generation test',
    });

    const topology = projectStore.topologies.create({
      projectId: project.id,
      name: sample.topologies[0].name,
      graph: sample.topologies[0].graph,
    });

    const scenario = projectStore.scenarios.create({
      projectId: project.id,
      topologyId: topology.id,
      name: sample.scenarios[0].name,
      description: sample.scenarios[0].description,
      flows: sample.scenarios[0].flows,
      faults: sample.scenarios[0].faults,
      attackEvents: sample.scenarios[0].attackEvents,
      duration: sample.scenarios[0].duration,
    });

    // Create run result with findings
    const runResult = {
      id: `run-${Date.now()}`,
      scenarioId: scenario.id,
      status: 'completed' as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      events: [
        {
          timestamp: 0,
          type: 'flow-start' as const,
          flowId: 'flow-1',
          message: 'Flow started',
        },
      ],
      metrics: {
        reachabilityMatrix: {},
        latencyMatrix: {},
        packetsProcessed: 100,
        packetsDropped: 5,
        policiesEvaluated: 10,
        policiesBlocked: 2,
      },
      findings: [
        {
          id: `finding-${Date.now()}`,
          severity: 'high' as const,
          title: 'Policy Violation',
          description: 'Unauthorized access attempt detected',
          affectedNodeIds: [topology.graph.nodes[0]?.id || 'node-1'],
          affectedLinkIds: [],
          remediation: 'Enable additional access controls',
          category: 'policy',
          category: 'network',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Generate JSON report
    const generator = new ReportGenerator();
    const reportData = {
      projectName: project.name,
      scenario,
      graph: topology.graph,
      runResult,
    };

    // Ensure directory exists
    const { mkdirSync } = require('fs');
    mkdirSync(reportDir, { recursive: true });

    const jsonPath = path.join(reportDir, `report-${runResult.id}.json`);
    const jsonResult = await generator.generateReport(reportData, {
      outputPath: jsonPath,
      format: 'json' as const,
      includeMetrics: true,
      includeEvents: true,
    });

    expect(jsonResult).toBe(jsonPath);

    // Verify JSON content
    const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    expect(jsonContent.metadata.projectName).toBe(project.name);
    expect(jsonContent.metadata.scenarioName).toBe(scenario.name);
    expect(jsonContent.summary.status).toBe('completed');
    expect(jsonContent.summary.totalFindings).toBe(1);
    expect(jsonContent.summary.highFindings).toBe(1);
    expect(jsonContent.topology.nodeCount).toBeGreaterThan(0);
    expect(jsonContent.findings).toHaveLength(1);
    expect(jsonContent.findings[0].severity).toBe('high');
    expect(jsonContent.metrics).toBeDefined();
    expect(jsonContent.events).toBeDefined();
  });

  it('should generate a valid PDF report', async () => {
    const sample = sampleProjects[0];
    const reportDir = path.join(tmpDir, 'pdf-reports');

    // Setup
    const project = projectStore.projects.create({
      name: `PDF Test ${Date.now()}`,
      description: 'PDF report test',
    });

    const topology = projectStore.topologies.create({
      projectId: project.id,
      name: sample.topologies[0].name,
      graph: sample.topologies[0].graph,
    });

    const scenario = projectStore.scenarios.create({
      projectId: project.id,
      topologyId: topology.id,
      name: sample.scenarios[0].name,
      description: sample.scenarios[0].description,
      flows: sample.scenarios[0].flows,
      faults: sample.scenarios[0].faults,
      attackEvents: sample.scenarios[0].attackEvents,
      duration: sample.scenarios[0].duration,
    });

    const runResult = {
      id: `run-pdf-${Date.now()}`,
      scenarioId: scenario.id,
      status: 'completed' as const,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      events: [],
      metrics: {
        reachabilityMatrix: {},
        latencyMatrix: {},
        packetsProcessed: 500,
        packetsDropped: 10,
        policiesEvaluated: 20,
        policiesBlocked: 3,
      },
      findings: [
        {
          id: `finding-pdf-${Date.now()}`,
          severity: 'critical' as const,
          title: 'Critical Security Issue',
          description: 'A critical vulnerability was detected',
          affectedNodeIds: [topology.graph.nodes[0]?.id || 'node-1'],
          affectedLinkIds: [],
          remediation: 'Apply security patch immediately',
          category: 'vulnerability',
          category: 'security',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    // Ensure directory exists
    const { mkdirSync } = require('fs');
    mkdirSync(reportDir, { recursive: true });

    const generator = new ReportGenerator();
    const reportData = {
      projectName: project.name,
      scenario,
      graph: topology.graph,
      runResult,
    };

    const pdfPath = path.join(reportDir, `report-${runResult.id}.pdf`);
    const pdfResult = await generator.generateReport(reportData, {
      outputPath: pdfPath,
      format: 'pdf' as const,
    });

    expect(pdfResult).toBe(pdfPath);

    // Verify PDF is valid
    const pdfBuffer = readFileSync(pdfPath);
    expect(pdfBuffer.subarray(0, 4).toString()).toBe('%PDF');

    // Verify it's a multi-page report if there are many findings
    const { PDFDocument } = require('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
  });
});


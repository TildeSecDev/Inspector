import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import {
  Project,
  ProjectSchema,
  Topology,
  TopologySchema,
  Scenario,
  ScenarioSchema,
  RunResult,
  RunResultSchema,
  Finding,
  FindingSchema,
  Report,
  ReportSchema,
} from '@inspectortwin/shared';

export class ProjectRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const now = new Date().toISOString();
    const project: Project = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    ProjectSchema.parse(project);

    this.db
      .prepare(
        'INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(project.id, project.name, project.description || null, project.createdAt, project.updatedAt);

    return project;
  }

  findById(id: string): Project | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return ProjectSchema.parse({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  findAll(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all() as any[];
    return rows.map((row) =>
      ProjectSchema.parse({
        id: row.id,
        name: row.name,
        description: row.description,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    );
  }

  update(id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>): Project {
    const existing = this.findById(id);
    if (!existing) throw new Error(`Project ${id} not found`);

    const updated: Project = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    ProjectSchema.parse(updated);

    this.db
      .prepare('UPDATE projects SET name = ?, description = ?, updated_at = ? WHERE id = ?')
      .run(updated.name, updated.description || null, updated.updatedAt, id);

    return updated;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }
}

export class TopologyRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<Topology, 'id' | 'createdAt' | 'updatedAt'>): Topology {
    const now = new Date().toISOString();
    const topology: Topology = {
      id: randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    TopologySchema.parse(topology);

    this.db
      .prepare(
        'INSERT INTO topologies (id, project_id, name, graph_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        topology.id,
        topology.projectId,
        topology.name,
        JSON.stringify(topology.graph),
        topology.createdAt,
        topology.updatedAt
      );

    return topology;
  }

  findById(id: string): Topology | undefined {
    const row = this.db.prepare('SELECT * FROM topologies WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return TopologySchema.parse({
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      graph: JSON.parse(row.graph_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  findByProjectId(projectId: string): Topology[] {
    const rows = this.db
      .prepare('SELECT * FROM topologies WHERE project_id = ? ORDER BY updated_at DESC')
      .all(projectId) as any[];

    return rows.map((row) =>
      TopologySchema.parse({
        id: row.id,
        projectId: row.project_id,
        name: row.name,
        graph: JSON.parse(row.graph_json),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    );
  }

  update(id: string, data: Partial<Omit<Topology, 'id' | 'createdAt' | 'updatedAt' | 'projectId'>>): Topology {
    const existing = this.findById(id);
    if (!existing) throw new Error(`Topology ${id} not found`);

    const updated: Topology = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    TopologySchema.parse(updated);

    this.db
      .prepare('UPDATE topologies SET name = ?, graph_json = ?, updated_at = ? WHERE id = ?')
      .run(updated.name, JSON.stringify(updated.graph), updated.updatedAt, id);

    return updated;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM topologies WHERE id = ?').run(id);
  }
}

export class ScenarioRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<Scenario, 'id' | 'createdAt' | 'updatedAt'> & { projectId: string }): Scenario & { projectId: string } {
    const now = new Date().toISOString();
    const scenario: Scenario = {
      id: randomUUID(),
      name: data.name,
      description: data.description,
      topologyId: data.topologyId,
      flows: data.flows,
      faults: data.faults,
      attackEvents: data.attackEvents,
      duration: data.duration,
      options: data.options,
    createdAt: now,
    updatedAt: now,
    };

    ScenarioSchema.parse(scenario);

    this.db
      .prepare(
        'INSERT INTO scenarios (id, project_id, topology_id, name, scenario_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(scenario.id, data.projectId, scenario.topologyId, scenario.name, JSON.stringify(scenario), now, now);

    return { ...scenario, projectId: data.projectId };
  }

  findById(id: string): (Scenario & { projectId: string }) | undefined {
    const row = this.db.prepare('SELECT * FROM scenarios WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    const scenario = JSON.parse(row.scenario_json);
    return {
      ...ScenarioSchema.parse({ ...scenario, createdAt: scenario.createdAt || row.created_at, updatedAt: scenario.updatedAt || row.updated_at }),
      projectId: row.project_id,
    };
  }

  findByProjectId(projectId: string): (Scenario & { projectId: string })[] {
    const rows = this.db
      .prepare('SELECT * FROM scenarios WHERE project_id = ? ORDER BY created_at DESC')
      .all(projectId) as any[];

    return rows.map((row) => {
      const scenario = JSON.parse(row.scenario_json);
      return {
        ...ScenarioSchema.parse({ ...scenario, createdAt: scenario.createdAt || row.created_at, updatedAt: scenario.updatedAt || row.updated_at }),
        projectId: row.project_id,
      };
    });
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM scenarios WHERE id = ?').run(id);
  }
}

export class RunRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<RunResult, 'id'>): RunResult {
    const run: RunResult = {
      id: randomUUID(),
      ...data,
      updatedAt: new Date().toISOString(),
    };

    RunResultSchema.parse(run);

    this.db
      .prepare(
        'INSERT INTO runs (id, scenario_id, started_at, finished_at, results_json, status, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(
        run.id,
        run.scenarioId,
        run.startedAt,
        run.finishedAt || null,
        JSON.stringify(run),
        run.status,
        run.updatedAt
      );

    return run;
  }

  findById(id: string): RunResult | undefined {
    const row = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return RunResultSchema.parse(JSON.parse(row.results_json));
  }

  findByScenarioId(scenarioId: string): RunResult[] {
    const rows = this.db
      .prepare('SELECT * FROM runs WHERE scenario_id = ? ORDER BY started_at DESC')
      .all(scenarioId) as any[];

    return rows.map((row) => RunResultSchema.parse(JSON.parse(row.results_json)));
  }

  update(id: string, data: Partial<RunResult>): RunResult {
    const existing = this.findById(id);
    if (!existing) throw new Error(`Run ${id} not found`);

    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    RunResultSchema.parse(updated);

    this.db
      .prepare('UPDATE runs SET finished_at = ?, results_json = ?, status = ?, updated_at = ? WHERE id = ?')
      .run(updated.finishedAt || null, JSON.stringify(updated), updated.status, updated.updatedAt, id);

    return updated;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM runs WHERE id = ?').run(id);
  }
}

export class FindingRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<Finding, 'id' | 'createdAt'>): Finding {
    const finding: Finding = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };

    FindingSchema.parse(finding);

    this.db
      .prepare(
        `INSERT INTO findings 
        (id, run_id, severity, title, description, evidence_json, remediation, category, affected_nodes_json, affected_links_json, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        finding.id,
        finding.runId || null,
        finding.severity,
        finding.title,
        finding.description,
        finding.evidence ? JSON.stringify(finding.evidence) : null,
        finding.remediation || null,
        finding.category || null,
        JSON.stringify(finding.affectedNodeIds),
        JSON.stringify(finding.affectedLinkIds),
        finding.createdAt
      );

    return finding;
  }

  findById(id: string): Finding | undefined {
    const row = this.db.prepare('SELECT * FROM findings WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return this.mapRowToFinding(row);
  }

  findByRunId(runId: string): Finding[] {
    const rows = this.db
      .prepare('SELECT * FROM findings WHERE run_id = ? ORDER BY severity, created_at DESC')
      .all(runId) as any[];

    return rows.map((row) => this.mapRowToFinding(row));
  }

  private mapRowToFinding(row: any): Finding {
    return FindingSchema.parse({
      id: row.id,
      runId: row.run_id,
      severity: row.severity,
      title: row.title,
      description: row.description,
      evidence: row.evidence_json ? JSON.parse(row.evidence_json) : undefined,
      remediation: row.remediation,
      category: row.category,
      affectedNodeIds: JSON.parse(row.affected_nodes_json),
      affectedLinkIds: JSON.parse(row.affected_links_json),
      createdAt: row.created_at,
    });
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM findings WHERE id = ?').run(id);
  }
}

export class ReportRepository {
  constructor(private db: Database.Database) {}

  create(data: Omit<Report, 'id' | 'createdAt'>): Report {
    const report: Report = {
      id: randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ReportSchema.parse(report);

    this.db
      .prepare('INSERT INTO reports (id, run_id, format, path, created_at, updated_at, metadata_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(
        report.id,
        report.runId,
        report.format,
        report.path,
        report.createdAt,
        report.updatedAt,
        report.metadata ? JSON.stringify(report.metadata) : null
      );

    return report;
  }

  findById(id: string): Report | undefined {
    const row = this.db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as any;
    if (!row) return undefined;

    return ReportSchema.parse({
      id: row.id,
      runId: row.run_id,
      format: row.format,
      path: row.path,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
    });
  }

  findByRunId(runId: string): Report[] {
    const rows = this.db
      .prepare('SELECT * FROM reports WHERE run_id = ? ORDER BY created_at DESC')
      .all(runId) as any[];

    return rows.map((row) =>
      ReportSchema.parse({
        id: row.id,
        runId: row.run_id,
        format: row.format,
        path: row.path,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        metadata: row.metadata_json ? JSON.parse(row.metadata_json) : undefined,
      })
    );
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM reports WHERE id = ?').run(id);
  }
}

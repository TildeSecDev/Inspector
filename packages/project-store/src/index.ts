import Database from 'better-sqlite3';
import { runMigrations } from './migrations.js';
import {
  ProjectRepository,
  TopologyRepository,
  ScenarioRepository,
  RunRepository,
  FindingRepository,
  ReportRepository,
} from './repositories.js';

export class ProjectStore {
  private db: Database.Database;
  public projects: ProjectRepository;
  public topologies: TopologyRepository;
  public scenarios: ScenarioRepository;
  public runs: RunRepository;
  public findings: FindingRepository;
  public reports: ReportRepository;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.pragma('foreign_keys = ON');

    // Run migrations
    runMigrations(this.db);

    // Initialize repositories
    this.projects = new ProjectRepository(this.db);
    this.topologies = new TopologyRepository(this.db);
    this.scenarios = new ScenarioRepository(this.db);
    this.runs = new RunRepository(this.db);
    this.findings = new FindingRepository(this.db);
    this.reports = new ReportRepository(this.db);
  }

  close(): void {
    this.db.close();
  }

  backup(backupPath: string): void {
    this.db.backup(backupPath);
  }
}

export * from './repositories.js';
export * from './migrations.js';

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface MigrationOptions {
  db: Database.Database;
}

export function runMigrations(db: Database.Database): void {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Initial schema migration
  const migrations = [
    {
      name: '001_initial_schema',
      sql: `
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS topologies (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          name TEXT NOT NULL,
          graph_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS scenarios (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          topology_id TEXT NOT NULL,
          name TEXT NOT NULL,
          scenario_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (topology_id) REFERENCES topologies(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS runs (
          id TEXT PRIMARY KEY,
          scenario_id TEXT NOT NULL,
          started_at TEXT NOT NULL,
          finished_at TEXT,
          results_json TEXT,
          status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
          FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS findings (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          evidence_json TEXT,
          remediation TEXT,
          category TEXT,
          affected_nodes_json TEXT,
          affected_links_json TEXT,
          created_at TEXT NOT NULL,
          FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          run_id TEXT NOT NULL,
          format TEXT NOT NULL CHECK(format IN ('json', 'pdf')),
          path TEXT NOT NULL,
          created_at TEXT NOT NULL,
          metadata_json TEXT,
          FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_topologies_project_id ON topologies(project_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_project_id ON scenarios(project_id);
        CREATE INDEX IF NOT EXISTS idx_scenarios_topology_id ON scenarios(topology_id);
        CREATE INDEX IF NOT EXISTS idx_runs_scenario_id ON runs(scenario_id);
        CREATE INDEX IF NOT EXISTS idx_findings_run_id ON findings(run_id);
        CREATE INDEX IF NOT EXISTS idx_findings_severity ON findings(severity);
        CREATE INDEX IF NOT EXISTS idx_reports_run_id ON reports(run_id);
      `,
    },
    {
      name: '002_add_updated_at_columns',
      sql: `
        ALTER TABLE scenarios ADD COLUMN updated_at TEXT;
        ALTER TABLE runs ADD COLUMN updated_at TEXT;
        ALTER TABLE reports ADD COLUMN updated_at TEXT;

        UPDATE scenarios SET updated_at = created_at WHERE updated_at IS NULL;
        UPDATE runs SET updated_at = COALESCE(finished_at, started_at) WHERE updated_at IS NULL;
        UPDATE reports SET updated_at = created_at WHERE updated_at IS NULL;
      `,
    },
  ];

  const appliedMigrations = db
    .prepare('SELECT name FROM migrations')
    .all()
    .map((row: any) => row.name);

  for (const migration of migrations) {
    if (!appliedMigrations.includes(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      db.exec(migration.sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
    }
  }
}

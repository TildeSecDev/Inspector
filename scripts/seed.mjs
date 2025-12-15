import { mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { ProjectStore } from '../packages/project-store/dist/index.js';
import { sampleProjects } from '../packages/shared/dist/sample-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = resolve(process.argv[2] || './seed/inspectortwin.db');
mkdirSync(dirname(dbPath), { recursive: true });

console.log(`[seed] Using database: ${dbPath}`);
const store = new ProjectStore(dbPath);

try {
  for (const project of sampleProjects) {
    const createdProject = store.projects.create({
      name: project.name,
      description: project.description,
    });
    console.log(`[seed] Project created: ${createdProject.name}`);

    const topoIdMap = new Map();

    for (const topo of project.topologies) {
      const createdTopology = store.topologies.create({
        projectId: createdProject.id,
        name: topo.name,
        graph: topo.graph,
      });
      topoIdMap.set(topo.name, createdTopology.id);
      console.log(`[seed]  topology: ${topo.name}`);
    }

    for (const scenario of project.scenarios) {
      const topologyId = topoIdMap.get(project.topologies[0]?.name) || topoIdMap.values().next().value;
      store.scenarios.create({
        projectId: createdProject.id,
        name: scenario.name,
        description: scenario.description,
        topologyId,
        flows: scenario.flows,
        faults: scenario.faults,
        attackEvents: scenario.attackEvents,
        duration: scenario.duration,
        options: scenario.options,
      });
      console.log(`[seed]  scenario: ${scenario.name}`);
    }
  }

  console.log('[seed] Done. You can point the app to this DB or copy it into userData.');
} catch (err) {
  console.error('[seed] Failed:', err);
  process.exit(1);
} finally {
  store.close();
}

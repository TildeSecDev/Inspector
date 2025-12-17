import { sampleProjects } from '@inspectortwin/shared';

// Mock API for browser mode (when Electron is not available)
// Uses localStorage to persist data between sessions

// Browser-compatible UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  return Math.random().toString(36).substring(2, 11);
}

const STORAGE_KEY = 'inspector-twin-data';

interface MockData {
  projects: any[];
  graphs: any[];
  scenarios: any[];
  runs: any[];
  findings: any[];
  reports: any[];
}

function loadData(): MockData {
  if (typeof localStorage === 'undefined') {
    return getDefaultData();
  }
  
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return getDefaultData();
    }
  }
  return getDefaultData();
}

function saveData(data: MockData): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
}

function getDefaultData(): MockData {
  // Initialize with sample projects
  const projects: any[] = [];
  const graphs: any[] = [];
  const scenarios: any[] = [];
  
  sampleProjects.forEach(sampleProj => {
    const projectId = generateUUID();
    const now = new Date().toISOString();
    
    projects.push({
      id: projectId,
      name: sampleProj.name,
      description: sampleProj.description,
      created_at: now,
      updated_at: now,
    });
    
    // Add topologies
    sampleProj.topologies.forEach(topo => {
      const graphId = generateUUID();
      graphs.push({
        id: graphId,
        project_id: projectId,
        name: topo.name,
        graph: topo.graph,
        created_at: now,
        updated_at: now,
      });
    });
    
    // Add scenarios
    sampleProj.scenarios.forEach(scen => {
      scenarios.push({
        id: generateUUID(),
        project_id: projectId,
        name: scen.name,
        description: scen.description,
        faults: scen.faults,
        flows: scen.flows,
        attack_events: scen.attackEvents,
        created_at: now,
        updated_at: now,
      });
    });
  });
  
  return {
    projects,
    graphs,
    scenarios,
    runs: [],
    findings: [],
    reports: [],
  };
}

export const mockAPI = {
  project: {
    async getAll() {
      const data = loadData();
      return data.projects;
    },
    
    async getById(id: string) {
      const data = loadData();
      return data.projects.find(p => p.id === id);
    },
    
    async create(input: { name: string; description?: string }) {
      const data = loadData();
      const now = new Date().toISOString();
      const newProject = {
        id: generateUUID(),
        name: input.name,
        description: input.description || '',
        created_at: now,
        updated_at: now,
      };
      data.projects.push(newProject);
      saveData(data);
      return newProject;
    },
    
    async update(id: string, input: { name?: string; description?: string }) {
      const data = loadData();
      const project = data.projects.find(p => p.id === id);
      if (!project) throw new Error('Project not found');
      
      if (input.name) project.name = input.name;
      if (input.description !== undefined) project.description = input.description;
      project.updated_at = new Date().toISOString();
      
      saveData(data);
      return project;
    },
    
    async delete(id: string) {
      const data = loadData();
      data.projects = data.projects.filter(p => p.id !== id);
      data.graphs = data.graphs.filter(g => g.project_id !== id);
      data.scenarios = data.scenarios.filter(s => s.project_id !== id);
      saveData(data);
    },
  },
  
  graph: {
    async getByProjectId(projectId: string) {
      const data = loadData();
      return data.graphs.filter(g => g.project_id === projectId);
    },
    
    async save(projectId: string, name: string, graph: any) {
      const data = loadData();
      const now = new Date().toISOString();
      const existing = data.graphs.find(g => g.project_id === projectId && g.name === name);
      
      if (existing) {
        existing.graph = graph;
        existing.updated_at = now;
      } else {
        data.graphs.push({
          id: generateUUID(),
          project_id: projectId,
          name,
          graph,
          created_at: now,
          updated_at: now,
        });
      }
      
      saveData(data);
    },
  },
  
  scenario: {
    async getByProjectId(projectId: string) {
      const data = loadData();
      return data.scenarios.filter(s => s.project_id === projectId);
    },
    
    async create(input: any) {
      const data = loadData();
      const now = new Date().toISOString();
      const newScenario = {
        id: generateUUID(),
        ...input,
        created_at: now,
        updated_at: now,
      };
      data.scenarios.push(newScenario);
      saveData(data);
      return newScenario;
    },
    
    async delete(id: string) {
      const data = loadData();
      data.scenarios = data.scenarios.filter(s => s.id !== id);
      saveData(data);
    },
  },
  
  run: {
    async getByScenarioId(scenarioId: string) {
      const data = loadData();
      return data.runs.filter(r => r.scenario_id === scenarioId);
    },
    
    async create(result: any) {
      const data = loadData();
      data.runs.push(result);
      
      // Extract findings
      if (result.findings) {
        data.findings.push(...result.findings);
      }
      
      saveData(data);
      return result;
    },
  },
  
  finding: {
    async getAll() {
      const data = loadData();
      return data.findings;
    },
  },
  
  report: {
    async getAll() {
      const data = loadData();
      return data.reports;
    },
    
    async create(report: any) {
      const data = loadData();
      const newReport = {
        id: generateUUID(),
        ...report,
        created_at: new Date().toISOString(),
      };
      data.reports.push(newReport);
      saveData(data);
      return newReport;
    },
  },
  
  settings: {
    async get(key: string) {
      if (typeof localStorage === 'undefined') return null;
      const value = localStorage.getItem(`setting_${key}`);
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    },
    
    async set(key: string, value: any) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`setting_${key}`, String(value));
      }
    },
  },
};

// Initialize default data on first load
if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
  saveData(getDefaultData());
}

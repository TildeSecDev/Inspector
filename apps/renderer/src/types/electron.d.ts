declare global {
  interface Window {
    electronAPI: {
      project: {
        create: (data: any) => Promise<any>;
        getAll: () => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<void>;
      };
      topology: {
        create: (data: any) => Promise<any>;
        getByProjectId: (projectId: string) => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        update: (id: string, data: any) => Promise<any>;
        delete: (id: string) => Promise<void>;
      };
      scenario: {
        create: (data: any) => Promise<any>;
        getByProjectId: (projectId: string) => Promise<any[]>;
        getById: (id: string) => Promise<any>;
        delete: (id: string) => Promise<void>;
      };
      simulation: {
        run: (graph: any, scenario: any, options: any) => Promise<any>;
        getRuns: (scenarioId: string) => Promise<any[]>;
        getRunById: (runId: string) => Promise<any>;
      };
      findings: {
        getByRunId: (runId: string) => Promise<any[]>;
      };
      report: {
        generate: (reportData: any, options: any) => Promise<string>;
        getByRunId: (runId: string) => Promise<any[]>;
      };
      lab: {
        start: (config: any) => Promise<{ success: boolean }>;
        stop: () => Promise<{ success: boolean }>;
        getStatus: () => Promise<any>;
      };
      settings: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
      };
    };
  }
}

export {};

import { create } from 'zustand';

interface AppState {
  currentProject: any | null;
  currentTopology: any | null;
  currentScenario: any | null;
  currentRun: any | null;
  
  setCurrentProject: (project: any) => void;
  setCurrentTopology: (topology: any) => void;
  setCurrentScenario: (scenario: any) => void;
  setCurrentRun: (run: any) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProject: null,
  currentTopology: null,
  currentScenario: null,
  currentRun: null,
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentTopology: (topology) => set({ currentTopology: topology }),
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  setCurrentRun: (run) => set({ currentRun: run }),
}));

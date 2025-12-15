import { create } from 'zustand';

interface AppState {
  currentProject: any | null;
  currentTopology: any | null;
  currentScenario: any | null;
  currentRun: any | null;
  roeAccepted: boolean;
  
  setCurrentProject: (project: any) => void;
  setCurrentTopology: (topology: any) => void;
  setCurrentScenario: (scenario: any) => void;
  setCurrentRun: (run: any) => void;
  setRoeAccepted: (accepted: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentProject: null,
  currentTopology: null,
  currentScenario: null,
  currentRun: null,
  roeAccepted: false,
  
  setCurrentProject: (project) => set({ currentProject: project }),
  setCurrentTopology: (topology) => set({ currentTopology: topology }),
  setCurrentScenario: (scenario) => set({ currentScenario: scenario }),
  setCurrentRun: (run) => set({ currentRun: run }),
  setRoeAccepted: (accepted) => set({ roeAccepted: accepted }),
}));

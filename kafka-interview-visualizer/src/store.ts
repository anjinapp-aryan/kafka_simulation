import { create } from 'zustand';
import { PHASES } from './phases';

interface AppState {
  activePhaseId: string;
  setActivePhase: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activePhaseId: PHASES[0].id,
  setActivePhase: (id) => set({ activePhaseId: id }),
}));

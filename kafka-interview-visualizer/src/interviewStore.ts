import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'learn' | 'interview' | 'banking' | 'troubleshooting';

interface InterviewState {
  mode: AppMode;
  setMode: (m: AppMode) => void;

  /** question id -> status. Persisted to localStorage (no backend). */
  mastered: Record<string, boolean>;
  difficult: Record<string, boolean>;
  toggleMastered: (id: string) => void;
  toggleDifficult: (id: string) => void;
  resetProgress: () => void;
}

export const useInterviewStore = create<InterviewState>()(
  persist(
    (set) => ({
      mode: 'learn',
      setMode: (m) => set({ mode: m }),
      mastered: {},
      difficult: {},
      toggleMastered: (id) =>
        set((s) => ({ mastered: { ...s.mastered, [id]: !s.mastered[id] } })),
      toggleDifficult: (id) =>
        set((s) => ({ difficult: { ...s.difficult, [id]: !s.difficult[id] } })),
      resetProgress: () => set({ mastered: {}, difficult: {} }),
    }),
    { name: 'kafka-interview-progress' },
  ),
);

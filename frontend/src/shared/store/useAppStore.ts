import { create } from 'zustand';

export type AppPhase = 'idle' | 'lobby' | 'playing' | 'results';

interface AppState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'idle',
  setPhase: (phase) => set({ phase }),
}));

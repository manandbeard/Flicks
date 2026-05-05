import { fsrs, Rating, type FSRSState } from 'https://esm.sh/ts-fsrs@5';

export interface NPCMemoryRetrievability {
  retrievability: number;
  remembers: boolean;
  elapsedDays: number;
  nextIntervalDays: number;
  nextMemoryState: FSRSState;
}

const RETRIEVABILITY_THRESHOLD = 0.5;

export function calculateRetrievability(memoryState: FSRSState, elapsedDays: number): NPCMemoryRetrievability {
  const scheduler = fsrs({ enable_fuzz: false });
  const normalizedElapsedDays = Math.max(0, Math.floor(elapsedDays));

  const retrievability = scheduler.forgetting_curve(normalizedElapsedDays, memoryState.stability);
  const rememberedState = scheduler.next_state(memoryState, normalizedElapsedDays, Rating.Good, retrievability);
  const forgottenState = scheduler.next_state(memoryState, normalizedElapsedDays, Rating.Again, retrievability);

  const rememberedIntervalDays = scheduler.next_interval(rememberedState.stability, normalizedElapsedDays);
  const forgottenIntervalDays = scheduler.next_interval(forgottenState.stability, normalizedElapsedDays);
  const remembers = retrievability >= RETRIEVABILITY_THRESHOLD && rememberedIntervalDays > forgottenIntervalDays;

  return {
    retrievability,
    remembers,
    elapsedDays: normalizedElapsedDays,
    nextIntervalDays: remembers ? rememberedIntervalDays : forgottenIntervalDays,
    nextMemoryState: remembers ? rememberedState : forgottenState,
  };
}

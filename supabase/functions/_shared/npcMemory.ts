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
  const transitionRating = retrievability >= RETRIEVABILITY_THRESHOLD ? Rating.Good : Rating.Again;

  const nextMemoryState = scheduler.next_state(memoryState, normalizedElapsedDays, transitionRating, retrievability);
  const nextIntervalDays = scheduler.next_interval(nextMemoryState.stability, normalizedElapsedDays);
  const remembers = transitionRating === Rating.Good;

  return {
    retrievability,
    remembers,
    elapsedDays: normalizedElapsedDays,
    nextIntervalDays,
    nextMemoryState,
  };
}

import { createSignal } from 'solid-js';

export type ExperiencePhase =
  | 'idle'
  | 'enter'
  | 'room-selection'
  | 'room-lobby'
  | 'countdown'
  | 'in-game'
  | 'waiting'
  | 'leaderboard';

export const [experienceStarted, setExperienceStarted] = createSignal(false);
export const [experiencePhase, setExperiencePhase] = createSignal<ExperiencePhase>('idle');

// Utility helpers to expose to window for legacy scripts
if (typeof window !== 'undefined') {
  (window as any).experienceStarted = experienceStarted;
  (window as any).setExperienceStarted = (value: boolean) => setExperienceStarted(value);
  (window as any).setExperiencePhase = (phase: ExperiencePhase) => setExperiencePhase(phase);
}



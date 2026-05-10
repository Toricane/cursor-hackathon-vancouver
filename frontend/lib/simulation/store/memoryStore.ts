import { SimulationState } from '../types';

interface SimulationStore {
  create(state: SimulationState): void;
  get(id: string): SimulationState | null;
  update(id: string, updater: (state: SimulationState) => SimulationState): SimulationState | null;
}

// NOTE: This is a single-process in-memory store. It works locally and survives Next.js
// HMR via globalThis, but it is NOT durable across serverless invocations: on Vercel each
// Lambda has its own process, so a request routed to a different instance than the one
// that created a simulation will get a 404. Tracking Supabase migration as the persistence
// layer (see SocietyAI_Hackathon.md) before deploying to a multi-instance environment.
declare global {
  var __societySimulationStore: Map<string, SimulationState> | undefined;
}

const storeMap = globalThis.__societySimulationStore ?? new Map<string, SimulationState>();
globalThis.__societySimulationStore = storeMap;

function cloneState(state: SimulationState): SimulationState {
  return structuredClone(state);
}

export const memoryStore: SimulationStore = {
  create(state) {
    storeMap.set(state.id, cloneState(state));
  },
  get(id) {
    const state = storeMap.get(id);
    return state ? cloneState(state) : null;
  },
  update(id, updater) {
    const current = storeMap.get(id);
    if (!current) {
      return null;
    }

    const next = updater(cloneState(current));
    storeMap.set(id, cloneState(next));
    return cloneState(next);
  },
};

import { SimulationState } from '../types';

interface SimulationStore {
  create(state: SimulationState): void;
  get(id: string): SimulationState | null;
  update(id: string, updater: (state: SimulationState) => SimulationState): SimulationState | null;
}

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

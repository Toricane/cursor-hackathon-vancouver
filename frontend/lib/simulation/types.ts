export const REACTIONS = [
  'Supportive',
  'Neutral',
  'Skeptical',
  'Opposed',
  'Undecided',
] as const;

export type Reaction = (typeof REACTIONS)[number];

export interface PopulationModelConfig {
  modelId: string;
  calls: number;
  population: number;
}

export interface CreateSimulationInput {
  question?: string;
  context?: string;
  composerModel: string;
  populationModels: PopulationModelConfig[];
}

export interface Citizen {
  id: number;
  name: string;
  bio: string;
  age: number;
  profession: string;
  income: number;
  reaction: Reaction;
  modelId: string;
  lastMessage: string;
}

export interface Utterance {
  citizenId: number;
  text: string;
  reaction: Reaction;
}

export interface GroupMessage {
  citizenId: number;
  text: string;
  reaction: Reaction;
}

export interface GroupFinalStance {
  citizenId: number;
  reaction: Reaction;
  text: string;
}

export interface GroupConversation {
  groupId: number;
  round: number;
  modelId: string;
  memberIds: number[];
  exchanges: GroupMessage[][];
  summary: string;
  finalStances: GroupFinalStance[];
}

export interface ComposerChatMessage {
  role: 'user' | 'composer';
  text: string;
  createdAt: number;
}

export interface NiaSourceRef {
  title: string;
  url: string;
  summary: string;
  category: 'github' | 'documentation' | 'other';
}

export interface RoundSummary {
  round: number;
  speakerIds: number[];
  reactionDeltas: Record<Reaction, number>;
}

export interface StanceShift {
  citizenId: number;
  name: string;
  from: Reaction;
  to: Reaction;
}

export interface RoundNarrative {
  round: number;
  text: string;
  stanceShifts: StanceShift[];
}

export interface SimulationState {
  id: string;
  question: string;
  context: string;
  status: 'idle' | 'running';
  round: number;
  composerModel: string;
  populationModels: PopulationModelConfig[];
  citizens: Citizen[];
  reactionCounts: Record<Reaction, number>;
  recentUtterances: Utterance[];
  groups: GroupConversation[];
  latestRoundNarrative: RoundNarrative | null;
  niaSources: NiaSourceRef[];
  composerChat: ComposerChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface RunRoundResult {
  state: SimulationState;
  roundSummary: RoundSummary;
}

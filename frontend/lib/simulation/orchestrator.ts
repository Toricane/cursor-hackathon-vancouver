import {
  CreateSimulationInput,
  Citizen,
  GroupConversation,
  GroupFinalStance,
  GroupMessage,
  Reaction,
  REACTIONS,
  RunRoundResult,
  SimulationState,
  Utterance,
} from './types';
import { memoryStore } from './store/memoryStore';
import {
  CloDRequestError,
  LlmJsonParseError,
  clodChatCompletion,
  parseJsonFromModel,
} from '@/lib/llm/client';

const GROUP_SIZE = 8;
const EXCHANGES_PER_GROUP = 3;
const GROUP_SYSTEM_PROMPT = [
  'You are running a live debate between specific named individuals. Each speaker must sound like a real, distinct person — not a policy paper, not a press release.',
  '',
  'VOICE — every turn must follow these:',
  '- Speak in the vocabulary the person\'s bio implies. A construction worker doesn\'t say "enforceable design standards", he says things like "my crew needs to feed their families". An urban planner uses planner words; a teacher uses teacher words. Diverge.',
  '- Anchor in something concrete: a number, a place name, a personal anecdote, a memory, a specific fear or stake. Never wave at "more studies", "rigorous assessments", "comprehensive review", or "concrete commitments".',
  '- Vary sentence shape: questions, fragments, asides, exasperation, callbacks. Do not use the formula "I [stance] [verb] [condition]" ("I support X provided Y", "I remain skeptical unless Z"). It is banned.',
  '- Never start with "As a [profession]..." — lazy.',
  '- Do not repeat a point you already made; bring a new angle each turn.',
  '',
  'DEBATE — response turns must do this:',
  '- Address at least one other speaker by first name and react to the specific thing they just said: push back on it, build on it, partly concede, or ask them a pointed question.',
  '- This is a debate, not a panel. Disagree directly. Concede when you should.',
  '- If a previous speaker actually moved you, update your "reaction" this turn — change is realistic and encouraged. Undecided/Neutral speakers especially should commit by exchange 3 if anyone made a strong case.',
  '',
  'LENGTH: openings are exactly one sentence. Responses are one or two sentences, tight.',
].join('\n');

const PROFESSIONS = [
  'Engineer',
  'Teacher',
  'Doctor',
  'Farmer',
  'Merchant',
  'Artist',
  'Nurse',
  'Lawyer',
  'Chef',
  'Driver',
  'Carpenter',
  'Scientist',
  'Journalist',
  'Builder',
  'Clerk',
];

const FIRST_NAMES = [
  'Ava',
  'Liam',
  'Noah',
  'Emma',
  'Mia',
  'Ethan',
  'Lucas',
  'Olivia',
  'Zoe',
  'Mason',
  'Aria',
  'Kai',
  'Nora',
  'Ivy',
  'Leo',
];

const LAST_NAMES = [
  'Patel',
  'Chen',
  'Singh',
  'Smith',
  'Garcia',
  'Nguyen',
  'Brown',
  'Wilson',
  'Davis',
  'Martin',
  'Anderson',
  'Walker',
  'Taylor',
  'Young',
  'Hall',
];

function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickReaction(rng: () => number): Reaction {
  const idx = Math.floor(rng() * REACTIONS.length);
  return REACTIONS[idx];
}

function shiftReaction(current: Reaction, shift: number): Reaction {
  const idx = REACTIONS.indexOf(current);
  const nextIdx = clamp(idx + shift, 0, REACTIONS.length - 1);
  return REACTIONS[nextIdx];
}

function computeReactionCounts(citizens: SimulationState['citizens']) {
  return REACTIONS.reduce<Record<Reaction, number>>(
    (acc, reaction) => {
      acc[reaction] = citizens.filter((c) => c.reaction === reaction).length;
      return acc;
    },
    {
      Supportive: 0,
      Neutral: 0,
      Skeptical: 0,
      Opposed: 0,
      Undecided: 0,
    },
  );
}

function simulationId() {
  return `sim_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCitizenMessage(name: string, question: string, reaction: Reaction) {
  const shortQuestion = question.length > 80 ? `${question.slice(0, 77)}...` : question;
  return `${name}: "${reaction} for now on '${shortQuestion}'. I am adjusting my view based on what others said this round."`;
}

function shouldRethrowLlmError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.toLowerCase().includes('api key not configured');
}

const RETRYABLE_CLOD_STATUSES = new Set([
  400, // bad request / unknown model on this endpoint
  408, // request timeout (also used for our client-side AbortError)
  409, // conflict (occasionally seen with concurrent calls)
  425, // too early
  429, // rate limited
  500, // upstream server error
  502, // bad gateway
  503, // service unavailable
  504, // gateway timeout
  520, // Cloudflare: unknown
  521, // Cloudflare: web server is down
  522, // Cloudflare: connection timed out
  523, // Cloudflare: origin is unreachable
  524, // Cloudflare: a timeout occurred
  525, // Cloudflare: SSL handshake failed
]);

function isRetryableModelError(error: unknown) {
  return error instanceof CloDRequestError && RETRYABLE_CLOD_STATUSES.has(error.status);
}

function normalizeReaction(raw: string | undefined): Reaction {
  if (!raw) return 'Neutral';
  const normalized = raw.trim().toLowerCase();
  const matched = REACTIONS.find((r) => r.toLowerCase() === normalized);
  if (matched) return matched;

  if (normalized.includes('support')) return 'Supportive';
  if (normalized.includes('skeptic')) return 'Skeptical';
  if (normalized.includes('oppos')) return 'Opposed';
  if (normalized.includes('undecid')) return 'Undecided';
  return 'Neutral';
}

function buildFallbackCitizens(totalPopulation: number, input: CreateSimulationInput, seed: number) {
  const rng = seededRandom(seed);
  return Array.from({ length: totalPopulation }, (_, index) => {
    const profession = PROFESSIONS[Math.floor(rng() * PROFESSIONS.length)];
    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const modelPick = input.populationModels[index % Math.max(1, input.populationModels.length)];
    const reaction = pickReaction(rng);
    const age = Math.floor(rng() * 60) + 18;
    const income = Math.floor(rng() * 120000) + 20000;

    return {
      id: index + 1,
      name: `${first} ${last}`,
      bio: `${age}-year-old ${profession.toLowerCase()} in this civic simulation.`,
      age,
      profession,
      income,
      reaction,
      modelId: modelPick?.modelId ?? input.composerModel,
      lastMessage: `Initial stance: ${reaction}.`,
    };
  });
}

type GeneratedCitizen = {
  name?: string;
  bio?: string;
  age?: number;
  profession?: string;
  income?: number;
  reaction?: string;
};

async function generateCitizenBatch(args: {
  composerModel: string;
  question: string;
  context: string;
  batchSize: number;
  cohortLabel?: string;
}): Promise<GeneratedCitizen[]> {
  type PopulationResponse = { citizens?: GeneratedCitizen[] };

  const prompt = [
    `Policy question: ${args.question}`,
    `Shared context: ${args.context || '(none provided)'}`,
    args.cohortLabel
      ? `Generate exactly ${args.batchSize} citizens for the "${args.cohortLabel}" cohort of a civic simulation.`
      : `Generate exactly ${args.batchSize} citizens for a civic simulation.`,
    'Return JSON only in this shape:',
    '{"citizens":[{"name":"...","bio":"...","age":35,"profession":"Teacher","income":71000,"reaction":"Supportive|Neutral|Skeptical|Opposed|Undecided"}]}',
    'Do not include markdown or explanations.',
  ].join('\n');

  const raw = await clodChatCompletion({
    model: args.composerModel,
    temperature: 1,
    messages: [
      {
        role: 'system',
        content:
          'You are a civic simulation composer. Generate diverse, realistic synthetic residents.',
      },
      { role: 'user', content: prompt },
    ],
  });

  const parsed = parseJsonFromModel<PopulationResponse>(raw);
  return parsed.citizens ?? [];
}

function chunkBy<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function simSeed(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function formatTranscript(memberIndex: Map<number, Citizen>, exchanges: GroupMessage[][]) {
  const lines: string[] = [];
  exchanges.forEach((round, idx) => {
    lines.push(`Exchange ${idx + 1}:`);
    round.forEach((m) => {
      const c = memberIndex.get(m.citizenId);
      const speaker = c ? `${c.name} (#${c.id}, ${c.profession})` : `#${m.citizenId}`;
      lines.push(`- ${speaker} [${m.reaction}]: ${m.text}`);
    });
  });
  return lines.join('\n');
}

function memberPayload(members: Citizen[]) {
  return members.map((c) => ({
    citizenId: c.id,
    name: c.name,
    bio: c.bio,
    profession: c.profession,
    currentReaction: c.reaction,
  }));
}

async function callGroupModelAndParse<T>(args: {
  modelId: string;
  composerModel: string;
  messages: { role: 'system' | 'user'; content: string }[];
  label: string;
}): Promise<T> {
  const attempt = async (modelId: string) => {
    const raw = await clodChatCompletion({
      model: modelId,
      temperature: 1,
      messages: args.messages,
    });
    return { raw, parsed: parseJsonFromModel<T>(raw) };
  };

  try {
    return (await attempt(args.modelId)).parsed;
  } catch (error) {
    const canRetry =
      args.modelId !== args.composerModel &&
      (isRetryableModelError(error) || error instanceof LlmJsonParseError);

    if (!canRetry) {
      throw error;
    }

    const reason = error instanceof LlmJsonParseError
      ? 'malformed JSON'
      : error instanceof CloDRequestError
        ? `CloD ${error.status}`
        : 'transient error';
    console.warn(
      `[simulation/${args.label}] model "${args.modelId}" returned ${reason}; retrying with composer model "${args.composerModel}".`,
    );

    if (error instanceof LlmJsonParseError) {
      const preview = error.raw.replace(/\s+/g, ' ').trim().slice(0, 240);
      console.warn(`[simulation/${args.label}] malformed JSON preview: ${preview}`);
    }

    return (await attempt(args.composerModel)).parsed;
  }
}

function normalizeMessages(
  raw: unknown,
  members: Citizen[],
): GroupMessage[] {
  type Item = { citizenId?: number; text?: string; reaction?: string };
  const list = Array.isArray((raw as { utterances?: Item[] } | undefined)?.utterances)
    ? ((raw as { utterances?: Item[] }).utterances as Item[])
    : [];
  const allowed = new Set(members.map((m) => m.id));
  const seen = new Set<number>();
  const cleaned: GroupMessage[] = [];
  for (const item of list) {
    if (!item || typeof item.citizenId !== 'number') continue;
    if (!allowed.has(item.citizenId) || seen.has(item.citizenId)) continue;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    cleaned.push({
      citizenId: item.citizenId,
      text,
      reaction: normalizeReaction(item.reaction),
    });
    seen.add(item.citizenId);
  }
  return cleaned;
}

function fillMissingMessages(
  produced: GroupMessage[],
  members: Citizen[],
  rng: () => number,
  question: string,
): GroupMessage[] {
  const byId = new Map(produced.map((m) => [m.citizenId, m]));
  return members.map((c) => {
    const existing = byId.get(c.id);
    if (existing) return existing;
    const shift = rng() < 0.33 ? -1 : rng() > 0.66 ? 1 : 0;
    const reaction = shiftReaction(c.reaction, shift);
    return {
      citizenId: c.id,
      reaction,
      text: buildCitizenMessage(c.name, question, reaction),
    };
  });
}

async function runOpeningExchange(args: {
  modelId: string;
  composerModel: string;
  state: SimulationState;
  members: Citizen[];
}): Promise<GroupMessage[]> {
  const prompt = [
    `Policy question: ${args.state.question}`,
    `Shared context: ${args.state.context || '(none provided)'}`,
    'Group members:',
    JSON.stringify(memberPayload(args.members)),
    '',
    'Open the debate. Each member speaks ONCE.',
    'The opening line should feel like THIS PERSON walking into the room — anchor it in a specific hook from their bio: a memory, a stake, a place they live or work, a number from their life, a fear, a frustration. The stance should be obvious from the content, not announced.',
    'Hard bans for opening lines:',
    '- Do not start with "As a [profession]..." or "Speaking as a..."',
    '- Do not use the formula "I support/oppose X if/provided/unless Y"',
    '- Do not use phrases like "rigorous studies", "comprehensive assessment", "concrete commitments", "enforceable standards"',
    '- Do not restate the policy question back',
    '',
    'Return JSON only:',
    '{"utterances":[{"citizenId":1,"text":"...","reaction":"Supportive|Neutral|Skeptical|Opposed|Undecided"}]}',
    'Exactly one utterance per member, in any order, no extra IDs, no commentary.',
  ].join('\n');

  const parsed = await callGroupModelAndParse<unknown>({
    modelId: args.modelId,
    composerModel: args.composerModel,
    label: 'group/opening',
    messages: [
      { role: 'system', content: GROUP_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return normalizeMessages(parsed, args.members);
}

async function runResponseExchange(args: {
  modelId: string;
  composerModel: string;
  state: SimulationState;
  members: Citizen[];
  transcript: string;
  subRound: number;
}): Promise<GroupMessage[]> {
  const prompt = [
    `Policy question: ${args.state.question}`,
    `Shared context: ${args.state.context || '(none provided)'}`,
    'Group members:',
    JSON.stringify(memberPayload(args.members)),
    'Conversation so far:',
    args.transcript,
    '',
    `Sub-round ${args.subRound + 1} of ${EXCHANGES_PER_GROUP}. Each member speaks ONCE. Their reply MUST do all of:`,
    '1. Address at least one OTHER speaker by first name and react to the SPECIFIC thing they said — quote a phrase or paraphrase it. Then push back on it, build on it, partly concede, or ask them a pointed question.',
    '2. Bring ONE new angle, fact, or specific anecdote you have not used yet this conversation. No restating earlier points.',
    '3. Stay in character — vocabulary, slang, references that match the person\'s bio. Avoid policy-memo language.',
    '4. Skip the "I [stance] [verb] [condition]" formula entirely. Mix in questions, fragments, exasperation, callbacks where they fit.',
    '',
    'STANCE SHIFTS ARE EXPECTED. If another speaker actually moved you, change your reaction this turn — set the new value in the "reaction" field. Real conversations change minds.',
    args.subRound + 1 >= EXCHANGES_PER_GROUP - 1
      ? 'This is the final response exchange. Undecided and Neutral speakers should strongly consider committing to a side now if they\'ve heard a compelling case.'
      : '',
    '',
    'Return JSON only:',
    '{"utterances":[{"citizenId":1,"text":"...","reaction":"Supportive|Neutral|Skeptical|Opposed|Undecided"}]}',
    'Exactly one utterance per member, in any order, no extra IDs, no commentary.',
  ].filter(Boolean).join('\n');

  const parsed = await callGroupModelAndParse<unknown>({
    modelId: args.modelId,
    composerModel: args.composerModel,
    label: `group/respond-${args.subRound + 1}`,
    messages: [
      { role: 'system', content: GROUP_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });

  return normalizeMessages(parsed, args.members);
}

async function runSummaryAndStances(args: {
  modelId: string;
  composerModel: string;
  state: SimulationState;
  members: Citizen[];
  transcript: string;
}): Promise<{ summary: string; finalStances: GroupFinalStance[] }> {
  const prompt = [
    `Policy question: ${args.state.question}`,
    `Shared context: ${args.state.context || '(none provided)'}`,
    'Group members:',
    JSON.stringify(memberPayload(args.members)),
    'Conversation transcript:',
    args.transcript,
    '',
    'Write a 2-3 sentence narrative summary of how THIS specific conversation unfolded: who said what specific thing that landed, where the real tension was, who shifted (and what moved them), and where the group still disagrees. Reference at least one person by first name and one concrete moment or claim from the transcript.',
    'Hard bans for the summary:',
    '- No "the group was divided" / "they discussed concerns about X" generic framing.',
    '- No bullet-point policy bullets ("supporters emphasize X while skeptics worry Y").',
    '- No phrases like "rigorous environmental studies", "concrete commitments", "comprehensive assessment".',
    '',
    'Then each member submits ONE closing sentence in their own voice — their actual final position after hearing the others. Stances may shift from where they started; reflect what really happened in the transcript. Do not have everyone restate the same compromise position.',
    '',
    'Return JSON only:',
    '{"summary":"...","finalStances":[{"citizenId":1,"reaction":"Supportive|Neutral|Skeptical|Opposed|Undecided","text":"..."}]}',
    'Exactly one finalStance per member, no extra IDs, no commentary.',
  ].join('\n');

  type SummaryResponse = {
    summary?: string;
    finalStances?: Array<{ citizenId?: number; reaction?: string; text?: string }>;
  };

  const parsed = await callGroupModelAndParse<SummaryResponse>({
    modelId: args.modelId,
    composerModel: args.composerModel,
    label: 'group/summary',
    messages: [
      { role: 'system', content: GROUP_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
  });
  const allowed = new Set(args.members.map((m) => m.id));
  const seen = new Set<number>();
  const finalStances: GroupFinalStance[] = [];

  for (const item of parsed.finalStances ?? []) {
    if (!item || typeof item.citizenId !== 'number') continue;
    if (!allowed.has(item.citizenId) || seen.has(item.citizenId)) continue;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;
    finalStances.push({
      citizenId: item.citizenId,
      reaction: normalizeReaction(item.reaction),
      text,
    });
    seen.add(item.citizenId);
  }

  return {
    summary: typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim()
      : 'Group discussion concluded without a summary.',
    finalStances,
  };
}

function fallbackGroupConversation(
  state: SimulationState,
  members: Citizen[],
  groupId: number,
  modelId: string,
  rng: () => number,
): GroupConversation {
  const exchanges: GroupMessage[][] = [];
  const runningReactions = new Map(members.map((m) => [m.id, m.reaction] as const));

  for (let i = 0; i < EXCHANGES_PER_GROUP; i += 1) {
    const round: GroupMessage[] = members.map((c) => {
      const cur = runningReactions.get(c.id) ?? c.reaction;
      const shift = rng() < 0.3 ? -1 : rng() > 0.7 ? 1 : 0;
      const next = shiftReaction(cur, shift);
      runningReactions.set(c.id, next);
      return {
        citizenId: c.id,
        reaction: next,
        text: buildCitizenMessage(c.name, state.question, next),
      };
    });
    exchanges.push(round);
  }

  const finalStances: GroupFinalStance[] = members.map((c) => {
    const reaction = runningReactions.get(c.id) ?? c.reaction;
    return {
      citizenId: c.id,
      reaction,
      text: `${c.name} settles on a ${reaction.toLowerCase()} stance after the discussion.`,
    };
  });

  return {
    groupId,
    round: state.round,
    modelId,
    memberIds: members.map((m) => m.id),
    exchanges,
    summary:
      'The group exchanged views without a model-generated summary; stances updated using local heuristics.',
    finalStances,
  };
}

async function runGroup(args: {
  state: SimulationState;
  members: Citizen[];
  groupId: number;
  modelId: string;
  rng: () => number;
}): Promise<GroupConversation> {
  const { state, members, groupId, modelId, rng } = args;
  const composerModel = state.composerModel;
  const memberIndex = new Map(members.map((m) => [m.id, m] as const));
  const exchanges: GroupMessage[][] = [];

  try {
    const opening = await runOpeningExchange({ modelId, composerModel, state, members });
    exchanges.push(fillMissingMessages(opening, members, rng, state.question));

    for (let i = 1; i < EXCHANGES_PER_GROUP; i += 1) {
      const transcript = formatTranscript(memberIndex, exchanges);
      const responses = await runResponseExchange({
        modelId,
        composerModel,
        state,
        members,
        transcript,
        subRound: i,
      });
      exchanges.push(fillMissingMessages(responses, members, rng, state.question));
    }

    const transcript = formatTranscript(memberIndex, exchanges);
    const { summary, finalStances } = await runSummaryAndStances({
      modelId,
      composerModel,
      state,
      members,
      transcript,
    });

    const stanceById = new Map(finalStances.map((s) => [s.citizenId, s]));
    const filledStances: GroupFinalStance[] = members.map((c) => {
      const existing = stanceById.get(c.id);
      if (existing) return existing;
      const lastReaction =
        exchanges[exchanges.length - 1]?.find((m) => m.citizenId === c.id)?.reaction ?? c.reaction;
      return {
        citizenId: c.id,
        reaction: lastReaction,
        text: `${c.name} maintains a ${lastReaction.toLowerCase()} position after the exchange.`,
      };
    });

    return {
      groupId,
      round: state.round,
      modelId,
      memberIds: members.map((m) => m.id),
      exchanges,
      summary,
      finalStances: filledStances,
    };
  } catch (error) {
    console.error(
      `[simulation/round] group ${groupId} failed with model "${modelId}"; falling back to local heuristics`,
      error,
    );
    if (error instanceof CloDRequestError) {
      console.error(
        `[simulation/round] CloD details: status=${error.status} model=${error.model} endpoint=${error.endpoint} details=${error.details}`,
      );
    }
    if (shouldRethrowLlmError(error)) {
      throw error;
    }
    return fallbackGroupConversation(state, members, groupId, modelId, rng);
  }
}

export async function createSimulation(input: CreateSimulationInput): Promise<SimulationState> {
  const id = simulationId();
  const now = Date.now();
  const question = (input.question ?? '').trim() || 'Should Vancouver build a taller downtown skyline?';
  const context = input.context?.trim() ?? '';
  const totalPopulation = input.populationModels.reduce((sum, row) => sum + row.population, 0);
  const fallback = buildFallbackCitizens(totalPopulation, input, now % 100000);

  const citizens = [...fallback];

  type Cohort = { modelId: string; entries: { idx: number; base: typeof fallback[number] }[] };
  const cohortMap = new Map<string, Cohort>();
  fallback.forEach((base, idx) => {
    const cohort = cohortMap.get(base.modelId) ?? { modelId: base.modelId, entries: [] };
    cohort.entries.push({ idx, base });
    cohortMap.set(base.modelId, cohort);
  });
  const cohorts = Array.from(cohortMap.values());

  const enrichBase = (base: typeof fallback[number], g: GeneratedCitizen | undefined) => ({
    ...base,
    name: g?.name?.trim() || base.name,
    bio: g?.bio?.trim() || base.bio,
    age: clamp(Math.floor(g?.age ?? base.age), 18, 90),
    profession: g?.profession?.trim() || base.profession,
    income: clamp(Math.floor(g?.income ?? base.income), 15000, 500000),
    reaction: g?.reaction ? normalizeReaction(g.reaction) : base.reaction,
  });

  const results = await Promise.allSettled(
    cohorts.map((cohort) =>
      generateCitizenBatch({
        composerModel: input.composerModel,
        question,
        context,
        batchSize: cohort.entries.length,
        cohortLabel: cohort.modelId,
      }),
    ),
  );

  results.forEach((res, i) => {
    const cohort = cohorts[i];
    if (res.status === 'fulfilled') {
      cohort.entries.forEach(({ idx, base }, j) => {
        citizens[idx] = enrichBase(base, res.value[j]);
      });
    } else {
      const reason = res.reason;
      console.error(
        `[simulation/create] cohort "${cohort.modelId}" failed to generate citizens with CloD; keeping fallback citizens for that cohort`,
        reason,
      );
      if (shouldRethrowLlmError(reason)) {
        throw reason;
      }
    }
  });

  const state: SimulationState = {
    id,
    question,
    context,
    status: 'running',
    round: 1,
    composerModel: input.composerModel,
    populationModels: input.populationModels,
    citizens,
    reactionCounts: computeReactionCounts(citizens),
    recentUtterances: [],
    groups: [],
    composerChat: [
      {
        role: 'composer',
        text: 'Hello. I am overseeing this simulation. Ask me anything about the population or current state.',
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  memoryStore.create(state);
  return state;
}

export function getSimulation(id: string) {
  return memoryStore.get(id);
}

export async function runRound(id: string, _speakerCount?: number): Promise<RunRoundResult | null> {
  void _speakerCount;
  const previous = memoryStore.get(id);
  if (!previous) {
    return null;
  }

  const roundSeed = simSeed(previous.id) ^ ((previous.round + 1) * 1009);
  const rng = seededRandom(roundSeed >>> 0);

  const shuffled = shuffleWithRng(previous.citizens, rng);
  const chunks = chunkBy(shuffled, GROUP_SIZE);
  if (chunks.length >= 2 && chunks[chunks.length - 1].length < Math.max(2, Math.floor(GROUP_SIZE / 2))) {
    const tail = chunks.pop()!;
    chunks[chunks.length - 1] = [...chunks[chunks.length - 1], ...tail];
  }

  const modelPool = previous.populationModels.length > 0
    ? previous.populationModels.map((m) => m.modelId)
    : [previous.composerModel];

  const groups = await Promise.all(
    chunks.map((members, idx) => {
      const groupRng = seededRandom((roundSeed ^ ((idx + 1) * 9173)) >>> 0);
      const modelId = modelPool[idx % modelPool.length] || previous.composerModel;
      return runGroup({
        state: previous,
        members,
        groupId: idx + 1,
        modelId,
        rng: groupRng,
      });
    }),
  );

  const stanceById = new Map<number, GroupFinalStance>();
  for (const group of groups) {
    for (const stance of group.finalStances) {
      stanceById.set(stance.citizenId, stance);
    }
  }

  const recentUtterances: Utterance[] = groups
    .flatMap((g) =>
      g.finalStances.slice(-2).map((s) => ({
        citizenId: s.citizenId,
        text: s.text,
        reaction: s.reaction,
      })),
    )
    .slice(0, 10);

  const updated = memoryStore.update(id, (state) => {
    const nextCitizens = state.citizens.map((citizen) => {
      const stance = stanceById.get(citizen.id);
      if (!stance) return citizen;
      return {
        ...citizen,
        reaction: stance.reaction,
        lastMessage: stance.text,
      };
    });

    return {
      ...state,
      round: state.round + 1,
      citizens: nextCitizens,
      reactionCounts: computeReactionCounts(nextCitizens),
      recentUtterances,
      groups,
      updatedAt: Date.now(),
    };
  });

  if (!updated) {
    return null;
  }

  const deltas: Record<Reaction, number> = {
    Supportive: 0,
    Neutral: 0,
    Skeptical: 0,
    Opposed: 0,
    Undecided: 0,
  };

  for (const reaction of REACTIONS) {
    deltas[reaction] = updated.reactionCounts[reaction] - previous.reactionCounts[reaction];
  }

  return {
    state: updated,
    roundSummary: {
      round: updated.round,
      speakerIds: Array.from(stanceById.keys()),
      reactionDeltas: deltas,
    },
  };
}

export async function askComposer(id: string, message: string): Promise<SimulationState | null> {
  const cleanMessage = message.trim();
  if (!cleanMessage) {
    return getSimulation(id);
  }

  const current = memoryStore.get(id);
  if (!current) return null;

  const total = current.citizens.length;
  const topReaction = [...REACTIONS].sort(
    (a, b) => current.reactionCounts[b] - current.reactionCounts[a],
  )[0];
  const fallbackAnswer = `Round ${current.round}: ${current.reactionCounts[topReaction]} / ${total} are ${topReaction.toLowerCase()}. Most recent speakers: ${
    current.recentUtterances.slice(0, 3).map((u) => `#${u.citizenId}`).join(', ') || 'none yet'
  }.`;

  let answer = fallbackAnswer;
  try {
    const raw = await clodChatCompletion({
      model: current.composerModel,
      temperature: 1,
      messages: [
        {
          role: 'system',
          content:
            'You are the Composer for a civic simulation. Answer concisely and stay grounded in provided state.',
        },
        {
          role: 'user',
          content: [
            `Question: ${current.question}`,
            `Context: ${current.context || '(none provided)'}`,
            `Current round: ${current.round}`,
            `Reaction counts: ${JSON.stringify(current.reactionCounts)}`,
            `Recent utterances: ${JSON.stringify(current.recentUtterances.slice(-5))}`,
            `User ask: ${cleanMessage}`,
            'Respond in 1-3 short sentences.',
          ].join('\n'),
        },
      ],
    });
    if (raw.trim().length > 0) {
      answer = raw.trim();
    }
  } catch (error) {
    console.error('[simulation/composer] failed to generate composer response with CloD', error);
    if (error instanceof CloDRequestError) {
      console.error(
        `[simulation/composer] CloD details: status=${error.status} model=${error.model} endpoint=${error.endpoint} details=${error.details}`,
      );
    }
    if (shouldRethrowLlmError(error)) {
      throw error;
    }
    answer = fallbackAnswer;
  }

  return memoryStore.update(id, (state) => {
    const now = Date.now();

    return {
      ...state,
      composerChat: [
        ...state.composerChat,
        { role: 'user', text: cleanMessage, createdAt: now },
        { role: 'composer', text: answer, createdAt: now + 1 },
      ],
      updatedAt: now,
    };
  });
}

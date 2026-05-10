import { jsonrepair } from 'jsonrepair';

type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface CloDChatChoice {
  message?: {
    content?: string | Array<{ type?: string; text?: string }>;
  };
}

interface CloDChatResponse {
  choices?: CloDChatChoice[];
  error?: unknown;
}

export class CloDRequestError extends Error {
  status: number;
  model: string;
  endpoint: string;
  details: string;

  constructor(args: { status: number; model: string; endpoint: string; details: string }) {
    super(`CloD request failed (${args.status}) for model "${args.model}": ${args.details}`);
    this.name = 'CloDRequestError';
    this.status = args.status;
    this.model = args.model;
    this.endpoint = args.endpoint;
    this.details = args.details;
  }
}

function resolveApiKey() {
  return process.env.CloD_API_KEY || process.env.CLOD_API_KEY || process.env.P_CLOD;
}

const MODEL_ALIASES: Record<string, string> = {
  // Anthropic
  'claude-haiku-4-5':   'Claude Haiku 4.5',
  'claude-sonnet-4-0':  'Claude Sonnet 4.0',
  'claude-sonnet-4-5':  'Claude Sonnet 4.5',
  'claude-opus-4-0':    'Claude Opus 4.0',
  'claude-opus-4-5':    'Claude Opus 4.5',
  'claude-opus-4-6':    'Claude Opus 4.6',
  'claude-opus-4-7':    'Claude Opus 4.7',
  // OpenAI
  'gpt-4o':             'GPT-4o',
  'gpt-4o-mini':        'GPT-4o Mini',
  'gpt-4-turbo':        'GPT-4 Turbo',
  'gpt-4-1':            'GPT-4.1',
  'gpt-5':              'GPT-5',
  'gpt-5-2':            'GPT-5.2',
  'gpt-5-3-codex':      'GPT 5.3 Codex',
  'gpt-5-mini':         'GPT-5 Mini',
  'gpt-5-nano':         'GPT-5 Nano',
  'gpt-oss-120b':       'GPT OSS 120B',
  'gpt-oss-20b':        'GPT OSS 20B',
  // Google
  'gemini-2-5-flash':   'Gemini 2.5 Flash',
  'gemini-2-5-pro':     'Gemini 2.5 Pro',
  'gemini-3-flash':     'Gemini 3 Flash',
  'gemma-3n-e4b':       'Gemma 3N E4B IT',
  'gemma-4-31b':        'Gemma 4 31B IT',
  // Meta
  'llama-3-1-8b':       'Llama 3.1 8B',
  'llama-3-3-70b':      'Meta Llama 3.3 70B Instruct',
  'llama-3-3-70b-turbo':'Llama 3.3 70B Instruct Turbo',
  'llama-3-8b-lite':    'Llama 3 8B Instruct Lite',
  // xAI
  'grok-3':             'Grok 3',
  'grok-4':             'Grok 4',
  // DeepSeek
  'deepseek-r1':        'DeepSeek R1',
  'deepseek-v4-pro':    'DeepSeek V4 Pro',
  'deepseek-v3-2':      'DeepSeek V3.2',
  // Alibaba (Qwen)
  'qwen-2-5-7b':        'Qwen 2.5 7B Instruct Turbo',
  'qwen-3-235b':        'Qwen 3 235B A22B Thinking 2507',
  'qwen-3-coder':       'Qwen 3 Coder 480B A35B Instruct FP8',
  // Moonshot (Kimi)
  'kimi-k2-5':          'Kimi K2.5',
  'kimi-k2-6':          'Kimi K2.6',
  // Minimax
  'minimax-m2-5':       'Minimax M2.5',
  'minimax-m2-7':       'Minimax M2.7',
  // Zhipu AI (GLM)
  'glm-5':              'GLM 5',
  'glm-5-1':            'GLM 5.1',
  // Nous Research
  'trinity-mini':       'Trinity Mini',
};

function resolveModel(model: string) {
  const byEnv = process.env.CLOD_MODEL_ALIASES?.trim();
  if (byEnv) {
    try {
      const parsed = JSON.parse(byEnv) as Record<string, string>;
      if (parsed[model]) {
        return parsed[model];
      }
    } catch {
      // ignore malformed env alias map
    }
  }
  return MODEL_ALIASES[model] || model;
}

function resolveEndpoint() {
  const configured = process.env.ENDPOINT || process.env.CLOD_ENDPOINT || process.env.E_CLOD;
  if (configured && configured.trim().length > 0) {
    return configured.trim();
  }
  return 'https://api.clod.io/v1';
}

export async function clodChatCompletion(args: {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
}) {
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error('CloD API key not configured');
  }

  const endpoint = resolveEndpoint();
  const resolvedModel = resolveModel(args.model);
  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages: args.messages,
      temperature: args.temperature ?? 1,
    }),
  });

  const rawBody = await response.text();
  let data: CloDChatResponse = {};
  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody) as CloDChatResponse;
    } catch {
      // keep raw body as details below
    }
  }

  if (!response.ok) {
    const details = typeof data.error === 'string'
      ? data.error
      : rawBody.trim() || 'No error body returned';
    throw new CloDRequestError({
      status: response.status,
      model: `${args.model}${resolvedModel !== args.model ? ` -> ${resolvedModel}` : ''}`,
      endpoint,
      details: details.slice(0, 700),
    });
  }

  const content = data.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((c) => c.text ?? '').join('\n');
  }

  throw new Error('CloD response missing assistant content');
}

export class LlmJsonParseError extends Error {
  raw: string;
  constructor(message: string, raw: string) {
    super(message);
    this.name = 'LlmJsonParseError';
    this.raw = raw;
  }
}

function tryParse<T>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

function tryRepair<T>(text: string): T | undefined {
  try {
    const repaired = jsonrepair(text);
    return JSON.parse(repaired) as T;
  } catch {
    return undefined;
  }
}

export function parseJsonFromModel<T>(raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new LlmJsonParseError('Empty model response', raw);
  }

  const direct = tryParse<T>(trimmed);
  if (direct !== undefined) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) {
    const fromFenced = tryParse<T>(fenced) ?? tryRepair<T>(fenced);
    if (fromFenced !== undefined) return fromFenced;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    const fromSlice = tryParse<T>(candidate) ?? tryRepair<T>(candidate);
    if (fromSlice !== undefined) return fromSlice;
  }

  const repaired = tryRepair<T>(trimmed);
  if (repaired !== undefined) return repaired;

  throw new LlmJsonParseError('Model response did not contain valid JSON', raw);
}

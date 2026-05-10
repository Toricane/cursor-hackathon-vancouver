import { NextRequest, NextResponse } from 'next/server';
import {
  isKnownModel,
  resolveApiKey,
  resolveEndpoint,
  resolveModel,
} from '@/lib/llm/client';

const MAX_MESSAGES = 12;
const MAX_CONTENT_LEN = 8_000;
const MAX_OUTPUT_TOKENS = 4_096;
const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant']);

function isDevEnv() {
  return process.env.NODE_ENV !== 'production';
}

function notFound() {
  return new NextResponse(null, { status: 404 });
}

interface IncomingMessage {
  role?: unknown;
  content?: unknown;
}

interface IncomingBody {
  model?: unknown;
  messages?: unknown;
  temperature?: unknown;
  max_completion_tokens?: unknown;
}

function validate(body: IncomingBody): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, error: 'Body must be a JSON object' };
  }

  const { model, messages, temperature, max_completion_tokens } = body;

  if (typeof model !== 'string' || !isKnownModel(model)) {
    return { ok: false, error: 'Unknown or missing model' };
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, error: 'messages must be a non-empty array' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { ok: false, error: `messages cannot exceed ${MAX_MESSAGES} entries` };
  }

  const cleanMessages: Array<{ role: string; content: string }> = [];
  for (const raw of messages as IncomingMessage[]) {
    if (!raw || typeof raw !== 'object') {
      return { ok: false, error: 'Each message must be an object' };
    }
    if (typeof raw.role !== 'string' || !ALLOWED_ROLES.has(raw.role)) {
      return { ok: false, error: 'Each message must have a role of system, user, or assistant' };
    }
    if (typeof raw.content !== 'string') {
      return { ok: false, error: 'Each message must have a string content' };
    }
    if (raw.content.length > MAX_CONTENT_LEN) {
      return { ok: false, error: `message content cannot exceed ${MAX_CONTENT_LEN} characters` };
    }
    cleanMessages.push({ role: raw.role, content: raw.content });
  }

  let temp = 1;
  if (temperature !== undefined) {
    if (typeof temperature !== 'number' || !Number.isFinite(temperature)) {
      return { ok: false, error: 'temperature must be a number' };
    }
    temp = Math.min(MAX_TEMPERATURE, Math.max(MIN_TEMPERATURE, temperature));
  }

  let maxTokens: number | undefined;
  if (max_completion_tokens !== undefined) {
    if (typeof max_completion_tokens !== 'number' || !Number.isFinite(max_completion_tokens)) {
      return { ok: false, error: 'max_completion_tokens must be a number' };
    }
    maxTokens = Math.max(1, Math.min(MAX_OUTPUT_TOKENS, Math.floor(max_completion_tokens)));
  }

  const payload: Record<string, unknown> = {
    model: resolveModel(model),
    messages: cleanMessages,
    temperature: temp,
  };
  if (maxTokens !== undefined) {
    payload.max_completion_tokens = maxTokens;
  }
  return { ok: true, payload };
}

function isAuthorized(req: NextRequest): boolean {
  const required = process.env.CLOD_PROXY_SECRET?.trim();
  if (!required) return true;
  const provided = req.headers.get('x-clod-proxy-secret')?.trim();
  return Boolean(provided) && provided === required;
}

export async function POST(req: NextRequest) {
  if (!isDevEnv()) {
    return notFound();
  }

  if (!isAuthorized(req)) {
    return notFound();
  }

  const apiKey = resolveApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'CloD API key not configured' }, { status: 500 });
  }

  let body: IncomingBody;
  try {
    body = (await req.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validated = validate(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const endpoint = resolveEndpoint();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75_000);

  try {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validated.payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({ error: 'Non-JSON response from CloD' }));

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Upstream request timed out' }, { status: 504 });
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    clearTimeout(timer);
  }
}

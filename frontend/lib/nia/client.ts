/**
 * Nia (Nozomio Labs) web search client.
 *
 * Calls the `/v2/web-search` endpoint to ground the Composer agent in
 * real-world web context (news, docs, GitHub, blogs) before it generates
 * citizens or answers chat questions. See https://docs.trynia.ai for the
 * full API contract.
 */

export interface NiaResultItem {
  title?: string;
  summary?: string;
  url?: string;
  highlights?: string[];
  owner_repo?: string;
  category?: string;
  published_date?: string;
}

export interface NiaWebSearchResponse {
  github_repos?: NiaResultItem[];
  documentation?: NiaResultItem[];
  other_content?: NiaResultItem[];
  total_results?: number;
}

export interface NiaSource {
  title: string;
  url: string;
  summary: string;
  category: 'github' | 'documentation' | 'other';
}

export type NiaCategory =
  | 'github'
  | 'company'
  | 'research'
  | 'news'
  | 'tweet'
  | 'pdf'
  | 'blog';

export class NiaRequestError extends Error {
  status: number;
  endpoint: string;
  details: string;

  constructor(args: { status: number; endpoint: string; details: string }) {
    super(`Nia request failed (${args.status}): ${args.details}`);
    this.name = 'NiaRequestError';
    this.status = args.status;
    this.endpoint = args.endpoint;
    this.details = args.details;
  }
}

export function resolveNiaApiKey(): string | undefined {
  return (
    process.env.NIA_API_KEY ||
    process.env.P_NIA ||
    process.env.E_NIA ||
    undefined
  );
}

export function isNiaConfigured(): boolean {
  return Boolean(resolveNiaApiKey());
}

export function resolveNiaEndpoint(): string {
  const candidate = process.env.NIA_ENDPOINT?.trim();
  if (candidate && /^https?:\/\//i.test(candidate)) {
    return candidate.replace(/\/+$/, '');
  }
  return 'https://apigcp.trynia.ai/v2/web-search';
}

const DEFAULT_TIMEOUT_MS = Number(process.env.NIA_REQUEST_TIMEOUT_MS) || 20_000;

export async function niaWebSearch(args: {
  query: string;
  numResults?: number;
  category?: NiaCategory;
  daysBack?: number;
  findSimilarTo?: string;
  timeoutMs?: number;
}): Promise<NiaWebSearchResponse> {
  const apiKey = resolveNiaApiKey();
  if (!apiKey) {
    throw new Error('Nia API key not configured');
  }

  const cleanedQuery = args.query.trim();
  if (!cleanedQuery) {
    throw new Error('Nia query must be a non-empty string');
  }

  const endpoint = resolveNiaEndpoint();
  const numResults = Math.max(1, Math.min(10, args.numResults ?? 5));
  const timeoutMs = args.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const body: Record<string, unknown> = {
    query: cleanedQuery,
    num_results: numResults,
  };
  if (args.category) body.category = args.category;
  if (args.daysBack && Number.isFinite(args.daysBack) && args.daysBack > 0) {
    body.days_back = Math.floor(args.daysBack);
  }
  if (args.findSimilarTo) body.find_similar_to = args.findSimilarTo;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NiaRequestError({
        status: 408,
        endpoint,
        details: `Client-side timeout after ${timeoutMs}ms`,
      });
    }
    throw error;
  }
  clearTimeout(timer);

  const rawBody = await response.text();
  let data: NiaWebSearchResponse | { error?: unknown } = {};
  if (rawBody.trim()) {
    try {
      data = JSON.parse(rawBody) as NiaWebSearchResponse | { error?: unknown };
    } catch {
      // keep raw body as details below
    }
  }

  if (!response.ok) {
    const details =
      typeof (data as { error?: unknown }).error === 'string'
        ? ((data as { error: string }).error)
        : rawBody.trim() || 'No error body returned';
    throw new NiaRequestError({
      status: response.status,
      endpoint,
      details: details.slice(0, 700),
    });
  }

  return data as NiaWebSearchResponse;
}

function trim(text: string | undefined, max: number): string {
  if (!text) return '';
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Flatten a Nia response into a single ranked list of compact sources usable
 * by the rest of the app (UI display, LLM grounding context, etc.).
 */
export function flattenNiaResults(
  response: NiaWebSearchResponse,
  maxItems = 6,
): NiaSource[] {
  const buckets: Array<{
    items: NiaResultItem[] | undefined;
    category: NiaSource['category'];
  }> = [
    { items: response.documentation, category: 'documentation' },
    { items: response.other_content, category: 'other' },
    { items: response.github_repos, category: 'github' },
  ];

  const out: NiaSource[] = [];
  const seenUrls = new Set<string>();

  // Round-robin across buckets so the final list stays diverse.
  const indices = [0, 0, 0];
  while (out.length < maxItems) {
    let progressed = false;
    for (let i = 0; i < buckets.length && out.length < maxItems; i += 1) {
      const bucket = buckets[i];
      const items = bucket.items ?? [];
      const idx = indices[i];
      if (idx >= items.length) continue;
      indices[i] = idx + 1;
      progressed = true;

      const item = items[idx];
      if (!item) continue;
      const url = item.url?.trim();
      if (!url || seenUrls.has(url)) continue;
      const title =
        item.title?.trim() ||
        item.owner_repo?.trim() ||
        url;
      const summary =
        item.summary?.trim() ||
        (item.highlights?.[0]?.trim() ?? '');
      seenUrls.add(url);
      out.push({
        title: trim(title, 140),
        url,
        summary: trim(summary, 320),
        category: bucket.category,
      });
    }
    if (!progressed) break;
  }

  return out;
}

/**
 * Format a list of sources as a compact text block for inclusion in an LLM
 * prompt. Returns an empty string if no usable sources are present.
 */
export function formatNiaSourcesForPrompt(
  sources: NiaSource[],
  options: { maxChars?: number } = {},
): string {
  if (sources.length === 0) return '';
  const maxChars = options.maxChars ?? 1800;
  const lines: string[] = [];
  for (const s of sources) {
    const piece = s.summary
      ? `- ${s.title} (${s.url}): ${s.summary}`
      : `- ${s.title} (${s.url})`;
    lines.push(piece);
    if (lines.join('\n').length > maxChars) {
      lines.pop();
      break;
    }
  }
  return lines.join('\n');
}

/**
 * Convenience helper used by the orchestrator: run a Nia search and return a
 * compact, deduplicated list of sources. Returns an empty array on failure or
 * if Nia is not configured, so callers can degrade gracefully.
 */
export async function safeGroundQuery(args: {
  query: string;
  numResults?: number;
  category?: NiaCategory;
  daysBack?: number;
}): Promise<NiaSource[]> {
  if (!isNiaConfigured()) return [];
  try {
    const response = await niaWebSearch({
      query: args.query,
      numResults: args.numResults ?? 6,
      category: args.category,
      daysBack: args.daysBack,
    });
    return flattenNiaResults(response, args.numResults ?? 6);
  } catch (error) {
    console.error('[nia] grounding query failed; continuing without web context', error);
    if (error instanceof NiaRequestError) {
      console.error(
        `[nia] details: status=${error.status} endpoint=${error.endpoint} details=${error.details}`,
      );
    }
    return [];
  }
}

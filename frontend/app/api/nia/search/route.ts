import { NextRequest, NextResponse } from 'next/server';
import {
  NiaCategory,
  NiaRequestError,
  flattenNiaResults,
  isNiaConfigured,
  niaWebSearch,
} from '@/lib/nia/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_CATEGORIES = new Set<NiaCategory>([
  'github',
  'company',
  'research',
  'news',
  'tweet',
  'pdf',
  'blog',
]);

interface SearchBody {
  query?: string;
  numResults?: number;
  category?: NiaCategory;
  daysBack?: number;
  findSimilarTo?: string;
  includeRaw?: boolean;
}

export async function POST(req: NextRequest) {
  if (!isNiaConfigured()) {
    return NextResponse.json(
      { error: 'Nia API key not configured' },
      { status: 503 },
    );
  }

  let body: SearchBody;
  try {
    body = (await req.json()) as SearchBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return NextResponse.json({ error: 'query is required' }, { status: 400 });
  }

  let category: NiaCategory | undefined;
  if (body.category) {
    if (!ALLOWED_CATEGORIES.has(body.category)) {
      return NextResponse.json(
        {
          error: `category must be one of: ${Array.from(ALLOWED_CATEGORIES).join(', ')}`,
        },
        { status: 400 },
      );
    }
    category = body.category;
  }

  const numResults =
    typeof body.numResults === 'number' && Number.isFinite(body.numResults)
      ? Math.max(1, Math.min(10, Math.floor(body.numResults)))
      : 5;

  const daysBack =
    typeof body.daysBack === 'number' && Number.isFinite(body.daysBack) && body.daysBack > 0
      ? Math.floor(body.daysBack)
      : undefined;

  try {
    const raw = await niaWebSearch({
      query,
      numResults,
      category,
      daysBack,
      findSimilarTo: body.findSimilarTo,
    });
    const sources = flattenNiaResults(raw, numResults);
    return NextResponse.json({
      query,
      sources,
      ...(body.includeRaw ? { raw } : {}),
    });
  } catch (error) {
    if (error instanceof NiaRequestError) {
      return NextResponse.json(
        { error: error.message, status: error.status },
        { status: error.status >= 400 && error.status < 600 ? error.status : 500 },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to query Nia';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

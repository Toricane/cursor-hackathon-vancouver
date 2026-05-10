import { NextRequest, NextResponse } from 'next/server';
import { askComposer } from '@/lib/simulation/orchestrator';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let message = '';
  try {
    const body = (await req.json()) as { message?: string };
    message = body?.message ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const state = await askComposer(id, message);
    if (!state) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    return NextResponse.json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to query composer';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

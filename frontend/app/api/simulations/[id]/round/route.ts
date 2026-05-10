import { NextRequest, NextResponse } from 'next/server';
import { runRound } from '@/lib/simulation/orchestrator';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  let speakerCount: number | undefined;
  try {
    const body = (await req.json()) as { speakerCount?: number };
    speakerCount = body?.speakerCount;
  } catch {
    speakerCount = undefined;
  }

  try {
    const result = await runRound(id, speakerCount);
    if (!result) {
      return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to run simulation round';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

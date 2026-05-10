import { NextResponse } from 'next/server';
import { getSimulation } from '@/lib/simulation/orchestrator';

type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const state = getSimulation(id);

  if (!state) {
    return NextResponse.json({ error: 'Simulation not found' }, { status: 404 });
  }

  return NextResponse.json({ state });
}

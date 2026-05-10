import { NextRequest, NextResponse } from 'next/server';
import { createSimulation } from '@/lib/simulation/orchestrator';
import { CreateSimulationInput } from '@/lib/simulation/types';

export async function POST(req: NextRequest) {
  let body: CreateSimulationInput;

  try {
    body = (await req.json()) as CreateSimulationInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.composerModel || !Array.isArray(body.populationModels) || body.populationModels.length === 0) {
    return NextResponse.json(
      { error: 'composerModel and populationModels are required' },
      { status: 400 },
    );
  }

  try {
    const state = await createSimulation(body);
    return NextResponse.json({ simulationId: state.id, state });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create simulation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

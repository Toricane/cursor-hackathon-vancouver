import { NextRequest, NextResponse } from 'next/server';
import { createSimulation } from '@/lib/simulation/orchestrator';
import { CreateSimulationInput, PopulationModelConfig } from '@/lib/simulation/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_POPULATION_PER_ROW = 200;
const MAX_CALLS_PER_ROW = 500;
const MAX_TOTAL_POPULATION = 1000;
const MAX_POPULATION_MODEL_ROWS = 25;

export async function POST(req: NextRequest) {
  let body: CreateSimulationInput;

  try {
    body = (await req.json()) as CreateSimulationInput;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body?.composerModel || typeof body.composerModel !== 'string') {
    return NextResponse.json(
      { error: 'composerModel is required' },
      { status: 400 },
    );
  }

  if (!Array.isArray(body.populationModels) || body.populationModels.length === 0) {
    return NextResponse.json(
      { error: 'populationModels must be a non-empty array' },
      { status: 400 },
    );
  }

  if (body.populationModels.length > MAX_POPULATION_MODEL_ROWS) {
    return NextResponse.json(
      { error: `populationModels may contain at most ${MAX_POPULATION_MODEL_ROWS} rows` },
      { status: 400 },
    );
  }

  let totalPopulation = 0;
  for (const row of body.populationModels as PopulationModelConfig[]) {
    if (
      !row ||
      typeof row.modelId !== 'string' ||
      row.modelId.trim().length === 0 ||
      !Number.isFinite(row.population) ||
      !Number.isFinite(row.calls) ||
      !Number.isInteger(row.population) ||
      !Number.isInteger(row.calls) ||
      row.population < 1 ||
      row.calls < 1
    ) {
      return NextResponse.json(
        { error: 'Each populationModels entry needs modelId, integer population >= 1, and integer calls >= 1' },
        { status: 400 },
      );
    }

    if (row.population > MAX_POPULATION_PER_ROW) {
      return NextResponse.json(
        { error: `population per row may not exceed ${MAX_POPULATION_PER_ROW}` },
        { status: 400 },
      );
    }

    if (row.calls > MAX_CALLS_PER_ROW) {
      return NextResponse.json(
        { error: `calls per row may not exceed ${MAX_CALLS_PER_ROW}` },
        { status: 400 },
      );
    }

    totalPopulation += row.population;
  }

  if (totalPopulation > MAX_TOTAL_POPULATION) {
    return NextResponse.json(
      { error: `total population may not exceed ${MAX_TOTAL_POPULATION}` },
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

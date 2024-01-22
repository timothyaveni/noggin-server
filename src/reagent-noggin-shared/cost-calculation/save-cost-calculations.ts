import * as math from 'mathjs';
import { prisma } from '../../prisma.js';
import { roundCreditCost } from './units.js';

export const savePreliminaryCostEstimate = async (
  runId: number,
  cost: math.Unit,
  metadata?: any,
) => {
  const update = {
    estimatedCostQuastra: roundCreditCost(cost).to('quastra').toNumber(),
    estimationMetadata: metadata,
  };

  await prisma.nogginRunCost.upsert({
    where: { nogginRunId: runId },
    create: {
      nogginRunId: runId,
      ...update,
    },
    update,
  });
};

export const saveFinalCostEstimate = async (
  runId: number,
  cost: math.Unit,
  metadata?: any,
) => {
  const update = {
    computedCostQuastra: roundCreditCost(cost).to('quastra').toNumber(),
    computationMetadata: metadata,
  };

  await prisma.nogginRunCost.upsert({
    where: { nogginRunId: runId },
    create: {
      nogginRunId: runId,
      ...update,
    },
    update,
  });
};

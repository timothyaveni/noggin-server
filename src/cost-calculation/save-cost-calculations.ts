import * as math from 'mathjs';
import { prisma } from '../prisma.js';

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

export const saveFinalCostCalculation = async (
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

const roundCreditCost = (cost: math.Unit) => {
  const quastraValue = cost.to('quastra').toNumber();
  const rounded = math.ceil(quastraValue);
  const roundedQuastra = math.unit(rounded, 'quastra');
  return roundedQuastra;
};

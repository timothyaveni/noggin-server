import * as math from 'mathjs';
import { prisma } from '../prisma.js';

export const savePreliminaryCostEstimate = async (
  runId: number,
  cost: math.Unit,
  metadata?: any,
) => {
  const update = {
    // ugh i really wish it would not give me these tiny epsilons when i do a unit conversion
    estimatedCostQuastra: BigInt(
      Math.round(roundCreditCost(cost).toNumber('quastra')),
    ),
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
    computedCostQuastra: BigInt(
      Math.round(roundCreditCost(cost).toNumber('quastra')),
    ),
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

// this isn't really a 'round' -- it's about ceiling to the next microdivision (quastra)
const roundCreditCost = (cost: math.Unit) => {
  const quastraValue = cost.to('quastra').toNumber();
  const rounded = math.ceil(quastraValue);
  const roundedQuastra = math.unit(rounded, 'quastra');
  return roundedQuastra;
};

import { unit } from './units.js';

// https://replicate.com/docs/billing
const GPU_COSTS = {
  cpu: unit(0.0001, 'dollars / sec'),
  t4: unit(0.000225, 'dollars / sec'),
  a40: unit(0.000575, 'dollars / sec'),
  a40Large: unit(0.000725, 'dollars / sec'),
  a10040: unit(0.00115, 'dollars / sec'),
  a10080: unit(0.0014, 'dollars / sec'),
  a40Large8: unit(0.0058, 'dollars / sec'),
};

export const getReplicateCost = (
  gpu: keyof typeof GPU_COSTS,
  seconds: number,
) => {
  // https://replicate.com/docs/billing: The minimum billable time for an individual run of a public model is 1 second.
  const billableSeconds = Math.max(1, seconds);
  return GPU_COSTS[gpu].multiply(unit(billableSeconds, 'seconds'));
};

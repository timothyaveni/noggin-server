import { Unit } from 'mathjs';
import { add, unit } from '../units.js';

const MODEL_COSTS = {
  'gpt-3.5-turbo-1106': {
    input: unit(0.001, 'dollars / kilointoken'),
    output: unit(0.002, 'dollars / kiloouttoken'),
  },
  'gpt-4-1106-preview': {
    input: unit(0.01, 'dollars / kilointoken'),
    output: unit(0.03, 'dollars / kiloouttoken'),
  },
};

export const getOpenAiChatCompletionCost = (
  model: keyof typeof MODEL_COSTS,
  inputTokens: Unit,
  outputTokens: Unit,
) => {
  const { input, output } = MODEL_COSTS[model];

  return add(input.multiply(inputTokens), output.multiply(outputTokens));
};

import { Unit } from 'mathjs';
import { add } from '../../reagent-noggin-shared/cost-calculation/units.js';

export const getOpenAiChatCompletionCost =
  (inputRate: Unit, outputRate: Unit) =>
  (inputTokens: Unit, outputTokens: Unit) => {
    return add(
      inputRate.multiply(inputTokens),
      outputRate.multiply(outputTokens),
    );
  };

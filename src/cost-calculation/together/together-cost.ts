import { Unit } from 'mathjs';
import {
  add,
  unit,
} from '../../reagent-noggin-shared/cost-calculation/units.js';

export const getTogetherChatCompletionCost =
  (inputRate: Unit, outputRate: Unit) =>
  (inputTokens: Unit, outputTokens: Unit) => {
    return add(
      inputRate.multiply(inputTokens),
      outputRate.multiply(outputTokens),
    );
  };

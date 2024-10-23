import { Unit } from 'mathjs';
import {
  add,
  unit,
} from '../../reagent-noggin-shared/cost-calculation/units.js';

export const getOpenAiChatCompletionCost =
  (inputRate: Unit, cachedInputRate: Unit | undefined, outputRate: Unit) =>
  (inputTokens: Unit, cachedInputTokens: Unit, outputTokens: Unit) => {
    if (
      cachedInputRate === undefined &&
      cachedInputTokens.toNumber('intoken') !== 0
    ) {
      throw new Error('Cached input tokens provided without a rate');
    }

    return add(
      add(
        inputRate.multiply(inputTokens),
        (cachedInputRate ?? unit(0, 'dollars / intoken')).multiply(
          cachedInputTokens,
        ),
      ),
      outputRate.multiply(outputTokens),
    );
  };

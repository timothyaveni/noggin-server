import { calculateOpenAIImageTokensO1 } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'o1-2024-12-17',
  capabilities: {
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensO1,
  pricePerIntoken: unit(15, 'dollars / megaintoken'),
  pricePerCachedIntoken: unit(7.5, 'dollars / megaintoken'),
  pricePerOuttoken: unit(60, 'dollars / megaouttoken'),
});

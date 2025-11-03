import { calculateOpenAIImageTokensStandard } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-5-mini',
  capabilities: {
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensStandard,
  pricePerIntoken: unit(0.25, 'dollars / megaintoken'),
  pricePerCachedIntoken: unit(0.025, 'dollars / megaintoken'),
  pricePerOuttoken: unit(2, 'dollars / megaouttoken'),
});

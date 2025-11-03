import { calculateOpenAIImageTokensStandard } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-5-nano',
  capabilities: {
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensStandard,
  pricePerIntoken: unit(0.05, 'dollars / megaintoken'),
  pricePerCachedIntoken: unit(0.005, 'dollars / megaintoken'),
  pricePerOuttoken: unit(0.4, 'dollars / megaouttoken'),
});

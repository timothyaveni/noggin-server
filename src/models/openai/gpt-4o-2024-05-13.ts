import { calculateOpenAIImageTokensStandard } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-4o-2024-05-13',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensStandard,
  pricePerIntoken: unit(5, 'dollars / megaintoken'),
  pricePerOuttoken: unit(15, 'dollars / megaouttoken'),
});

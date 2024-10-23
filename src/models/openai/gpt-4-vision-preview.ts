import { calculateOpenAIImageTokensStandard } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-4-vision-preview',
  capabilities: {
    supportsJsonMode: false,
    supportsFunctionCalling: false,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensStandard,
  pricePerIntoken: unit(10, 'dollars / megaintoken'),
  pricePerOuttoken: unit(30, 'dollars / megaouttoken'),
});

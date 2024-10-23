import { calculateOpenAIImageTokensMini } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-4o-mini-2024-07-18',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  imageTokenCalculator: calculateOpenAIImageTokensMini,
  pricePerIntoken: unit(0.15, 'dollars / megaintoken'),
  pricePerOuttoken: unit(0.6, 'dollars / megaouttoken'),
});

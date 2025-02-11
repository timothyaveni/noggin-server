import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'o3-mini-2025-01-31',
  capabilities: {
    supportsJsonMode: true,
    supportsStructuredOutput: true,
    supportsFunctionCalling: true,
    supportsImageInputs: false,
  },
  pricePerIntoken: unit(1.1, 'dollars / megaintoken'),
  pricePerCachedIntoken: unit(0.55, 'dollars / megaintoken'),
  pricePerOuttoken: unit(4.4, 'dollars / megaouttoken'),
});

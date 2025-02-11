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
  pricePerIntoken: unit(1.1, 'dollars / megaintoken'),
  pricePerCachedIntoken: unit(0.55, 'dollars / megaintoken'),
  pricePerOuttoken: unit(4.4, 'dollars / megaouttoken'),
});

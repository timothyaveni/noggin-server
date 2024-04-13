import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-4-1106-preview',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: false,
  },
  pricePerIntoken: unit(10, 'dollars / megaintoken'),
  pricePerOuttoken: unit(30, 'dollars / megaouttoken'),
});

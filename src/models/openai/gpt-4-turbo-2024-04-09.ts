import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-4-turbo-2024-04-09',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: true,
  },
  pricePerIntoken: unit(10, 'dollars / megaintoken'),
  pricePerOuttoken: unit(30, 'dollars / megaouttoken'),
});

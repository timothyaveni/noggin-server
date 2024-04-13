import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-3.5-turbo-0125',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: false,
  },
  pricePerIntoken: unit(0.5, 'dollars / megaintoken'),
  pricePerOuttoken: unit(1.5, 'dollars / megaouttoken'),
});

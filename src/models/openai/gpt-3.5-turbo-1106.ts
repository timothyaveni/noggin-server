import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createOpenAIChatModel } from './openai-chat-model.js';

export const { streamResponse } = createOpenAIChatModel({
  modelName: 'gpt-3.5-turbo-1106',
  capabilities: {
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsImageInputs: false,
  },
  pricePerIntoken: unit(1, 'dollars / megaintoken'),
  pricePerOuttoken: unit(2, 'dollars / megaouttoken'),
});

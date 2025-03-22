import { calculateOpenAIImageTokensMini } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createTogetherChatModel } from './together-chat-model.js';

export const { streamResponse } = createTogetherChatModel({
  modelName: 'deepseek-ai/DeepSeek-R1',
  capabilities: {},
  pricePerIntoken: unit(3, 'dollars / megaintoken'),
  pricePerOuttoken: unit(7, 'dollars / megaouttoken'),
});

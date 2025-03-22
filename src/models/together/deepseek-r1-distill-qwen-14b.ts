import { calculateOpenAIImageTokensMini } from '../../cost-calculation/openai/count-openai-tokens.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createTogetherChatModel } from './together-chat-model.js';

export const { streamResponse } = createTogetherChatModel({
  modelName: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-14B',
  capabilities: {},
  pricePerIntoken: unit(1.6, 'dollars / megaintoken'),
  pricePerOuttoken: unit(1.6, 'dollars / megaouttoken'),
});

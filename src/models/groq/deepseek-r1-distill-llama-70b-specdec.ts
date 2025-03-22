import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { createGroqChatModel } from './groq-chat-model.js';

export const { streamResponse } = createGroqChatModel({
  modelName: 'deepseek-r1-distill-llama-70b-specdec',
  capabilities: {},
  // i have no idea how much this costs -- it seems to be *free* right now which is disturbing
  // the non-specdec model is 0.75 / 0.99, i don't know how much more expensive i should expect specdec to be
  pricePerIntoken: unit(10, 'dollars / megaintoken'),
  pricePerOuttoken: unit(10, 'dollars / megaouttoken'),
});

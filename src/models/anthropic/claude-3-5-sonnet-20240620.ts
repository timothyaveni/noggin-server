import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';

import { createClaude3ChatModel } from './claude-3-chat-model.js';

export const { streamResponse } = createClaude3ChatModel({
  modelName: 'claude-3-5-sonnet-20240620',
  pricePerIntoken: unit(3, 'dollars / megaintoken'),
  pricePerOuttoken: unit(15, 'dollars / megaouttoken'),
});

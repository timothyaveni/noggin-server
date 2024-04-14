import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';

import { createClaude3ChatModel } from './claude-3-chat-model.js';

export const { streamResponse } = createClaude3ChatModel({
  modelName: 'claude-3-opus-20240229',
  pricePerIntoken: unit(15, 'dollars / megaintoken'),
  pricePerOuttoken: unit(75, 'dollars / megaouttoken'),
});

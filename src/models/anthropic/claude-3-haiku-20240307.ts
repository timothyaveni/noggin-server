import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';

import { createClaude3ChatModel } from './claude-3-chat-model.js';

export const { streamResponse } = createClaude3ChatModel({
  modelName: 'claude-3-haiku-20240307',
  pricePerIntoken: unit(0.25, 'dollars / megaintoken'),
  pricePerOuttoken: unit(1.25, 'dollars / megaouttoken'),
});

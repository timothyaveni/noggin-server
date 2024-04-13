import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_identicon } from './identicon.js';
import { streamResponse as streamResponse_unlimitedBreadsticks } from './unlimited-breadsticks.js';

export default function testIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'unlimited-breadsticks':
      return {
        streamResponse: streamResponse_unlimitedBreadsticks,
      };
    case 'identicon':
      return {
        streamResponse: streamResponse_identicon,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

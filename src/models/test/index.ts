import { ModelFunctions } from '../index.js';
import { streamResponse as streamResponse_unlimitedBreadsticks } from './unlimited-breadsticks.js';

export default function openaiIndex(modelName: string): ModelFunctions {
  switch (modelName) {
    case 'unlimited-breadsticks':
      return {
        streamResponse: streamResponse_unlimitedBreadsticks,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

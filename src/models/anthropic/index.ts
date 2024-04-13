import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_claude3Haiku20240307 } from './claude-3-haiku-20240307.js';

export default function openaiIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'claude-3-haiku-20240307':
      return {
        streamResponse: streamResponse_claude3Haiku20240307,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

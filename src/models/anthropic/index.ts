import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_claude3Haiku20240307 } from './claude-3-haiku-20240307.js';
import { streamResponse as streamResponse_claude3Opus20240229 } from './claude-3-opus-20240229.js';
import { streamResponse as streamResponse_claude3Sonnet20240229 } from './claude-3-sonnet-20240229.js';

export default function openaiIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'claude-3-haiku-20240307':
      return {
        streamResponse: streamResponse_claude3Haiku20240307,
      };
    case 'claude-3-sonnet-20240229':
      return {
        streamResponse: streamResponse_claude3Sonnet20240229,
      };
    case 'claude-3-opus-20240229':
      return {
        streamResponse: streamResponse_claude3Opus20240229,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

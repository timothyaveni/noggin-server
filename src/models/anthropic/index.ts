import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_claude35Sonnet20240620 } from './claude-3-5-sonnet-20240620.js';
import { streamResponse as streamResponse_claude37Sonnet20250219 } from './claude-3-7-sonnet-20250219.js';
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
    case 'claude-3-5-sonnet-20240620':
      return {
        streamResponse: streamResponse_claude35Sonnet20240620,
      };
    case 'claude-3-7-sonnet-20250219':
      return {
        streamResponse: streamResponse_claude37Sonnet20250219,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

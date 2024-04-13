import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_gpt35Turbo0125 } from './gpt-3.5-turbo-0125.js';
import { streamResponse as streamResponse_gpt35Turbo1106 } from './gpt-3.5-turbo-1106.js';
import { streamResponse as streamResponse_gpt41106Preview } from './gpt-4-1106-preview.js';
import { streamResponse as streamResponse_gpt4Turbo20240409 } from './gpt-4-turbo-2024-04-09.js';
import { streamResponse as streamResponse_gpt4VisionPreview } from './gpt-4-vision-preview.js';

export default function openaiIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'gpt-3.5-turbo-1106':
      return {
        streamResponse: streamResponse_gpt35Turbo1106,
      };
    case 'gpt-3.5-turbo-0125':
      return {
        streamResponse: streamResponse_gpt35Turbo0125,
      };
    case 'gpt-4-1106-preview':
      return {
        streamResponse: streamResponse_gpt41106Preview,
      };
    case 'gpt-4-vision-preview':
      return {
        streamResponse: streamResponse_gpt4VisionPreview,
      };
    case 'gpt-4-turbo-2024-04-09':
      return {
        streamResponse: streamResponse_gpt4Turbo20240409,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

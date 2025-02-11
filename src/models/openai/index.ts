import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_gpt35Turbo0125 } from './gpt-3.5-turbo-0125.js';
import { streamResponse as streamResponse_gpt35Turbo1106 } from './gpt-3.5-turbo-1106.js';
import { streamResponse as streamResponse_gpt41106Preview } from './gpt-4-1106-preview.js';
import { streamResponse as streamResponse_gpt4Turbo20240409 } from './gpt-4-turbo-2024-04-09.js';
import { streamResponse as streamResponse_gpt4VisionPreview } from './gpt-4-vision-preview.js';
import { streamResponse as streamResponse_gpt4o20240513 } from './gpt-4o-2024-05-13.js';
import { streamResponse as streamResponse_gpt4o20240806 } from './gpt-4o-2024-08-06.js';
import { streamResponse as streamResponse_gpt4oMini20240718 } from './gpt-4o-mini-2024-07-18.js';
import { streamResponse as streamResponse_o120241217 } from './o1-2024-12-17.js';
import { streamResponse as streamResponse_o3Mini20250131 } from './o3-mini-2025-01-31.js';

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
    case 'gpt-4o-2024-05-13':
      return {
        streamResponse: streamResponse_gpt4o20240513,
      };
    case 'gpt-4o-mini-2024-07-18':
      return {
        streamResponse: streamResponse_gpt4oMini20240718,
      };
    case 'gpt-4o-2024-08-06':
      return {
        streamResponse: streamResponse_gpt4o20240806,
      };
    case 'o1-2024-12-17':
      return {
        streamResponse: streamResponse_o120241217,
      };
    case 'o3-mini-2025-01-31':
      return {
        streamResponse: streamResponse_o3Mini20250131,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

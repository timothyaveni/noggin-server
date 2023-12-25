import { ModelFunctions } from '../index.js';
import { streamResponse as streamResponse_gpt41106Preview } from './gpt-4-1106-preview.js';
import { streamResponse as streamResponse_gpt4VisionPreview } from './gpt-4-vision-preview.js';

export default function openaiIndex(modelName: string): ModelFunctions {
  switch (modelName) {
    case 'gpt-4-1106-preview':
      return {
        streamResponse: streamResponse_gpt41106Preview,
      };
    case 'gpt-4-vision-preview':
      return {
        streamResponse: streamResponse_gpt4VisionPreview,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

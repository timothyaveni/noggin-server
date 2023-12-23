import { streamResponse as streamResponse_gpt41106Preview } from './gpt-4-1106-preview.js';

export default function openaiIndex(modelName: string) {
  switch (modelName) {
    case 'gpt-4-1106-preview':
      return {
        streamResponse: streamResponse_gpt41106Preview,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

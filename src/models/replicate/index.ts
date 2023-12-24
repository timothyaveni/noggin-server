import { streamResponse as streamResponse_sdxl } from './sdxl.js';
import { streamResponse as streamResponse_fofr_sdxlEmoji } from './fofr_sdxlEmoji.js';

export default function replicateIndex(modelName: string) {
  switch (modelName) {
    case 'sdxl':
      return {
        // todo -- we'll probably curry a lot of these replicate models for revisions
        streamResponse: streamResponse_sdxl,
      };
    case 'fofr_sdxl-emoji':
      return {
        streamResponse: streamResponse_fofr_sdxlEmoji,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

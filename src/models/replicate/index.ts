import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_andreasjansson_llama213bChatJsonSchema } from './andreasjansson_llama-2-13b-chat-json-schema.js';
import { streamResponse as streamResponse_fofr_sdxlEmoji } from './fofr_sdxlEmoji.js';
import { streamResponse as streamResponse_sdxl } from './sdxl.js';

export default function replicateIndex(modelName: string): ModelExports {
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
    case 'andreasjansson_llama-2-13b-chat-json-schema':
      return {
        streamResponse: streamResponse_andreasjansson_llama213bChatJsonSchema,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

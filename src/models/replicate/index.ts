import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_andreasjansson_llama213bChatJsonSchema } from './andreasjansson_llama-2-13b-chat-json-schema.js';
import { streamResponse as streamResponse_bytedance_sdxlLightning4Step } from './bytedance_sdxl-lightning-4step.js';
import { streamResponse as streamResponse_fofr_sdxlEmoji } from './fofr_sdxlEmoji.js';
import { streamResponse as streamResponse_metaLlama370bInstruct } from './meta-llama-3-70b-instruct.js';
import { streamResponse as streamResponse_sdxl } from './sdxl.js';
import { streamResponse as streamResponse_stableDiffusion } from './stable-diffusion.js';
import { streamResponse as streamResponse_yorickvp_llava13b } from './yorickvp_llava-13b.js';

export default function replicateIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'sdxl':
      return {
        // todo -- we'll probably curry a lot of these replicate models for revisions
        streamResponse: streamResponse_sdxl,
      };
    case 'stable-diffusion':
      return {
        streamResponse: streamResponse_stableDiffusion,
      };
    case 'fofr_sdxl-emoji':
      return {
        streamResponse: streamResponse_fofr_sdxlEmoji,
      };
    case 'bytedance_sdxl-lightning-4step':
      return {
        streamResponse: streamResponse_bytedance_sdxlLightning4Step,
      };
    case 'andreasjansson_llama-2-13b-chat-json-schema':
      return {
        streamResponse: streamResponse_andreasjansson_llama213bChatJsonSchema,
      };
    case 'yorickvp_llava-13b':
      return {
        streamResponse: streamResponse_yorickvp_llava13b,
      };
    case 'meta-llama-3-70b-instruct':
      return {
        streamResponse: streamResponse_metaLlama370bInstruct,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

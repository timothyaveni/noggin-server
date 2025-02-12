import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_andreasjansson_llama213bChatJsonSchema } from './andreasjansson_llama-2-13b-chat-json-schema.js';
import { streamResponse as streamResponse_blackForestLabs_Flux11Pro } from './black-forest-labs_flux-1-1-pro.js';
import { streamResponse as streamResponse_blackForestLabs_Flux1Schnell } from './black-forest-labs_flux-1-schnell.js';
import { streamResponse as streamResponse_bytedance_sdxlLightning4Step } from './bytedance_sdxl-lightning-4step.js';
import { streamResponse as streamResponse_fofr_sdxlEmoji } from './fofr_sdxlEmoji.js';
import { streamResponse as streamResponse_metaLlama31405bInstruct } from './meta-llama-3-1-405b-instruct.js';
import { streamResponse as streamResponse_metaLlama370bBase } from './meta-llama-3-70b-base.js';
import { streamResponse as streamResponse_metaLlama370bInstruct } from './meta-llama-3-70b-instruct.js';
import { streamResponse as streamResponse_pharmapsychoticClipInterrogator } from './pharmapsychotic_clip-interrogator.js';
import { streamResponse as streamResponse_rossjillianControlnet } from './rossjillian_controlnet.js';
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
    case 'meta-llama-3-70b-base':
      return {
        streamResponse: streamResponse_metaLlama370bBase,
      };
    case 'meta-llama-3-1-405b-instruct':
      return {
        streamResponse: streamResponse_metaLlama31405bInstruct,
      };
    case 'black-forest-labs_flux-1.1-pro':
      return {
        streamResponse: streamResponse_blackForestLabs_Flux11Pro,
      };
    case 'black-forest-labs_flux-1-schnell':
      return {
        streamResponse: streamResponse_blackForestLabs_Flux1Schnell,
      };
    case 'pharmapsychotic_clip-interrogator':
      return {
        streamResponse: streamResponse_pharmapsychoticClipInterrogator,
      };
    case 'rossjillian_controlnet':
      return {
        streamResponse: streamResponse_rossjillianControlnet,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

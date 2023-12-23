import { streamResponse as streamResponse_sdxl } from './sdxl.js';

export default function replicateIndex(modelName: string) {
  switch (modelName) {
    case 'sdxl':
      return {
        // todo -- we'll probably curry a lot of these replicate models for revisions
        streamResponse: streamResponse_sdxl,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

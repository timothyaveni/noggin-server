import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_deepseekR1DistillLlama70BSpecDec } from './deepseek-r1-distill-llama-70b-specdec.js';

export default function openaiIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'deepseek-r1-distill-llama-70b-specdec':
      return {
        streamResponse: streamResponse_deepseekR1DistillLlama70BSpecDec,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

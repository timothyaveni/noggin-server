import { ModelExports } from '../index.js';
import { streamResponse as streamResponse_deepseekR1 } from './deepseek-r1.js';
import { streamResponse as streamResponse_deepseekR1DistillQwen14B } from './deepseek-r1-distill-qwen-14b.js';

export default function openaiIndex(modelName: string): ModelExports {
  switch (modelName) {
    case 'deepseek-r1':
      return {
        streamResponse: streamResponse_deepseekR1,
      };
    case 'deepseek-r1-distill-qwen-14b':
      return {
        streamResponse: streamResponse_deepseekR1DistillQwen14B,
      };
    default:
      throw new Error(`Unknown model ${modelName}`);
  }
}

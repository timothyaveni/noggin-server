import openaiIndex from './openai/index.js';
import replicateIndex from './replicate/index.js';

export default function index(providerName: string) {
  switch (providerName) {
    case 'openai':
      return openaiIndex;
    case 'replicate':
      return replicateIndex;
    default:
      throw new Error(`Unknown model provider ${providerName}`);
  }
}
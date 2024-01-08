import { OutputFormat } from '../reagent-noggin-shared/types/editorSchema.js';
import { ModelParamsForStreamResponse } from '../reagent-noggin-shared/types/evaluated-variables.js';
import openaiIndex from './openai/index.js';
import replicateIndex from './replicate/index.js';
import testIndex from './test/index.js';

export type StreamModelResponse = (
  modelParams: ModelParamsForStreamResponse<any>,
  chosenOutputFormat: OutputFormat,
  runId: number,
  providerCredentials: any,
  {
    sendStatus,
  }: {
    sendStatus: (
      status: number,
      response: { message: string } | { error: string },
    ) => any;
  },
) => Promise<any>;

export type ModelExports = {
  streamResponse: StreamModelResponse;
};

export default function index(
  providerName: string,
): (modelName: string) => ModelExports {
  switch (providerName) {
    case 'openai':
      return openaiIndex;
    case 'replicate':
      return replicateIndex;
    case 'test':
      return testIndex;
    default:
      throw new Error(`Unknown model provider ${providerName}`);
  }
}

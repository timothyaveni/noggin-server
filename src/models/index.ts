import { Response } from 'express';
import { LogArgs } from '../server.js';
import openaiIndex from './openai/index.js';
import replicateIndex from './replicate/index.js';

export type StreamModelResponse = (
  evaluatedModelParams: any,
  {
    response,
    log,
  }: {
    response: Response;
    log: (args: LogArgs) => Promise<any>;
  },
) => Promise<any>;

export type ModelFunctions = {
  streamResponse: StreamModelResponse;
};

export default function index(
  providerName: string,
): (modelName: string) => ModelFunctions {
  switch (providerName) {
    case 'openai':
      return openaiIndex;
    case 'replicate':
      return replicateIndex;
    default:
      throw new Error(`Unknown model provider ${providerName}`);
  }
}

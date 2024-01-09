import { EvaluatedContentChunk } from './reagent-noggin-shared/types/evaluated-variables';

export const flattenTextOnlyContentChunks = (
  chunks: EvaluatedContentChunk[],
): string => {
  let result = '';
  for (const chunk of chunks) {
    if (chunk.type === 'text') {
      result += chunk.text;
    } else {
      throw new Error(`Unexpected content chunk type ${chunk.type}`);
    }
  }

  return result;
};

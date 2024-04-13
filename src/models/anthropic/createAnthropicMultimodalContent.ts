import {
  ImageBlockParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages.js';
import { fetchBase64Asset } from '../../object-storage/createAssetInBucket.js';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';
import { EvaluatedContentChunk } from '../../reagent-noggin-shared/types/evaluated-variables';

// export type OpenAIContentChunk =
//   | {
//       type: 'text';
//       text: string;
//     }
//   | {
//       type: 'image_url';
//       image_url: {
//         url: string;
//         detail?: 'low' | 'high' | 'auto';
//       };
//     };

// export type OpenAIContent = string | OpenAIContentChunk[];

type AnthropicContentChunk = TextBlockParam | ImageBlockParam;
type AnthropicContent = string | AnthropicContentChunk[];

export const createAnthropicMultimodalContent = async (
  chunks: EvaluatedContentChunk[],
): Promise<AnthropicContent> => {
  const anthropicContentChunks: AnthropicContentChunk[] = [];

  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'text':
        anthropicContentChunks.push({ type: 'text', text: chunk.text });
        break;
      case 'image_url':
        // TODO deserialize this loop
        const { base64, mimeType } = await fetchBase64Asset(
          ReagentBucket.NOGGIN_RUN_INPUTS,
          chunk.image_url.url,
        );
        anthropicContentChunks.push({
          type: 'image',
          source: {
            type: 'base64',
            // this will just error at the remote api level, which is fine
            // the sdk type bindings aren't up to date with the docs anyway
            media_type: mimeType as 'image/png',
            data: base64,
          },
        });
        break;
    }
  }

  return anthropicContentChunks;
};

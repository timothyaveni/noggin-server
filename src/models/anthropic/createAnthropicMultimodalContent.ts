import {
  ImageBlockParam,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources/messages.js';
import { fetchBase64Asset } from '../../object-storage/createAssetInBucket.js';
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
          'NOGGIN_RUN_INPUTS',
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

  return mergeTextChunks(anthropicContentChunks);
};

const mergeTextChunks = (content: AnthropicContent): AnthropicContent => {
  if (typeof content === 'string') {
    return content;
  }

  const mergedContent: AnthropicContent = [];
  let currentTextChunk = '';

  for (const chunk of content) {
    if (chunk.type === 'text') {
      currentTextChunk += chunk.text;
    } else {
      if (currentTextChunk) {
        mergedContent.push({ type: 'text', text: currentTextChunk });
        currentTextChunk = '';
      }
      mergedContent.push(chunk);
    }
  }

  if (currentTextChunk) {
    mergedContent.push({ type: 'text', text: currentTextChunk });
  }

  // i don't love that this would get rid of, say, newlines between images, but i think anthropic requires it.
  // newlines between different bits of text are still fine because the text will be
  return mergedContent.filter(
    (chunk) => chunk.type !== 'text' || chunk.text.trim().length > 0,
  );
};

const estimateStringIntokenCount = (str: string) => {
  // say 1 word per token (it's good to overestimate on budget) and 5 chars per word
  return str.length / 5;
};

export const estimateAnthropicIntokenCount = (
  system: string,
  chat: { content: AnthropicContent }[],
) => {
  return (
    estimateStringIntokenCount(system) +
    chat.reduce((acc, chunk) => {
      if (typeof chunk.content === 'string') {
        return acc + estimateStringIntokenCount(chunk.content);
      } else {
        return (
          acc +
          chunk.content.reduce((acc, messageChunk) => {
            if (messageChunk.type === 'text') {
              return acc + estimateStringIntokenCount(messageChunk.text);
            } else if (messageChunk.type === 'image') {
              return acc + 1600; // images can get big -- they're resized if they go over 1600 tokens
            } else {
              // ???
              return acc;
            }
          }, 0)
        );
      }
    }, 0)
  );
};

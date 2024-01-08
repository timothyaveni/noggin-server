import { EvaluatedContentChunk } from '../../reagent-noggin-shared/types/evaluated-variables';

export type OpenAIContentChunk =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        detail?: 'low' | 'high' | 'auto';
      };
    };

export type OpenAIContent = string | OpenAIContentChunk[];

export const createOpenAIMultimodalContent = (
  chunks: EvaluatedContentChunk[],
): OpenAIContent => {
  const openAIContentChunks: OpenAIContentChunk[] = [];

  for (const chunk of chunks) {
    switch (chunk.type) {
      case 'text':
        openAIContentChunks.push({ type: 'text', text: chunk.text });
        break;
      case 'image_url':
        openAIContentChunks.push({
          type: 'image_url',
          image_url: {
            url: chunk.image_url.url,
            detail: chunk.image_url.openAI_detail, // this is the main change
          },
        });
        break;
    }
  }

  return maybeFlattenMultimodalContent(openAIContentChunks); // convert [{ type: 'text', text: 'hi' }] to 'hi'
};

// idk if this really does anything but /shrug felt like a good idea
const maybeFlattenMultimodalContent = (
  chunks: OpenAIContentChunk[],
): OpenAIContent => {
  if (chunks.length === 0) {
    return '';
  }

  if (chunks.every((chunk) => chunk.type === 'text')) {
    return chunks.map((chunk) => (chunk as any).text).join('');
  }

  return chunks;
};

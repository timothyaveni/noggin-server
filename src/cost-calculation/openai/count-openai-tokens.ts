import tokenizer from 'gpt-tokenizer';
import {
  ChatCompletionContentPartImage,
  ChatCompletionMessageParam,
} from 'openai/resources';

// bleh todo
tokenizer.modelName = 'gpt-4';
const { isWithinTokenLimit } = tokenizer;

import { Unit } from 'mathjs';
import {
  add,
  unit,
} from '../../reagent-noggin-shared/cost-calculation/units.js';

export const panicIfAskedToCalculateImageTokens = () => {
  throw new Error('panic!');
};

export const calculateOpenAIImageTokensStandard = (
  chunk: ChatCompletionContentPartImage,
) => {
  if (chunk.image_url.detail === 'low') {
    return unit(85, 'intokens');
  } else {
    console.warn(
      'High-detail and auto-detail images not yet implemented -- assuming max token count.',
    );
    // looks like the most i can get it to do is 8 tiles actually, in the calculator
    return unit(8 * 170 + 85, 'intokens');
  }
};

// lotta money. will probably have to adjust this as prices change,
// since it's actually derived from gpt pricing
export const calculateOpenAIImageTokensMini = (
  chunk: ChatCompletionContentPartImage,
) => {
  if (chunk.image_url.detail === 'low') {
    return unit(2833, 'intokens');
  } else {
    console.warn(
      'High-detail and auto-detail images not yet implemented -- assuming max token count.',
    );
    return unit(8 * 5667 + 2833, 'intokens');
  }
};

export const calculateOpenAIImageTokensO1 = (
  chunk: ChatCompletionContentPartImage,
) => {
  if (chunk.image_url.detail === 'low') {
    return unit(75, 'intokens');
  } else {
    console.warn(
      'High-detail and auto-detail images not yet implemented -- assuming max token count.',
    );
    // looks like the most i can get it to do is 8 tiles actually, in the calculator
    return unit(8 * 150 + 75, 'intokens');
  }
};

export const countChatInputTokens =
  (calculateImageTokens: (chunk: ChatCompletionContentPartImage) => Unit) =>
  async ({
    chat,
    tools = null,
    tool_choice = null,
  }: {
    chat: ChatCompletionMessageParam[];
    tools?: any;
    tool_choice?: any;
  }) => {
    if (tools || tool_choice) {
      throw new Error('Tools: not yet implemented');
    }

    let additionalTokens = unit(0, 'intokens');

    const adaptedChat = [];
    for (const message of chat) {
      if (
        message.role !== 'user' &&
        message.role !== 'assistant' &&
        message.role !== 'developer' &&
        message.role !== 'system'
      ) {
        throw new Error('Tool calls in messages: not yet implemented');
      }

      let stringContent = '';
      // if it's just a string
      if (typeof message.content === 'string') {
        stringContent = message.content;
      } else if (Array.isArray(message.content)) {
        for (const chunk of message.content) {
          if (chunk.type === 'text') {
            stringContent += chunk.text;
          } else if (chunk.type === 'image_url') {
            additionalTokens = add(
              additionalTokens,
              calculateImageTokens(chunk),
            );
          } else if (chunk.type === 'input_audio') {
            throw new Error('Input audio: not yet implemented');
          } else if (chunk.type === 'file') {
            throw new Error('File uploads: not yet implemented');
          } else if (chunk.type === 'refusal') {
            // output only
            throw new Error('Refusal is not allowed in input');
          } else {
            const _exhaustiveCheck: never = chunk;
          }
        }
      }

      adaptedChat.push({
        ...message,
        // hacking isWithinTokenLimit here
        role: message.role === 'developer' ? 'user' : message.role,
        content: stringContent,
      });
    }

    // TODO: added * 1000 temporarily because i don't think we should actually measure this here
    // but idk. could be nice to avoid big requests. should prob happen pre-tokenization
    const tokenCount = isWithinTokenLimit(adaptedChat, 128000 * 1000);
    if (tokenCount === false) {
      throw new Error('Chat exceeds token limit');
    }

    return add(unit(tokenCount, 'intokens'), additionalTokens);
  };

export const countTextOutTokens = async (text: string) => {
  const tokenCount = isWithinTokenLimit(text, 128000 * 1000);
  if (tokenCount === false) {
    throw new Error('Text exceeds token limit');
  }

  return unit(tokenCount, 'outtokens');
};

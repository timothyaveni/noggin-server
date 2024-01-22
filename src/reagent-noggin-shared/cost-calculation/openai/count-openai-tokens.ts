// we have to do this right, since openai's streaming responses don't return a final count :/
// we'll probably come back to this later and sanity-check it against real values from the 'usage' page.
// gpt-tokenizer claims to do a good job with chats but doesn't yet implement images (i think?)
// i think it's slooow af though -- maybe best to estimate before the run and then only run the real count once? but f--k i mean we were only going to run it once anyway. god i wish the api would just return this
// there's an idea... we could A/B test, running 10% of streaming requests as non-streaming requests just to see if the computed number matches... maybe too silly

import tokenizer from 'gpt-tokenizer';
import { ChatCompletionMessageParam } from 'openai/resources';

// bleh todo
tokenizer.modelName = 'gpt-4';
const { isWithinTokenLimit } = tokenizer;

import { add, unit } from '../units.js';

export const countChatInputTokens = async ({
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
          if (chunk.image_url.detail === 'low') {
            additionalTokens = add(additionalTokens, unit(85, 'intokens'));
          } else {
            additionalTokens = add(
              additionalTokens,
              unit(16 * 170 + 85, 'intokens'),
            );
            console.warn(
              'High-detail and auto-detail images not yet implemented -- assuming max token count.',
            );
          }
        } else {
          const _exhaustiveCheck: never = chunk;
        }
      }
    }

    adaptedChat.push({
      ...message,
      content: stringContent,
    });
  }

  const tokenCount = isWithinTokenLimit(adaptedChat, 128000);
  if (tokenCount === false) {
    throw new Error('Chat exceeds token limit');
  }

  return add(unit(tokenCount, 'intokens'), additionalTokens);
};

export const countTextOutTokens = async (text: string) => {
  const tokenCount = isWithinTokenLimit(text, 128000);
  if (tokenCount === false) {
    throw new Error('Text exceeds token limit');
  }

  return unit(tokenCount, 'outtokens');
};

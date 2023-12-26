import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { StreamModelResponse } from '..';
import { StandardChat } from '../../evaluateParams';
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

type ModelParams = {
  'system-prompt': string;
  'chat-prompt': StandardChat;
  // 'temperature': number;
  // 'max-tokens': number;
};

type OpenAIChat = ChatCompletionMessageParam[];

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
  { setResponseHeader, writeToResponseStream, endResponse, log },
) => {
  // TODO: probably extract these into a function
  setResponseHeader('Content-Type', 'text/html; charset=utf-8');
  setResponseHeader('Transfer-Encoding', 'chunked');
  setResponseHeader('Keep-Alive', 'timeout=20, max=1000');

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string }); // TODO very temporary

  const messages: OpenAIChat = [];

  if (evaluatedModelParams['system-prompt'].length) {
    messages.push({
      role: 'system',
      content: evaluatedModelParams['system-prompt'],
    });
  }

  for (const turn of evaluatedModelParams['chat-prompt']) {
    messages.push({
      role: turn.speaker,
      content: createOpenAIMultimodalContent(turn.content),
    } as ChatCompletionMessageParam); // something is going weird with the TS overload here
  }

  const stream = await openai.chat.completions.create({
    messages,
    model: 'gpt-4-1106-preview',
    stream: true,
  });

  let output = '';

  for await (const chunk of stream) {
    await log({
      level: 'debug',
      stage: 'run_model',
      message: {
        type: 'model_chunk',
        text: 'Model chunk',
        chunk,
      },
    });

    const partial = chunk.choices[0]?.delta?.content;

    if (partial) {
      await log({
        level: 'info',
        stage: 'run_model',
        message: {
          type: 'model_partial_output',
          text: 'Model partial output',
          output: partial,
        },
      });
      output += partial;
      writeToResponseStream(partial);
    }
  }

  await log({
    level: 'info',
    stage: 'run_model',
    message: {
      type: 'model_full_output',
      text: 'Model full output',
      output,
    },
  });

  endResponse();
};

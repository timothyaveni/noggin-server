import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { StandardChat } from '../../evaluateParams.js';
import {
  openRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';
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
  runId: number,
  providerCredentials: {
    credentialsVersion: 1;
    credentials: { apiKey: string };
  },
) => {
  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=20, max=1000',
  });

  const openai = new OpenAI({ apiKey: providerCredentials.credentials.apiKey });

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
    model: 'gpt-3.5-turbo-1106',
    stream: true,
  });

  let output = '';

  // TODO: some of these models are kinda crazy fast -- we definitely want to throttle/batch log calls, even if we write to the response stream more frequently
  for await (const chunk of stream) {
    writeLogToRunStream(runId, {
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
      writeLogToRunStream(runId, {
        level: 'info',
        stage: 'run_model',
        message: {
          type: 'model_partial_output',
          text: 'Model partial output',
          output: partial,
        },
      });
      output += partial;
      writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
    }
  }

  writeLogToRunStream(runId, {
    level: 'info',
    stage: 'run_model',
    message: {
      type: 'model_full_output',
      text: 'Model full output',
      output,
    },
  });

  succeedRun(runId, 'text', output);
};

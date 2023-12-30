import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { StreamModelResponse } from '..';
import { StandardChat } from '../../evaluateParams';
import {
  openRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
} from '../../runStreams.js';
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

  console.log(messages);

  const stream = await openai.chat.completions.create({
    messages,
    model: 'gpt-4-vision-preview',
    max_tokens: 2048,
    stream: true,
  });

  let output = '';

  for await (const chunk of stream) {
    const partial = chunk.choices[0]?.delta?.content || '';
    output += partial;
    writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
  }

  succeedRun(runId, 'text', output);
};

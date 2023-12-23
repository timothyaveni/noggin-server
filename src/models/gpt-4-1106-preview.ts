import { Response } from 'express';
import { StandardChat } from '../evaluateParams';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

type ModelParams = {
  'system-prompt': string;
  'chat-prompt': StandardChat;
  // 'temperature': number;
  // 'max-tokens': number;
};

type OpenAIChat = ChatCompletionMessageParam[];

export const streamResponse = async (
  evaluatedModelParams: any,
  response: Response,
) => {
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
      content: turn.text,
    });
  }

  const stream = await openai.chat.completions.create({
    messages,
    model: 'gpt-4-1106-preview',
    stream: true,
  });

  for await (const chunk of stream) {
    response.write(chunk.choices[0]?.delta?.content || '');
  }

  response.end();
};

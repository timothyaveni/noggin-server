import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { StreamModelResponse } from '..';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';
import {
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
} from '../../runStreams.js';
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature: ModelInput_Number_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
};

type OpenAIChat = ChatCompletionMessageParam[];

export const streamResponse: StreamModelResponse = async (
  modelParams: ModelParamsForStreamResponse<UnevaluatedModelParams>,
  chosenOutputFormat,
  runId: number,
  providerCredentials: {
    credentialsVersion: 1;
    credentials: { apiKey: string };
  },
) => {
  const ioVisualizationRender = createIOVisualizationForChatTextModel(
    modelParams.partialEvaluated['chat-prompt'],
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualizationRender);

  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=20, max=1000',
  });

  const openai = new OpenAI({ apiKey: providerCredentials.credentials.apiKey });

  const messages: OpenAIChat = [];

  if (modelParams.evaluated['system-prompt'].length) {
    messages.push({
      role: 'system',
      content: modelParams.evaluated['system-prompt'],
    });
  }

  for (const turn of modelParams.evaluated['chat-prompt']) {
    messages.push({
      role: turn.speaker,
      content: createOpenAIMultimodalContent(turn.content),
    } as ChatCompletionMessageParam); // something is going weird with the TS overload here
  }

  console.log(JSON.stringify(messages));

  const stream = await openai.chat.completions.create({
    messages,
    model: 'gpt-4-vision-preview',
    temperature: modelParams.evaluated['temperature'],
    max_tokens: modelParams.evaluated['maximum-completion-length'],
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

import OpenAI from 'openai';
import {
  ChatCompletionMessageParam,
  FunctionParameters,
} from 'openai/resources';
import { StreamModelResponse } from '..';
import {
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';
import {
  openRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  'output-structure': ModelInput_SimpleSchema_Value;
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

  if (chosenOutputFormat.type === 'chat-text') {
    const stream = await openai.chat.completions.create({
      messages,
      model: 'gpt-4-1106-preview',
      stream: true,
    });

    let output = '';

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

      console.log(JSON.stringify(chunk, null, 2));

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
  } else if (chosenOutputFormat.type === 'structured-data') {
    const outputStructureSchema = modelParams.evaluated['output-structure'];

    let gptSchema;
    let needsUnwrap = false;

    if (outputStructureSchema.type === 'object') {
      gptSchema = outputStructureSchema;
    } else {
      const subSchema = { ...outputStructureSchema };
      // delete subSchema['$schema'];

      gptSchema = {
        // $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          answer: outputStructureSchema,
        },
        required: ['answer'],
      };
      needsUnwrap = true;
    }

    console.log(
      'tools',
      JSON.stringify(
        [
          {
            type: 'function',
            function: {
              name: 'respond',
              parameters: gptSchema as FunctionParameters,
            },
          },
        ],
        null,
        2,
      ),
    );

    const result = await openai.chat.completions.create({
      messages,
      tools: [
        {
          type: 'function',
          function: {
            name: 'respond',
            parameters: gptSchema as FunctionParameters,
          },
        },
      ],
      tool_choice: {
        type: 'function',
        function: {
          name: 'respond',
        },
      },
      model: 'gpt-4-1106-preview',
    });

    console.log(JSON.stringify(result, null, 2));

    let output =
      result.choices[0].message.tool_calls?.[0].function.arguments || '{}';

    if (needsUnwrap) {
      // TODO: we are parsing here, which is a little weird, since we prefer to avoid doing it -- let the user deal with the fallout of a truncated response -- unless they asked us to. but we have to, to get this working. i stringify again just for consistency
      const parsed = JSON.parse(output).answer;
      if (typeof parsed === 'string') {
        output = parsed; // otherwise it'll have quotes
      } else {
        output = JSON.stringify(JSON.parse(output).answer) || '';
      }
    }

    succeedRun(runId, 'text', output, result);
  }
};

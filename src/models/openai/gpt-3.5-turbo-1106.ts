import OpenAI from 'openai';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  FunctionParameters,
} from 'openai/resources';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1.js';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables.js';
import {
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

// todo there might be some type magic we can do here to grab these from the actual type in the editor schema file
type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature: ModelInput_Number_Value;
  'top-p': ModelInput_Number_Value;
  'frequency-penalty': ModelInput_Number_Value;
  'presence-penalty': ModelInput_Number_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
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

  const apiParams: ChatCompletionCreateParams = {
    messages,
    model: 'gpt-3.5-turbo-1106',
    frequency_penalty: modelParams.evaluated['frequency-penalty'],
    presence_penalty: modelParams.evaluated['presence-penalty'],
    max_tokens: modelParams.evaluated['maximum-completion-length'],
    temperature: modelParams.evaluated['temperature'],
    top_p: modelParams.evaluated['top-p'],
  };

  console.log(JSON.stringify(apiParams, null, 2));

  if (chosenOutputFormat.type === 'chat-text') {
    const stream = await openai.chat.completions.create({
      ...apiParams,
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
      ...apiParams,
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

    writeIncrementalContentToRunStream(runId, 'text', output, result);
    succeedRun(runId, 'text', output, result);
  }
};

import { JSONSchema7 } from 'json-schema';
import OpenAI from 'openai';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  FunctionParameters,
} from 'openai/resources';
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
  temperature: number;
  'top-p': number;
  'frequency-penalty': number;
  'presence-penalty': number;
  'maximum-completion-length': number;
  'output-structure': JSONSchema7;
};

type OpenAIChat = ChatCompletionMessageParam[];

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
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

  const modelParams: ChatCompletionCreateParams = {
    messages,
    model: 'gpt-3.5-turbo-1106',
    frequency_penalty: evaluatedModelParams['frequency-penalty'],
    presence_penalty: evaluatedModelParams['presence-penalty'],
    max_tokens: evaluatedModelParams['maximum-completion-length'],
    temperature: evaluatedModelParams['temperature'],
    top_p: evaluatedModelParams['top-p'],
  };

  console.log(JSON.stringify(modelParams, null, 2));

  if (chosenOutputFormat.type === 'chat-text') {
    const stream = await openai.chat.completions.create({
      ...modelParams,
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
    const outputStructureSchema = evaluatedModelParams['output-structure'];

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
      ...modelParams,
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

    succeedRun(runId, 'text', output);
  }
};

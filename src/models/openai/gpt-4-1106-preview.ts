import OpenAI from 'openai';
import {
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  FunctionParameters,
} from 'openai/resources';
import { StreamModelResponse } from '..';
import {
  countChatInputTokens,
  countTextOutTokens,
} from '../../cost-calculation/openai/count-openai-tokens.js';
import { getOpenAiChatCompletionCost } from '../../cost-calculation/openai/openai-cost.js';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature: ModelInput_Number_Value;
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
  remainingBudget,
) => {
  const ioVisualizationRender = createIOVisualizationForChatTextModel(
    modelParams.partialEvaluated['chat-prompt'],
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualizationRender);

  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=90, max=1000',
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
    model: 'gpt-4-1106-preview',
    temperature: modelParams.evaluated['temperature'],
    max_tokens: modelParams.evaluated['maximum-completion-length'],
  };

  if (chosenOutputFormat.type === 'chat-text') {
    let stream;
    try {
      stream = await openai.chat.completions.create({
        ...apiParams,
        stream: true,
      });
    } catch (e: any) {
      const message = e.message
        ? 'Error from OpenAI API: ' + e.message
        : 'Error from OpenAI API';
      failRun(runId, `Error from the OpenAI API: ${message}`);
      return;
    }

    const inputTokenCount = await countChatInputTokens({
      chat: messages,
    });

    const outputTokenLengthEstimate = unit(
      modelParams.evaluated['maximum-completion-length'] || 4095,
      'outtokens',
    );

    const preliminaryCost = getOpenAiChatCompletionCost(
      'gpt-4-1106-preview',
      inputTokenCount,
      outputTokenLengthEstimate,
    );

    savePreliminaryCostEstimate(runId, preliminaryCost, {
      inputTokenCount,
      outputTokenLengthEstimate,
    });

    if (
      remainingBudget !== null &&
      preliminaryCost.toNumber('quastra') > remainingBudget
    ) {
      failRun(
        runId,
        // TODO use a rounding function
        `The anticipated cost of this operation exceeds the noggin's remaining budget. The anticipated cost is ${preliminaryCost.toNumber(
          'credit',
        )} and the remaining budget is ${unit(
          remainingBudget,
          'quastra',
        ).toNumber('credit')}.`,
      );
      return;
    }

    let output = '';

    try {
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
          output += partial;
          writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
        }
      }
    } catch (e: any) {
      const message = e.message
        ? 'Error from OpenAI API: ' + e.message
        : 'Error from OpenAI API';
      failRun(runId, `Error from the OpenAI API: ${message}`);
      return;
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

    const outputTokenCount = await countTextOutTokens(output);

    const finalCost = getOpenAiChatCompletionCost(
      'gpt-4-1106-preview',
      inputTokenCount,
      outputTokenCount,
    );

    saveFinalCostCalculation(runId, finalCost, {
      inputTokenCount,
      outputTokenCount,
    });

    succeedRun(runId, 'text', output);
  } else if (chosenOutputFormat.type === 'structured-data') {
    const outputStructureSchema = modelParams.evaluated['output-structure'];

    // TODO oh god not dry at all
    const inputTokenCount = await countChatInputTokens({
      chat: messages,
      // tools: null,
      // TODO: tools later. for now assume no tools, but we'll fix the pricing when it responds
    });

    const outputTokenLengthEstimate = unit(
      modelParams.evaluated['maximum-completion-length'] || 4095,
      'outtokens',
    );

    const preliminaryCost = getOpenAiChatCompletionCost(
      'gpt-4-1106-preview',
      inputTokenCount,
      outputTokenLengthEstimate,
    );

    savePreliminaryCostEstimate(runId, preliminaryCost, {
      inputTokenCount,
      outputTokenLengthEstimate,
    });

    if (
      remainingBudget !== null &&
      preliminaryCost.toNumber('quastra') > remainingBudget
    ) {
      failRun(
        runId,
        // TODO use a rounding function
        `The anticipated cost of this operation exceeds the noggin's remaining budget. The anticipated cost is ${preliminaryCost.toNumber(
          'credit',
        )} and the remaining budget is ${unit(
          remainingBudget,
          'quastra',
        ).toNumber('credit')}.`,
      );
      return;
    }

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

    let result;
    try {
      result = await openai.chat.completions.create({
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
    } catch (e: any) {
      const message = e.message
        ? 'Error from OpenAI API: ' + e.message
        : 'Error from OpenAI API';
      failRun(runId, `Error from the OpenAI API: ${message}`);
      return;
    }

    console.log(JSON.stringify(result, null, 2));

    const trueInputTokens = result.usage?.prompt_tokens;
    const trueOutputTokens = result.usage?.completion_tokens;

    if (trueInputTokens != null && trueOutputTokens != null) {
      const finalCost = getOpenAiChatCompletionCost(
        'gpt-4-1106-preview',
        unit(trueInputTokens, 'intokens'),
        unit(trueOutputTokens, 'outtokens'),
      );

      saveFinalCostCalculation(runId, finalCost, {
        trueInputTokens,
        trueOutputTokens,
      });
    } else {
      // just use the estimate, it's fine
    }

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

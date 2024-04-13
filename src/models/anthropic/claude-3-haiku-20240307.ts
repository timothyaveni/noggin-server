import { Unit } from 'mathjs';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import {
  add,
  unit,
} from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1.js';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables.js';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';

import Anthropic from '@anthropic-ai/sdk';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import {
  createAnthropicMultimodalContent,
  estimateAnthropicIntokenCount,
} from './createAnthropicMultimodalContent.js';

type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature: ModelInput_Number_Value;
  'top-p': ModelInput_Number_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
  // 'output-structure': ModelInput_SimpleSchema_Value;
};

const modelName = 'claude-3-haiku-20240307';
const modelInputRate = unit(0.25, 'dollars / megaintoken');
const modelOutputRate = unit(1.25, 'dollars / megaouttoken');

const getChatCompletionCost = (inputTokens: Unit, outputTokens: Unit) => {
  return add(
    modelInputRate.multiply(inputTokens),
    modelOutputRate.multiply(outputTokens),
  );
};

export const streamResponse: StreamModelResponse = async (
  modelParams: ModelParamsForStreamResponse<UnevaluatedModelParams>,
  chosenOutputFormat,
  runId,
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

  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=90, max=1000',
  });

  const anthropic = new Anthropic({
    apiKey: providerCredentials.credentials.apiKey,
  });

  const messages = await Promise.all(
    modelParams.evaluated['chat-prompt'].map(async (m) => ({
      role: m.speaker,
      content: await createAnthropicMultimodalContent(m.content),
    })),
  );

  const apiParams = {
    model: modelName,
    system: modelParams.evaluated['system-prompt'],
    messages: messages,
    max_tokens: modelParams.evaluated['maximum-completion-length'],
    temperature: modelParams.evaluated['temperature'],
    top_p: modelParams.evaluated['top-p'],
  };

  writeLogToRunStream(runId, {
    level: 'debug',
    stage: 'run_model',
    message: {
      type: 'api_params',
      text: 'API parameters',
      apiParams,
    },
  });

  if (chosenOutputFormat.type !== 'chat-text') {
    throw new Error('Unsupported output format');
  }

  let stream;
  try {
    stream = await anthropic.messages.create({
      ...apiParams,

      stream: true,
    });
  } catch (e: any) {
    const message = e.message
      ? 'Error from Anthropic API: ' + e.message
      : 'Error from Anthropic API';
    failRun(runId, message);
    return;
  }

  const inputTokenCountEstimate = unit(
    estimateAnthropicIntokenCount(
      modelParams.evaluated['system-prompt'],
      messages,
    ),
    'intokens',
  );
  const outputTokenLengthEstimate = unit(
    modelParams.evaluated['maximum-completion-length'] || 4096,
    'outtokens',
  );

  const preliminaryCost = getChatCompletionCost(
    inputTokenCountEstimate,
    outputTokenLengthEstimate,
  );

  savePreliminaryCostEstimate(runId, preliminaryCost);

  // i think this should probably go in the saving bit.
  // could also mean we don't need remainingBudget piped in here which would be nice
  if (
    remainingBudget !== null &&
    preliminaryCost.toNumber('quastra') > remainingBudget
  ) {
    // TODO: if preliminary cost is 0, let it run for all models
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
  let inputTokenCountRaw = 0;
  let outputTokenCountRaw = 0;

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

      if (chunk.type === 'message_start') {
        inputTokenCountRaw += chunk.message.usage.input_tokens;
        outputTokenCountRaw += chunk.message.usage.output_tokens;
      } else if (chunk.type === 'message_delta') {
        outputTokenCountRaw += chunk.usage.output_tokens;
      }

      if (chunk.type === 'content_block_delta') {
        if (chunk.delta.type !== 'text_delta') {
          throw new Error('Unsupported delta type');
        }
        const partial = chunk.delta.text;

        if (partial) {
          output += partial;
          writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
        }
      }
    }
  } catch (e: any) {
    const message = e.message
      ? 'Error from Anthropic API: ' + e.message
      : 'Error from Anthropic API';
    failRun(runId, message);
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

  const finalCost = getChatCompletionCost(
    unit(inputTokenCountRaw, 'intokens'),
    unit(outputTokenCountRaw, 'outtokens'),
  );

  saveFinalCostCalculation(runId, finalCost, {
    inputTokenCountRaw,
    outputTokenCountRaw,
  });

  succeedRun(runId, 'text', output);
};

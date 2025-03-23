import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import {
  add,
  unit,
} from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Boolean_Value,
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
import { Unit } from 'mathjs';
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
  'enable-thinking'?: ModelInput_Boolean_Value;
  'thinking-budget-tokens'?: ModelInput_Integer_Value;
  // 'output-structure': ModelInput_SimpleSchema_Value;
};

type Claude3ModelName =
  | 'claude-3-haiku-20240307'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-opus-20240229'
  | 'claude-3-5-sonnet-20240620'
  | 'claude-3-7-sonnet-20250219';

type Claude3ModelDescription = {
  modelName: Claude3ModelName;

  pricePerIntoken: Unit;
  pricePerOuttoken: Unit;
};

export const createClaude3ChatModel = (
  modelDescription: Claude3ModelDescription,
) => {
  const getChatCompletionCost = (inputTokens: Unit, outputTokens: Unit) => {
    return add(
      modelDescription.pricePerIntoken.multiply(inputTokens),
      modelDescription.pricePerOuttoken.multiply(outputTokens),
    );
  };

  const streamResponse: StreamModelResponse = async (
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
      modelParams.evaluated['chat-prompt'].map(async (m) => {
        if (m.speaker !== 'user' && m.speaker !== 'assistant') {
          throw new Error('Unsupported speaker');
        }

        return {
          role: m.speaker,
          content: await createAnthropicMultimodalContent(m.content),
        };
      }),
    );

    const enableThinking = modelParams.evaluated['enable-thinking'] ?? false;

    const apiParams = {
      model: modelDescription.modelName,
      system: modelParams.evaluated['system-prompt'],
      messages: messages,
      max_tokens: modelParams.evaluated['maximum-completion-length'],
      ...(enableThinking
        ? {
            thinking: {
              type: 'enabled' as const,
              budget_tokens:
                modelParams.evaluated['thinking-budget-tokens'] ?? 1024,
            },
          }
        : {
            temperature: modelParams.evaluated['temperature'],
            top_p: modelParams.evaluated['top-p'],
          }),
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

    let thinking = false;

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
          if (chunk.delta.type === 'text_delta') {
            const nextThinking = false;
            let partial = chunk.delta.text;
            if (thinking !== nextThinking) {
              thinking = nextThinking;

              // idk feels reasonable for text output
              partial = '</think>\n\n' + partial;
            }
            output += partial;
            writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
          } else if (chunk.delta.type === 'thinking_delta') {
            const nextThinking = true;
            let partial = chunk.delta.thinking;

            if (thinking !== nextThinking) {
              thinking = nextThinking;

              partial = '<think>\n' + partial;
            }

            output += partial;
            writeIncrementalContentToRunStream(runId, 'text', partial, chunk);
          } else {
            // i mean yeah there are a few i don't care about at the mo' --
            // signature, citations, input json
            // console.log(chunk);
            // throw new Error('Unsupported delta type');
          }
        }

        if (
          chunk.type === 'content_block_start' &&
          chunk.content_block.type === 'redacted_thinking'
        ) {
          // do nothing
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

  return { streamResponse };
};

import { Unit } from 'mathjs';
import OpenAI from 'openai';
import {
  ChatCompletionContentPartImage,
  ChatCompletionCreateParams,
  ChatCompletionMessageParam,
  FunctionParameters,
} from 'openai/resources/index.js';
import {
  countChatInputTokens as countChatInputTokensForModel,
  countTextOutTokens,
  panicIfAskedToCalculateImageTokens,
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
  ModelInput_Select_Value,
  ModelInput_SimpleSchema_Value,
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
import { createOpenAIMultimodalContent } from './createOpenAIMultimodalContent.js';

// there might be some type magic we can do here to grab these from the actual type in the editor schema file? now that we're consolidating models it's a lil awkward
type UnevaluatedModelParams = {
  'system-prompt'?: ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature?: ModelInput_Number_Value;
  'top-p'?: ModelInput_Number_Value;
  'frequency-penalty'?: ModelInput_Number_Value;
  'presence-penalty'?: ModelInput_Number_Value;
  'maximum-completion-length'?: ModelInput_Integer_Value;
  'reasoning-effort'?: 'low' | 'medium' | 'high' | 'minimal';
  'output-structure'?: ModelInput_SimpleSchema_Value;
};

// this isn't strictly necessary but better safe. type error will warn you quick anyway
type OpenAIModelName =
  | 'gpt-3.5-turbo-0125'
  | 'gpt-3.5-turbo-1106'
  | 'gpt-4-1106-preview'
  | 'gpt-4-vision-preview'
  | 'gpt-4-turbo-2024-04-09'
  | 'gpt-4o-2024-05-13'
  | 'gpt-4o-mini-2024-07-18'
  | 'gpt-4o-2024-08-06'
  | 'o1-2024-12-17'
  | 'o3-mini-2025-01-31'
  | 'gpt-5'
  | 'gpt-5-mini'
  | 'gpt-5-nano';

type OpenAIChatModelDescription = {
  modelName: OpenAIModelName;

  capabilities: {
    supportsJsonMode: boolean;
    supportsFunctionCalling: boolean;
    supportsStructuredOutput?: boolean;
    supportsImageInputs: boolean;
  };

  imageTokenCalculator?: (chunk: ChatCompletionContentPartImage) => Unit;

  pricePerIntoken: Unit;
  pricePerCachedIntoken?: Unit;
  pricePerOuttoken: Unit;
};

type OpenAIChat = ChatCompletionMessageParam[];

export const createOpenAIChatModel = (
  modelDescription: OpenAIChatModelDescription,
) => {
  const getChatCompletionCost = getOpenAiChatCompletionCost(
    modelDescription.pricePerIntoken,
    modelDescription.pricePerCachedIntoken,
    modelDescription.pricePerOuttoken,
  );

  const calculateImageTokens =
    modelDescription.imageTokenCalculator ?? panicIfAskedToCalculateImageTokens;
  const countChatInputTokens =
    countChatInputTokensForModel(calculateImageTokens);

  const streamResponse: StreamModelResponse = async (
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

    const openai = new OpenAI({
      apiKey: providerCredentials.credentials.apiKey,
    });

    const messages: OpenAIChat = [];

    if (modelParams.evaluated['system-prompt']?.length) {
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
      model: modelDescription.modelName,
      frequency_penalty: modelParams.evaluated['frequency-penalty'],
      presence_penalty: modelParams.evaluated['presence-penalty'],
      max_completion_tokens: modelParams.evaluated['maximum-completion-length'],
      // @ts-expect-error 'minimal' isn't in there?
      reasoning_effort: modelParams.evaluated['reasoning-effort'] as
        | 'low'
        | 'medium'
        | 'high'
        | 'minimal'
        | undefined,
      temperature: modelParams.evaluated['temperature'],
      top_p: modelParams.evaluated['top-p'],
    };

    // this is kind of nice in dev but silly in prod. need better log view maybe
    // console.log(JSON.stringify(apiParams, null, 2));

    writeLogToRunStream(runId, {
      level: 'debug',
      stage: 'run_model',
      message: {
        type: 'api_params',
        text: 'API parameters',
        apiParams,
      },
    });

    if (chosenOutputFormat.type === 'chat-text') {
      const inputTokenCount = await countChatInputTokens({
        chat: messages,
      });

      const outputTokenLengthEstimate = unit(
        modelParams.evaluated['maximum-completion-length'] || 100000,
        'outtokens',
      );

      // TODO probably inline this
      const preliminaryCost = getChatCompletionCost(
        inputTokenCount,
        unit(0, 'intokens'), // assume all tokens are uncached
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

      let stream;
      try {
        stream = await openai.chat.completions.create({
          ...apiParams,
          stream: true,
          stream_options: {
            include_usage: true,
          },
        });
      } catch (e: any) {
        const message = e.message
          ? 'Error from OpenAI API: ' + e.message
          : 'Error from OpenAI API';
        failRun(runId, message);
        return;
      }

      let output = '';
      let inTokensUsed = 0;
      let cachedInTokensUsed = 0;
      let outTokensUsed = 0;

      // TODO: some of these models are kinda crazy fast -- we definitely want to throttle/batch log calls, even if we write to the response stream more frequently
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

          if (chunk.usage) {
            inTokensUsed = chunk.usage.prompt_tokens || 0;
            outTokensUsed = chunk.usage.completion_tokens || 0;

            cachedInTokensUsed =
              // @ts-ignore gotta upgrade the library i guess
              chunk.usage.prompt_tokens_details?.cached_tokens || 0;
            inTokensUsed -= cachedInTokensUsed;
          }

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
        failRun(runId, message);
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

      let finalCost;
      if (inTokensUsed === 0 && outTokensUsed === 0) {
        // THIS SHOULD NOT HAPPEN --
        // just in case usage doesn't show up for some reason. want to make sure it's not 'free'
        const outputTokenCount = await countTextOutTokens(output);
        finalCost = getChatCompletionCost(
          inputTokenCount,
          unit(0, 'intokens'),
          outputTokenCount,
        );

        await saveFinalCostCalculation(runId, finalCost, {
          inputTokenCount,
          outputTokenCount,
        });
      } else {
        finalCost = getChatCompletionCost(
          unit(inTokensUsed, 'intokens'),
          unit(cachedInTokensUsed, 'intokens'),
          unit(outTokensUsed, 'outtokens'),
        );

        await saveFinalCostCalculation(runId, finalCost, {
          inputTokenCount: inTokensUsed,
          outputTokenCount: outTokensUsed,
        });
      }

      succeedRun(runId, 'text', output);
    } else if (
      chosenOutputFormat.type === 'structured-data' &&
      modelParams.evaluated['output-structure']
    ) {
      if (
        !modelDescription.capabilities.supportsFunctionCalling &&
        !modelDescription.capabilities.supportsStructuredOutput
      ) {
        // mostly this is handled in the editorSchema, which will prevent this from happening in the first place
        failRun(runId, 'This model does not support structured data output.');
        return;
      }

      const outputStructureSchema = modelParams.evaluated['output-structure'];

      // TODO oh god not dry at all
      const inputTokenCount = await countChatInputTokens({
        chat: messages,
        // tools: null,
        // TODO: tools later. for now assume no tools, but we'll fix the pricing when it responds
      });

      const outputTokenLengthEstimate = unit(
        modelParams.evaluated['maximum-completion-length'] || 100000,
        'outtokens',
      );

      const preliminaryCost = getChatCompletionCost(
        inputTokenCount,
        unit(0, 'intokens'), // assume all tokens are uncached
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

      // okay we are gonna do this but not today i have a job goddammit
      const structuredOutputRequestData: any =
        //  modelDescription.capabilities
        //   .supportsStructuredOutput
        //   ? {
        //       response_format: {
        //         type: 'json_schema',
        //         json_schema: gptSchema,
        //       },
        //     }
        //   :
        {
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
        };

      let result;
      try {
        result = await openai.chat.completions.create({
          ...apiParams,
          ...structuredOutputRequestData,
        });
      } catch (e: any) {
        const message = e.message
          ? 'Error from OpenAI API: ' + e.message
          : 'Error from OpenAI API';
        failRun(runId, `Error from the OpenAI API: ${message}`);
        return;
      }

      console.log(JSON.stringify(result, null, 2));

      let trueInputTokens = result.usage?.prompt_tokens;
      const trueOutputTokens = result.usage?.completion_tokens;

      if (trueInputTokens != null && trueOutputTokens != null) {
        const trueCachedInputTokens =
          // @ts-ignore
          result.usage?.prompt_tokens_details?.cached_tokens || 0;
        trueInputTokens -= trueCachedInputTokens;

        const finalCost = getChatCompletionCost(
          unit(trueInputTokens, 'intokens'),
          unit(trueCachedInputTokens, 'intokens'),
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
        // this can actually fail! not just because of output-length truncation, i think. i've seen it just poop
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

  return {
    streamResponse,
  };
};

import { Unit } from 'mathjs';

import Groq from 'groq-sdk';

import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from 'together-ai/resources/chat/completions.js';
import { countTextOutTokens } from '../../cost-calculation/openai/count-openai-tokens.js';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { getGenericCompletionCost } from '../../cost-calculation/generic-cost.js';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
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
import { createOpenAIMultimodalContent } from '../openai/createOpenAIMultimodalContent.js';

// there might be some type magic we can do here to grab these from the actual type in the editor schema file? now that we're consolidating models it's a lil awkward
type UnevaluatedModelParams = {
  'system-prompt'?: ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature?: ModelInput_Number_Value;
  'top-p'?: ModelInput_Number_Value;
  'maximum-completion-length'?: ModelInput_Integer_Value;
};

// this isn't strictly necessary but better safe. type error will warn you quick anyway
type GroqChatModelName = 'deepseek-r1-distill-llama-70b-specdec';

type GroqChatModelDescription = {
  modelName: GroqChatModelName;

  capabilities: {};

  pricePerIntoken: Unit;
  pricePerOuttoken: Unit;
};

type GroqChat = (
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
)[]; // sure

export const createGroqChatModel = (
  modelDescription: GroqChatModelDescription,
) => {
  const getChatCompletionCost = getGenericCompletionCost(
    modelDescription.pricePerIntoken,
    modelDescription.pricePerOuttoken,
  );

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

    const groq = new Groq({
      apiKey: providerCredentials.credentials.apiKey,
    });

    const messages: GroqChat = [];

    if (modelParams.evaluated['system-prompt']?.length) {
      messages.push({
        role: 'system',
        content: modelParams.evaluated['system-prompt'],
      });
    }

    for (const turn of modelParams.evaluated['chat-prompt']) {
      messages.push({
        role: turn.speaker as 'user' | 'assistant',
        // @ts-ignore same incompat as below
        content: createOpenAIMultimodalContent(turn.content),
      }); // something is going weird with the TS overload here
    }

    const apiParams = {
      messages,
      model: modelDescription.modelName,
      max_tokens: modelParams.evaluated['maximum-completion-length'],
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
      let stream;
      try {
        // @ts-ignore sigh it's not quite compatible
        stream = await groq.chat.completions.create({
          ...apiParams,
          stream: true,
        });
      } catch (e: any) {
        const message = e.message
          ? 'Error from OpenAI API: ' + e.message
          : 'Error from OpenAI API';
        failRun(runId, message);
        return;
      }

      // lul
      const inputTokenCountApprox = unit(
        JSON.stringify(messages).length / 4,
        'intokens',
      );

      const outputTokenLengthEstimate = unit(
        modelParams.evaluated['maximum-completion-length'] || 100000,
        'outtokens',
      );

      // TODO probably inline this
      const preliminaryCost = getChatCompletionCost(
        inputTokenCountApprox,
        outputTokenLengthEstimate,
      );

      savePreliminaryCostEstimate(runId, preliminaryCost, {
        inputTokenCountApprox,
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

          // sigh todo i don't think we really have usage info
          // if (chunk.usage) {
          //   inTokensUsed = chunk.usage.prompt_tokens || 0;
          //   outTokensUsed = chunk.usage.completion_tokens || 0;

          //   cachedInTokensUsed =
          //     // @ts-ignore gotta upgrade the library i guess
          //     chunk.usage.prompt_tokens_details?.cached_tokens || 0;
          //   inTokensUsed -= cachedInTokensUsed;
          // }

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
          inputTokenCountApprox,
          outputTokenCount,
        );

        await saveFinalCostCalculation(runId, finalCost, {
          inputTokenCountApprox,
          outputTokenCount,
        });
      } else {
        finalCost = getChatCompletionCost(
          unit(inTokensUsed, 'intokens'),
          unit(outTokensUsed, 'outtokens'),
        );

        await saveFinalCostCalculation(runId, finalCost, {
          inputTokenCount: inTokensUsed,
          outputTokenCount: outTokensUsed,
        });
      }

      succeedRun(runId, 'text', output);
    }
  };

  return {
    streamResponse,
  };
};

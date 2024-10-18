import EventSource from 'eventsource';
import Replicate from 'replicate';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
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
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';
import { createLlama3Prompt } from './createLlama3Prompt.js';

type UnevaluatedModelParams = {
  'system-prompt': ModelInput_PlainTextWithVariables_Value;
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  temperature: ModelInput_Number_Value;
  'top-p': ModelInput_Number_Value;
  'top-k': ModelInput_Integer_Value;
  'frequency-penalty': ModelInput_Number_Value;
  'presence-penalty': ModelInput_Number_Value;
  'minimum-completion-length': ModelInput_Integer_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
};

const inputTokenRate = unit(9.5, 'dollars / megaintoken');
const outputTokenRate = unit(9.5, 'dollars / megaouttoken');

export const streamResponse: StreamModelResponse = async (
  modelParams: ModelParamsForStreamResponse<UnevaluatedModelParams>,
  chosenOutputFormat,
  runId: number,
  providerCredentials: {
    credentialsVersion: 1;
    credentials: { apiToken: string };
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

  const prompt = createLlama3Prompt({
    systemPrompt: modelParams.evaluated['system-prompt'],
    chatPrompt: modelParams.evaluated['chat-prompt'],
  });

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  const approxPromptTokens = prompt.length / 4;
  const preliminaryInputCost = unit(approxPromptTokens, 'intokens').multiply(
    inputTokenRate,
  );
  const preliminaryOutputCost = unit(
    modelParams.evaluated['maximum-completion-length'] || 8000,
    'outtokens',
  ).multiply(outputTokenRate);

  const preliminaryCost = add(preliminaryInputCost, preliminaryOutputCost);
  savePreliminaryCostEstimate(runId, preliminaryCost);

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

  let output: string[];
  try {
    output = [''];
    const prediction = await replicate.predictions.create({
      model: 'meta/meta-llama-3.1-405b-instruct',
      input: {
        min_tokens: modelParams.evaluated['minimum-completion-length'],
        max_tokens: modelParams.evaluated['maximum-completion-length'],
        temperature: modelParams.evaluated.temperature,
        top_p: modelParams.evaluated['top-p'],
        top_k: modelParams.evaluated['top-k'],
        presence_penalty: modelParams.evaluated['presence-penalty'],
        frequency_penalty: modelParams.evaluated['frequency-penalty'],
        prompt: prompt,
        prompt_template: '{prompt}', // we do the templating ourselves
      },
      stream: true,
    });

    const streamUrl = prediction.urls.stream;

    if (streamUrl) {
      const source = new EventSource(streamUrl, {
        withCredentials: true,
      });

      source.addEventListener('output', (event) => {
        writeIncrementalContentToRunStream(runId, 'text', event.data, event);
      });

      source.addEventListener('error', (event) => {
        console.error('Error from Replicate API', event);
        failRun(runId, 'Error from Replicate API');
        return; // this is awkward -- we should probably throw to escape out of this -- but for now we don't have a great way to throw.
        // what i'd like to do is have a certain error we can throw that tells the upper catcher to inform the user of the message (otherwise it should fail not silently but without detail)
      });

      source.addEventListener('done', async (event) => {
        source.close();

        let ready = false;
        let nextTimeout = 100;
        let tries = 0;

        while (!ready && tries < 10) {
          // it's not ready immediately, but even just 100 ms seems to be enough -- best to re-check if necessary though
          await new Promise((resolve) => setTimeout(resolve, nextTimeout));
          const updatedPrediction = await replicate.predictions.get(
            prediction.id,
          );

          if (updatedPrediction.status === 'succeeded') {
            ready = true;
            const response = updatedPrediction.output.join('');

            if (updatedPrediction.metrics) {
              const metrics = updatedPrediction.metrics as {
                input_token_count?: number;
                output_token_count?: number;
              };
              if (
                metrics.input_token_count !== undefined &&
                metrics.output_token_count !== undefined
              ) {
                const inputCost = unit(
                  metrics.input_token_count,
                  'intokens',
                ).multiply(inputTokenRate);
                const outputCost = unit(
                  metrics.output_token_count,
                  'outtokens',
                ).multiply(outputTokenRate);
                const finalCost = add(inputCost, outputCost);
                saveFinalCostCalculation(runId, finalCost);
              }
              // otherwise, always ok to keep the preliminary cost
            }

            succeedRun(runId, 'text', response);
          }

          nextTimeout = 100 * Math.min(2 ** tries, 100);
          tries++;
        }

        if (!ready) {
          // do charge this run -- the user got tokens incrementally...
          // we're still going to get billed i think lol
          failRun(runId, 'Run never finished', null, true);
        }
      });
    } else {
      // TODO. it really ought to have a stream url... but if not we should still check on the prediction
    }
  } catch (e: any) {
    console.error(e);
    const message = e.message
      ? 'Error from Replicate API: ' + e.message
      : 'Error from Replicate API';
    failRun(runId, message);
    return;
  }
};

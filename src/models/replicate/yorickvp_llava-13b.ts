import Replicate from 'replicate';
import { getReplicateCost } from '../../cost-calculation/replicate.js';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Image_Value,
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
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

// todo there might be some type magic we can do here to grab these from the actual type in the editor schema file
type UnevaluatedModelParams = {
  image: ModelInput_Image_Value;
  prompt: ModelInput_PlainTextWithVariables_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
  temperature: ModelInput_Number_Value;
  'top-p': ModelInput_Number_Value;
};

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
  const ioVisualizationRender = createIOVisualizationForChatTextModel([
    {
      speaker: 'user',
      text: [
        {
          // todo: it is a lil awkward to use a variable here, but we don't have non-variable images in chat text yet
          type: 'parameter',
          parameterId: 'image',
          evaluated: {
            variableName: 'image',
            variableType: 'image',
            variableValue: {
              url: modelParams.evaluated.image,
            },
          },
        },
      ],
    },
    {
      speaker: 'user',
      text: modelParams.partialEvaluated['prompt'],
    },
  ]);

  await setIOVisualizationRenderForRunStream(runId, ioVisualizationRender);

  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=90, max=1000',
  });

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  // TODO: pretty rough estimate. preliminary estimates should go over so we aren't likely to cap out a model's limit
  const preliminaryCost = getReplicateCost('a40Large', 5);
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

  const output = (await replicate.run(
    'yorickvp/llava-13b:a0fdc44e4f2e1f20f2bb4e27846899953ac8e66c5886c5878fa1d6b73ce009e5',
    {
      input: {
        image: modelParams.evaluated.image,
        prompt: modelParams.evaluated.prompt,
        max_tokens: modelParams.evaluated['maximum-completion-length'],
        temperature: modelParams.evaluated['temperature'],
        top_p: modelParams.evaluated['top-p'],
      },
    },
    (prediction) => {
      if (
        prediction.status === 'succeeded' &&
        prediction.metrics?.predict_time != null
      ) {
        saveFinalCostCalculation(
          runId,
          getReplicateCost('a40Large', prediction.metrics.predict_time),
        );
      }
    },
  )) as string[];

  // TODO: stream response from this model
  const response = output.join('');

  writeIncrementalContentToRunStream(runId, 'text', response);
  succeedRun(runId, 'text', response);
};

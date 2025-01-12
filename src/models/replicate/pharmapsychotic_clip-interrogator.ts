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
  ModelInput_Select_Value,
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

type UnevaluatedModelParams = {
  image: ModelInput_Image_Value;
  clip_model_name: ModelInput_Select_Value;
  mode: ModelInput_Select_Value;
};

export const streamResponse: StreamModelResponse = async (
  modelParams: ModelParamsForStreamResponse<UnevaluatedModelParams>,
  _chosenOutputFormat,
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
          // (in practice it'll very often be a variable _anyway_, but this is a hand-crafted IO viz i guess)
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
  const durationEstimate = modelParams.evaluated.mode === 'fast' ? 4 : 30;
  const preliminaryCost = getReplicateCost('t4', durationEstimate);
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

  let output: string;
  try {
    output = (await replicate.run(
      'pharmapsychotic/clip-interrogator:8151e1c9f47e696fa316146a2e35812ccf79cfc9eba05b11c7f450155102af70',
      {
        input: {
          image: modelParams.evaluated.image,
          clip_model_name: modelParams.evaluated.clip_model_name,
          mode: modelParams.evaluated.mode,
        },
      },
      (prediction) => {
        if (
          prediction.status === 'succeeded' &&
          prediction.metrics?.predict_time != null
        ) {
          saveFinalCostCalculation(
            runId,
            getReplicateCost('t4', prediction.metrics.predict_time),
          );
        }
      },
    )) as unknown as string;
  } catch (e: any) {
    const message = e.message
      ? 'Error from Replicate API: ' + e.message
      : 'Error from Replicate API';
    failRun(runId, message);
    return;
  }

  // this model doesn't stream. output is a string.
  const response = output;

  writeIncrementalContentToRunStream(runId, 'text', response);
  succeedRun(runId, 'text', response);
};

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
import axios from 'axios';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';

type UnevaluatedModelParams = {
  image: ModelInput_Image_Value;
  prompt: ModelInput_PlainTextWithVariables_Value;
  negative_prompt: ModelInput_PlainTextWithVariables_Value;
  structure: ModelInput_Select_Value;
  image_resolution: ModelInput_Select_Value;
  scheduler: ModelInput_Select_Value;
  steps: ModelInput_Number_Value;
  scale: ModelInput_Integer_Value;
  eta: ModelInput_Number_Value;
  canny_low_threshold: ModelInput_Integer_Value;
  canny_high_threshold: ModelInput_Integer_Value;
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

        {
          type: 'text',
          text: '\n',
        },
        // we did this differently for llava, but why not do this here
        ...modelParams.partialEvaluated['prompt'],
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
  const durationEstimate = 5;
  const preliminaryCost = getReplicateCost('a10080', durationEstimate);
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
      'rossjillian/controlnet:795433b19458d0f4fa172a7ccf93178d2adb1cb8ab2ad6c8fdc33fdbcd49f477',
      {
        input: {
          image: modelParams.evaluated.image,
          prompt: modelParams.evaluated.prompt,
          negative_prompt: modelParams.evaluated.negative_prompt,
          structure: modelParams.evaluated.structure,
          image_resolution: parseInt(
            modelParams.evaluated.image_resolution as string,
            10,
          ),
          scheduler: modelParams.evaluated.scheduler,
          steps: modelParams.evaluated.steps,
          scale: modelParams.evaluated.scale,
          eta: modelParams.evaluated.eta,
          low_threshold: modelParams.evaluated.canny_low_threshold,
          high_threshold: modelParams.evaluated.canny_high_threshold,
        },
      },
      (prediction) => {
        if (
          prediction.status === 'succeeded' &&
          prediction.metrics?.predict_time != null
        ) {
          saveFinalCostCalculation(
            runId,
            getReplicateCost('a10080', prediction.metrics.predict_time),
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

  // todo -- we can stream this straight to object storage, we don't need to buffer it all in server memory first

  // get the PNG from the replicate CDN
  const webp = await axios.get(output, {
    responseType: 'arraybuffer',
  });

  // todo log

  const buffer = Buffer.from(webp.data, 'binary');

  // todo exiftool!

  const { url } = await createAssetInBucket(
    runId,
    'NOGGIN_RUN_OUTPUTS',
    buffer,
    'image/webp',
  );

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // TODO same as other
  succeedRun(runId, 'assetUrl', url);
};

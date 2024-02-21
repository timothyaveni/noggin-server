import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';

import { getReplicateCost } from '../../cost-calculation/replicate.js';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Integer_Value,
  ModelInput_PlainTextWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';

type UnevaluatedModelParams = {
  prompt: ModelInput_PlainTextWithVariables_Value;
  'negative-prompt': ModelInput_PlainTextWithVariables_Value;
  width: ModelInput_Integer_Value;
  height: ModelInput_Integer_Value;
  'inference-steps': ModelInput_Integer_Value;
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
  { sendStatus },
) => {
  const ioVisualization = createIOVisualizationForImageOutputModel(
    modelParams.partialEvaluated.prompt,
    modelParams.partialEvaluated['negative-prompt'],
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualization);

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  const model =
    'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
  const input = {
    prompt: modelParams.evaluated.prompt,
    negative_prompt: modelParams.evaluated['negative-prompt'],
    width: modelParams.evaluated['width'],
    height: modelParams.evaluated['height'],
    num_inference_steps: modelParams.evaluated['inference-steps'],
  };

  const preliminaryCost = getReplicateCost('a40Large', 12);
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
    output = (await replicate.run(model, { input }, (prediction) => {
      if (
        prediction.status === 'succeeded' &&
        prediction.metrics?.predict_time != null
      ) {
        saveFinalCostCalculation(
          runId,
          getReplicateCost('a40Large', prediction.metrics.predict_time),
        );
      }
    })) as string[];
  } catch (e: any) {
    // smdh nsfw content
    // console.error(e);
    // TODO: i18n
    const message = e.message
      ? 'Error from Replicate API: ' + e.message
      : 'Error from Replicate API';

    failRun(runId, message);
    return;
  }
  console.log(output);

  // todo log

  // todo -- we can stream this straight to object storage, we don't need to buffer it all in server memory first

  // get the PNG from the replicate CDN
  const png = await axios.get(output[0], {
    responseType: 'arraybuffer',
  });

  // todo log

  const buffer = Buffer.from(png.data, 'binary');

  // todo exiftool!

  const { url } = await createAssetInBucket(
    runId,
    ReagentBucket.NOGGIN_RUN_OUTPUTS,
    buffer,
    'image/png',
  );

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // TODO same as other
  succeedRun(runId, 'assetUrl', url);
};

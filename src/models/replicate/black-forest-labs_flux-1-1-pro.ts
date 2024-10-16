import axios from 'axios';
import Replicate from 'replicate';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';

import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Boolean_Value,
  ModelInput_Integer_Value,
  ModelInput_PlainTextWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1.js';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables.js';

type UnevaluatedModelParams = {
  prompt: ModelInput_PlainTextWithVariables_Value;
  width: ModelInput_Integer_Value;
  height: ModelInput_Integer_Value;
  prompt_upsampling: ModelInput_Boolean_Value;
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
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualization);

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  const model = 'black-forest-labs/flux-1.1-pro';
  const input = {
    prompt: modelParams.evaluated.prompt,
    aspect_ratio: 'custom',
    width: modelParams.evaluated['width'],
    height: modelParams.evaluated['height'],
    safety_tolerance: 5, // least strict (on replicate, anyway). rg doesn't handle this well so I'm not exposing it for now
    prompt_upsampling: modelParams.evaluated['prompt_upsampling'],
    output_format: 'webp',
    output_quality: 95,
  };

  // this model has a fixed cost per image
  const preliminaryCost = unit(0.04, 'dollars');
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
    output = (await replicate.run(model, { input }, (prediction) => {
      if (prediction.status === 'succeeded') {
        saveFinalCostCalculation(runId, preliminaryCost);
      }
    })) as unknown as string;
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

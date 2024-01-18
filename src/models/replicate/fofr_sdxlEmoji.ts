import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';

import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';
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
    'fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e';
  const input = {
    prompt: modelParams.evaluated.prompt,
    negative_prompt: modelParams.evaluated['negative-prompt'],
    width: modelParams.evaluated['width'],
    height: modelParams.evaluated['height'],
    num_inference_steps: modelParams.evaluated['inference-steps'],
  };

  let output: string[];
  try {
    output = (await replicate.run(model, { input })) as string[];
  } catch (e: any) {
    // smdh nsfw content
    // console.error(e);

    // todo maybe
    // writeLogToRunStream(runId, {
    //   level: 'error',
    //   message: {
    //     type: 'remote_api_error',
    //     text: 'Error from Replicate API',
    //     error: e,
    //   },
    //   stage: 'run_model',
    // });

    // TODO: i18n
    const message = e.message
      ? 'Error from Replicate API: ' + e.message
      : 'Error from Replicate API';

    failRun(runId, message);
    return;
  }

  // get the PNG from the replicate CDN
  const png = await axios.get(output[0], {
    responseType: 'arraybuffer',
  });

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

  // todo: reupload and shim (and exif data!) the image
  // todo: probably for now we'll upload and then have an abstraction that redownloads the asset -- this is a little silly but we could use a cache to make it work fine, and it's probably worth it to simplify the abstraction
  succeedRun(runId, 'assetUrl', url);
};

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

import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';
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
    'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
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
    // TODO: i18n
    const message = e.message
      ? 'Error from Replicate API: ' + e.message
      : 'Error from Replicate API';

    failRun(runId, message);
    return;
  }

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

import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import {
  getBucket,
  getExternalUrlForBucket,
  minioClient,
} from '../../object-storage/minio.js';
import { prisma } from '../../prisma.js';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';

import { v4 as uuidv4 } from 'uuid';
import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { ModelInput_PlainTextWithVariables_Value } from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';

type UnevaluatedModelParams = {
  prompt: ModelInput_PlainTextWithVariables_Value;
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
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualization);

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  const model =
    'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
  const input = {
    prompt: modelParams.evaluated.prompt,
    width: 1024,
    height: 1024,
    num_inference_steps: 50,
  };

  let output: string[];
  try {
    output = (await replicate.run(model, { input })) as string[];
  } catch (e) {
    // smdh nsfw content
    // console.error(e);
    // return sendStatus(500, { error: 'Internal server error' });
    failRun(runId, 'Error from Replicate API', e);
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

  // todo extract
  const outputAssetUuid = uuidv4();
  const outputAssetFilename = `${outputAssetUuid}.png`;

  await minioClient.putObject(
    await getBucket(ReagentBucket.NOGGIN_RUN_OUTPUTS),
    outputAssetFilename,
    buffer,
    {
      'Content-Type': 'image/png',
    },
  );

  const { url } = await prisma.nogginOutputAssetObject.create({
    data: {
      uuid: outputAssetUuid,
      filename: outputAssetFilename,
      nogginRunId: runId,
      mimeType: 'image/png',
      url: `${getExternalUrlForBucket(
        ReagentBucket.NOGGIN_RUN_OUTPUTS,
      )}/${outputAssetFilename}`,
    },
  });

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // TODO same as other
  succeedRun(runId, 'assetUrl', url);
};

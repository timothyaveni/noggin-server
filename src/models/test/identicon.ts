import Identicon from 'identicon.js';
import { StreamModelResponse } from '..';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';

import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import {
  getBucket,
  getExternalUrlForBucket,
  minioClient,
} from '../../object-storage/minio.js';
import { prisma } from '../../prisma.js';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';
import {
  ModelInput_Integer_Value,
  ModelInput_PlainTextWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables';

type UnevaluatedModelParams = {
  prompt: ModelInput_PlainTextWithVariables_Value;
  size: ModelInput_Integer_Value;
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

  const sha1 = createHash('sha1');
  sha1.update(modelParams.evaluated.prompt);
  const hash = sha1.digest('hex');

  // const png = `data:image/png;base64,${new Identicon(hash, 512).toString()}`;
  // const png = new Identicon(hash, { size: 512, format: 'png' })
  //   .render()
  //   .getDump();

  // this is probably converting to base64 and back but i couldn't seem to get the getDump to work
  const png = Buffer.from(
    new Identicon(hash, modelParams.evaluated.size).toString(),
    'base64',
  );

  await new Promise((resolve) => setTimeout(resolve, 2500));

  if (modelParams.evaluated.prompt.includes('error')) {
    failRun(runId, 'Error!');
    return;
  }

  const outputAssetUuid = uuidv4();
  const outputAssetFilename = `${outputAssetUuid}.png`;

  await minioClient.putObject(
    await getBucket(ReagentBucket.NOGGIN_RUN_OUTPUTS),
    outputAssetFilename,
    png,
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

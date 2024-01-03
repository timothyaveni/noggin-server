import Identicon from 'identicon.js';
import { StreamModelResponse } from '..';
import { openRunStream, succeedRun } from '../../runStreams.js';

import { createHash } from 'crypto';

import { v4 as uuidv4 } from 'uuid';
import { getBucket, minioClient } from '../../object-storage/minio.js';
import { prisma } from '../../prisma.js';
import { ReagentBucket } from '../../reagent-noggin-shared/object-storage-buckets.js';

type ModelParams = {
  prompt: string;
};

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
  chosenOutputFormat,
  runId: number,
  providerCredentials: {
    credentialsVersion: 1;
    credentials: { apiToken: string };
  },
  { sendStatus },
) => {
  const sha1 = createHash('sha1');
  sha1.update(evaluatedModelParams.prompt);
  const hash = sha1.digest('hex');

  // const png = `data:image/png;base64,${new Identicon(hash, 512).toString()}`;
  // const png = new Identicon(hash, { size: 512, format: 'png' })
  //   .render()
  //   .getDump();

  // this is probably converting to base64 and back but i couldn't seem to get the getDump to work
  const png = Buffer.from(new Identicon(hash, 512).toString(), 'base64');

  await new Promise((resolve) => setTimeout(resolve, 1000));

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
      url: `${process.env.OBJECT_STORAGE_EXTERNAL_URL}/noggin-run-outputs/${outputAssetFilename}`,
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

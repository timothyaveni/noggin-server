import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import { failRun, openRunStream, succeedRun } from '../../runStreams.js';

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
  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  const model =
    'fofr/sdxl-emoji:dee76b5afde21b0f01ed7925f0665b7e879c50ee718c5f78a9d38e04d523cc5e';
  const input = {
    prompt: evaluatedModelParams.prompt,
    width: 1024,
    height: 1024,
  };

  let output: string[];
  try {
    output = (await replicate.run(model, { input })) as string[];
  } catch (e) {
    // smdh nsfw content
    console.error(e);

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

    failRun(runId, 'Error from Replicate API', e);
    return;
  }

  // get the PNG from the replicate CDN
  const png = await axios.get(output[0], {
    responseType: 'arraybuffer',
  });

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
      url: `${process.env.OBJECT_STORAGE_EXTERNAL_URL}/noggin-run-outputs/${outputAssetFilename}`,
    },
  });

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // todo: reupload and shim (and exif data!) the image
  // todo: probably for now we'll upload and then have an abstraction that redownloads the asset -- this is a little silly but we could use a cache to make it work fine, and it's probably worth it to simplify the abstraction
  succeedRun(runId, 'assetUrl', url);
};

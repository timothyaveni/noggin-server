import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import { failRun, openRunStream, succeedRun } from '../../runStreams.js';

type ModelParams = {
  prompt: string;
};

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
  runId: number,
  { sendStatus },
) => {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
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

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // todo: reupload and shim (and exif data!) the image
  // todo: probably for now we'll upload and then have an abstraction that redownloads the asset -- this is a little silly but we could use a cache to make it work fine, and it's probably worth it to simplify the abstraction
  succeedRun(runId, 'assetUrl', output[0]);
};

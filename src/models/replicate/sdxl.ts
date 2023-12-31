import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';
import { failRun, openRunStream, succeedRun } from '../../runStreams.js';

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
    'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
  const input = {
    prompt: evaluatedModelParams.prompt,
    width: 512,
    height: 512,
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

  // get the PNG from the replicate CDN
  const png = await axios.get(output[0], {
    responseType: 'arraybuffer',
  });

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // TODO same as other
  succeedRun(runId, 'assetUrl', output[0]);
};

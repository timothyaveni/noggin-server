import { StreamModelResponse } from '..';
import { openRunStream, succeedRun } from '../../runStreams.js';

import { createHash } from 'crypto';

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
  const url = `https://github.com/identicons/${evaluatedModelParams.prompt}.png`;

  await new Promise((resolve) => setTimeout(resolve, 1000));

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  // TODO same as other
  succeedRun(runId, 'assetUrl', url);
};

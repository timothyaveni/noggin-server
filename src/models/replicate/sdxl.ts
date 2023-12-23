import { Response } from 'express';
import Replicate from 'replicate';
import axios from 'axios';

type ModelParams = {
  prompt: string;
};

export const streamResponse = async (
  evaluatedModelParams: ModelParams,
  response: Response,
) => {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  const model = 'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b';
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
    console.error(e);
    return response.status(500).send('Internal server error');
  }

  // get the PNG from the replicate CDN
  const png = await axios.get(output[0], {
    responseType: 'arraybuffer',
  });

  // write the PNG from the replicate API to the express response
  response.setHeader('Content-Type', 'image/png');
  response.setHeader('Content-Length', png.data.length);
  response.write(png.data);

  response.end();
};

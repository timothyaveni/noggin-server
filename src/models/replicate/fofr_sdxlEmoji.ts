import axios from 'axios';
import Replicate from 'replicate';
import { StreamModelResponse } from '..';

type ModelParams = {
  prompt: string;
};

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
  { response, log },
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

import {
  openRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';

type ModelParams = {
  prompt: string;
};

export const streamResponse: StreamModelResponse = async (
  evaluatedModelParams: ModelParams,
  chosenOutputFormat,
  runId: number,
) => {
  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=20, max=1000',
  });

  const breadstick = evaluatedModelParams.prompt.includes('emoji')
    ? '🥖'
    : ' breadsticks';
  const firstNumberInPrompt = evaluatedModelParams.prompt.match(/\d+/)?.[0];
  const breadstickCount = parseInt(firstNumberInPrompt || '50', 10);
  const delay = 100;

  let output = '';
  for (let i = 0; i < breadstickCount; i++) {
    const partial = breadstick;

    writeLogToRunStream(runId, {
      level: 'debug',
      stage: 'run_model',
      message: {
        type: 'model_chunk',
        text: 'Model chunk',
        chunk: partial,
      },
    });
    writeIncrementalContentToRunStream(runId, 'text', partial);
    output += partial;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  writeLogToRunStream(runId, {
    level: 'info',
    stage: 'run_model',
    message: {
      type: 'model_full_output',
      text: 'Model full output',
      output,
    },
  });

  succeedRun(runId, 'text', output);
};

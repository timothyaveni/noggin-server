import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import { ModelInput_PlainTextWithVariables_Value } from '../../reagent-noggin-shared/types/editorSchemaV1.js';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables.js';
import {
  openRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
  writeLogToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';

type UnevaluatedModelParams = {
  prompt: ModelInput_PlainTextWithVariables_Value;
};

export const streamResponse: StreamModelResponse = async (
  modelParams: ModelParamsForStreamResponse<UnevaluatedModelParams>,
  chosenOutputFormat,
  runId: number,
) => {
  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=90, max=1000',
  });

  const breadstick = modelParams.evaluated.prompt.includes('emoji')
    ? '🥖'
    : ' breadsticks';
  const firstNumberInPrompt = modelParams.evaluated.prompt.match(/\d+/)?.[0];
  const breadstickCount = parseInt(firstNumberInPrompt || '50', 10);
  const modelCost = modelParams.evaluated.prompt.includes('pricey')
    ? unit(0.01, 'credits / outtoken')
    : unit(0, 'credits / outtoken');
  const delay = 100;

  const runCost = modelCost.multiply(unit(breadstickCount, 'outtoken'));

  savePreliminaryCostEstimate(runId, runCost);

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

  saveFinalCostCalculation(runId, runCost);

  succeedRun(runId, 'text', output);
};

import Identicon from 'identicon.js';
import { StreamModelResponse } from '..';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
} from '../../runStreams.js';

import { createHash } from 'crypto';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForImageOutputModel } from '../../createIOVisualization.js';
import { createAssetInBucket } from '../../object-storage/createAssetInBucket.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
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
  remainingBudget,
  { sendStatus },
) => {
  const ioVisualization = createIOVisualizationForImageOutputModel(
    modelParams.partialEvaluated.prompt,
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualization);

  const preliminaryCost = unit(0, 'credits');
  savePreliminaryCostEstimate(runId, preliminaryCost);

  if (
    remainingBudget !== null &&
    preliminaryCost.toNumber('quastra') > remainingBudget
  ) {
    failRun(
      runId,
      // TODO use a rounding function
      `The anticipated cost of this operation exceeds the noggin's remaining budget. The anticipated cost is ${preliminaryCost.toNumber(
        'credit',
      )} and the remaining budget is ${unit(
        remainingBudget,
        'quastra',
      ).toNumber('credit')}.`,
    );
    return;
  }

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

  const { url } = await createAssetInBucket(
    runId,
    'NOGGIN_RUN_OUTPUTS',
    png,
    'image/png',
  );

  // write the PNG from the replicate API to the express response
  openRunStream(runId, {
    // 'Content-Type': 'image/png',
    // 'Content-Length': png.data.length,
  });

  saveFinalCostCalculation(runId, unit(0, 'credits'));

  // TODO same as other
  succeedRun(runId, 'assetUrl', url);
};

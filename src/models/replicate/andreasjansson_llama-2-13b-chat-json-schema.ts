import Replicate from 'replicate';
import { flattenTextOnlyContentChunks } from '../../convertEvaluatedContentChunks.js';
import { getReplicateCost } from '../../cost-calculation/replicate.js';
import {
  saveFinalCostCalculation,
  savePreliminaryCostEstimate,
} from '../../cost-calculation/save-cost-calculations.js';
import { createIOVisualizationForChatTextModel } from '../../createIOVisualization.js';
import { unit } from '../../reagent-noggin-shared/cost-calculation/units.js';
import {
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
} from '../../reagent-noggin-shared/types/editorSchemaV1.js';
import { ModelParamsForStreamResponse } from '../../reagent-noggin-shared/types/evaluated-variables.js';
import {
  failRun,
  openRunStream,
  setIOVisualizationRenderForRunStream,
  succeedRun,
  writeIncrementalContentToRunStream,
} from '../../runStreams.js';
import { StreamModelResponse } from '../index.js';

// todo there might be some type magic we can do here to grab these from the actual type in the editor schema file
type UnevaluatedModelParams = {
  'chat-prompt': ModelInput_StandardChatWithVariables_Value;
  'output-structure': ModelInput_SimpleSchema_Value;
  'maximum-completion-length': ModelInput_Integer_Value;
  temperature: ModelInput_Number_Value;
  'top-p': ModelInput_Number_Value;
  // TODO: top_k
  'frequency-penalty': ModelInput_Number_Value;
  'presence-penalty': ModelInput_Number_Value;
  // TODO: repeat_penalty
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
) => {
  const ioVisualizationRender = createIOVisualizationForChatTextModel(
    modelParams.partialEvaluated['chat-prompt'],
  );

  await setIOVisualizationRenderForRunStream(runId, ioVisualizationRender);

  // TODO: probably extract these into a function
  openRunStream(runId, {
    'Content-Type': 'text/html; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Keep-Alive': 'timeout=90, max=1000',
  });

  const replicate = new Replicate({
    auth: providerCredentials.credentials.apiToken,
  });

  // it's possible that raw llama would require us to do more system prompt processing, but i think
  // replicate handles this for us
  let prompt = '';
  // well, this particular model doesn't have a system prompt input anyway
  // const system_prompt = modelParams.evaluated['system-prompt'] || undefined;

  // TODO: if there are _only_ assistant turns, the prompt will get wrapped by replicate in [INST] tags... warn about this at least
  for (const turn of modelParams.evaluated['chat-prompt']) {
    if (turn.speaker === 'user') {
      prompt += `\n[INST] ${flattenTextOnlyContentChunks(
        turn.content,
      )} [/INST]`;
    } else if (turn.speaker === 'assistant') {
      prompt += `\n${flattenTextOnlyContentChunks(turn.content)}`;
    } else if (turn.speaker === 'developer') {
      throw new Error('Developer turns are not supported');
    } else {
      const _exhaustiveCheck: never = turn.speaker;
    }
  }

  // TODO: pretty rough estimate. preliminary estimates should go over so we aren't likely to cap out a model's limit
  const preliminaryCost = getReplicateCost('a40Large', 5);
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

  const output = (await replicate.run(
    'andreasjansson/llama-2-13b-chat-gguf:60ec5dda9ff9ee0b6f786c9d1157842e6ab3cc931139ad98fe99e08a35c5d4d4',
    {
      input: {
        prompt,
        jsonschema: JSON.stringify(modelParams.evaluated['output-structure']),
        max_tokens: modelParams.evaluated['maximum-completion-length'],
        temperature: modelParams.evaluated['temperature'],
        top_p: modelParams.evaluated['top-p'],
        frequency_penalty: modelParams.evaluated['frequency-penalty'],
        presence_penalty: modelParams.evaluated['presence-penalty'],
      },
    },
    (prediction) => {
      if (
        prediction.status === 'succeeded' &&
        prediction.metrics?.predict_time != null
      ) {
        saveFinalCostCalculation(
          runId,
          getReplicateCost('a40Large', prediction.metrics.predict_time),
        );
      }
    },
  )) as string[];

  // returns an array of token strings

  const joinedOutput = output.join('');

  let finalOutput;
  try {
    const parsed = JSON.parse(joinedOutput);
    console.log({ parsed }, typeof parsed);
    if (typeof parsed === 'string') {
      finalOutput = parsed; // otherwise it'll have quotes
    } else {
      finalOutput = joinedOutput;
    }
  } catch (e) {
    // parse failed, probably truncated
    finalOutput = joinedOutput;
  }

  console.log(finalOutput);

  writeIncrementalContentToRunStream(runId, 'text', finalOutput, output);
  succeedRun(runId, 'text', finalOutput, output);
};

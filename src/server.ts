import {
  NogginRunLogEntryStage,
  NogginRunLogLevel,
  PrismaClient,
} from '@prisma/client';
import express from 'express';
import * as Y from 'yjs';
import { createRequestParameters } from './createRequestParameters.js';
import { evaluateParamsInModelInputs } from './evaluateParams.js';
import { parseModelInputs } from './parseModelInputs.js';

import modelProviderIndex from './models/index.js';

import { v4 as uuid } from 'uuid';

import dotenv from 'dotenv';
dotenv.config();

export const prisma = new PrismaClient();

const app = express();

const deserializeYDoc = (serialized: Buffer, yDoc: Y.Doc) => {
  const uint8Array = new Uint8Array(serialized);
  Y.applyUpdate(yDoc, uint8Array);
  return yDoc;
};

export type LogArgs = {
  level: NogginRunLogLevel;
  stage: NogginRunLogEntryStage;
  message: any;
  privateData?: any;
};

const logForRun = (runId: number) => async (log: LogArgs) => {
  return await prisma.nogginRunLogEntry.create({
    data: {
      runId,
      entryTypeVersion: 1,
      level: log.level,
      stage: log.stage,
      message: log.message,
      privateData: log.privateData,
    },
  });
};

// TODO: create a 'failed' runresult when we die, especially before calling the model

app.get('/:noggin', async (req, res) => {
  const noggin = await prisma.noggin.findUnique({
    where: {
      slug: req.params.noggin,
    },
    select: {
      id: true,
      aiModelId: true,
    },
  });

  if (!noggin) {
    return res.status(404).send('Not found');
  }

  // TODO: not the best way to get the latest revision
  const nogginRevision = await prisma.nogginRevision.findFirst({
    where: {
      nogginId: noggin.id,
    },
    orderBy: {
      id: 'desc',
    },
    select: {
      id: true,
      content: true,
    },
  });

  if (!nogginRevision) {
    return res.status(404).send('Not found');
  }

  const run = await prisma.nogginRun.create({
    data: {
      uuid: uuid(),
      nogginRevisionId: nogginRevision.id,
    },
  });

  res.setHeader('X-Reagent-Noggin-Run-Id', run.uuid);

  const log = logForRun(run.id);

  const key = req.query.key?.toString();

  if (!key) {
    await log({
      level: 'error',
      stage: 'authenticate',
      message: {
        type: 'key_missing',
        text: 'No API key was found in the HTTP request made to the noggin. All noggin uses must be authenticated.',
      },
    });
    return res.status(400).send('Bad request');
  }

  await log({
    level: 'info',
    stage: 'authenticate',
    message: {
      type: 'key_received',
      text: `Attempting to authenticate with key ${key}`,
    },
  });

  const nogginApiKey = await prisma.nogginAPIKey.findUnique({
    where: {
      key,
    },
    select: {
      nogginId: true,
    },
  });

  // if (!nogginApiKey) {
  //   await log({
  //     level: 'error',
  //     stage: 'authenticate',
  //     message: {
  //       type: 'key_invalid',
  //       text: 'The API key provided was not valid for this noggin.',
  //     },
  //     privateData: {
  //       reason: 'This key does not exist.',
  //     },
  //   });
  //   return res.status(403).send('Forbidden');
  // }

  // if (nogginApiKey.nogginId !== noggin.id) {
  //   await log({
  //     level: 'error',
  //     stage: 'authenticate',
  //     message: {
  //       type: 'key_invalid',
  //       text: 'The API key provided was not valid for this noggin.',
  //     },
  //     privateData: {
  //       reason: 'This key exists but is for a different noggin.',
  //       otherNogginId: nogginApiKey.nogginId,
  //     },
  //   });
  //   return res.status(403).send('Forbidden');
  // }

  const { editorSchema, modelName, revision, modelProviderName } =
    await prisma.aIModel
      .findUniqueOrThrow({
        where: {
          id: noggin.aiModelId,
        },
        select: {
          name: true,
          editorSchema: true,
          revision: true,
          modelProvider: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((aiModel) => {
        return {
          editorSchema: aiModel.editorSchema,
          modelName: aiModel.name,
          revision: aiModel.revision,
          modelProviderName: aiModel.modelProvider.name,
        };
      });

  await log({
    level: 'info',
    stage: 'process_parameters',
    message: {
      type: 'model_info_loaded',
      text: 'Model info loaded',
      modelName,
      revision,
      modelProviderName,
    },
  });

  const yDoc = new Y.Doc();
  deserializeYDoc(nogginRevision.content, yDoc);

  const parsedModelInputs = parseModelInputs(
    yDoc.get('modelInputs', Y.Map),
    editorSchema,
  );

  console.log(parsedModelInputs);

  const documentParameters = yDoc.get('documentParameters', Y.Map).toJSON();

  const requestParameters = await createRequestParameters(
    req,
    documentParameters,
  );
  // TODO allow overrides too, i guess

  const evaluatedModelParams = evaluateParamsInModelInputs(
    parsedModelInputs,
    editorSchema,
    documentParameters,
    requestParameters,
  );

  // todo maybe a timeout on this side before we call into the model code?
  console.log(evaluatedModelParams);
  const { streamResponse } = modelProviderIndex(modelProviderName)(modelName);
  streamResponse(evaluatedModelParams, {
    response: res,
    log,
  });
});

app.listen(2358, () => {
  console.log('Server listening on port 2358');
});

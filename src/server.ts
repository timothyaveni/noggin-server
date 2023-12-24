import express from 'express';
import { PrismaClient } from '@prisma/client';
import * as Y from 'yjs';
import { yTextToSlateElement } from '@slate-yjs/core';
import { createRequestParameters } from './createRequestParameters.js';
import { parseModelInputs } from './parseModelInputs.js';
import { evaluateParamsInModelInputs } from './evaluateParams.js';

import modelProviderIndex from './models/index.js';

import dotenv from 'dotenv';
dotenv.config();

export const prisma = new PrismaClient();

const app = express();

const deserializeYDoc = (serialized: Buffer, yDoc: Y.Doc) => {
  const uint8Array = new Uint8Array(serialized);
  Y.applyUpdate(yDoc, uint8Array);
  return yDoc;
};

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

  const key = req.query.key?.toString();

  if (!key) {
    return res.status(400).send('Bad request');
  }

  const nogginApiKey = await prisma.nogginAPIKey.findUnique({
    where: {
      key,
    },
    select: {
      nogginId: true,
    },
  });

  if (!nogginApiKey) {
    return res.status(403).send('Forbidden');
  }

  // if (nogginApiKey.nogginId !== noggin.id) {
  //   return res.status(403).send('Forbidden');
  // }

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

  const { editorSchema, modelName, revision, modelProviderName } = await prisma.aIModel
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
        editorSchema: JSON.parse(aiModel.editorSchema),
        modelName: aiModel.name,
        revision: aiModel.revision,
        modelProviderName: aiModel.modelProvider.name,
      };
    });

  const yDoc = new Y.Doc();
  deserializeYDoc(nogginRevision.content, yDoc);

  const parsedModelInputs = parseModelInputs(
    yDoc.get('modelInputs', Y.Map),
    editorSchema,
  );

  console.log(parsedModelInputs);

  const documentParameters = yDoc.get('documentParameters', Y.Map).toJSON();

  const requestParameters = await createRequestParameters(req, documentParameters);
  // TODO allow overrides too, i guess

  const evaluatedModelParams = evaluateParamsInModelInputs(
    parsedModelInputs,
    editorSchema,
    documentParameters,
    requestParameters,
  );

  // todo maybe a timeout on this side before we call into the model code?
  console.log(evaluatedModelParams);
  const { streamResponse } = modelProviderIndex(modelProviderName)(modelName)
  streamResponse(evaluatedModelParams, res);
});

app.listen(2358, () => {
  console.log('Server listening on port 2358');
});

import axios from 'axios';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import * as Y from 'yjs';

import { createRequestParameters } from './createRequestParameters.js';
import { evaluateVariablesInModelInputs } from './evaluateVariables.js';
import { getProviderCredentialsForNoggin_OMNISCIENT } from './getCredentials.js';
import inferIntent from './inferIntent.js';
import inferNogginAPIKey from './inferNogginAPIKey.js';
import inferNogginSlug from './inferNogginSlug.js';
import modelProviderIndex from './models/index.js';
import { parseModelInputs } from './parseModelInputs.js';
import { prisma } from './prisma.js';
import { EditorSchema } from './reagent-noggin-shared/types/editorSchema.js';
import { registerStream, writeLogToRunStream } from './runStreams.js';
import { deserializeYDoc } from './y.js';

const handleRequest = async (req: Request, res: Response) => {
  const { intent, responseType } = inferIntent(req);

  let responded = false;
  const sendStatus = (
    status: number,
    response: { message: string } | { error: string },
  ) => {
    if (responded) {
      return;
    }

    responded = true;

    if (responseType === 'json') {
      return res.status(status).json(response);
    } else {
      const responseText = response.hasOwnProperty('message')
        ? // @ts-expect-error lol ig ts doesn't like me doing this
          response.message
        : // @ts-expect-error
          response.error;
      return res.status(status).send(responseText);
    }
  };

  const nogginSlug = inferNogginSlug(req);

  if (!nogginSlug) {
    console.log('no noggin slug');
    return sendStatus(404, { error: 'Not found' });
  }

  const noggin = await prisma.noggin.findUnique({
    where: {
      slug: nogginSlug,
    },
    select: {
      id: true,
      aiModelId: true,
    },
  });

  if (!noggin) {
    // todo: show which slugs we tried using
    return sendStatus(404, { error: 'Not found' });
  }

  // TODO: handle error
  await axios.post(
    `${process.env.Y_WEBSOCKET_SERVER_INTERNAL_URL}/immediate-sync`,
    {
      nogginId: noggin.id,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SHARED_Y_WEBSOCKET_SERVER_SECRET}`,
      },
    },
  );

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
    return sendStatus(500, { error: 'Noggin revision not found' });
  }

  const run = await prisma.nogginRun.create({
    data: {
      uuid: uuid(),
      nogginRevisionId: nogginRevision.id,
      status: 'pending',
    },
  });

  res.setHeader('X-Reagent-Noggin-Run-Id', run.uuid);

  if (intent === 'create-run') {
    sendStatus(201, { message: run.uuid });
  }

  const key = inferNogginAPIKey(req);

  if (!key) {
    writeLogToRunStream(run.id, {
      level: 'error',
      stage: 'authenticate',
      message: {
        type: 'key_missing',
        text: 'No API key was found in the HTTP request made to the noggin. All noggin uses must be authenticated.',
      },
    });
    return sendStatus(400, { error: 'Missing key' });
  }

  writeLogToRunStream(run.id, {
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

  if (!nogginApiKey) {
    writeLogToRunStream(run.id, {
      level: 'error',
      stage: 'authenticate',
      message: {
        type: 'key_invalid',
        text: 'The API key provided was not valid for this noggin.',
      },
      privateData: {
        reason: 'This key does not exist.',
      },
    });
    return sendStatus(403, { error: 'Forbidden' });
  }

  if (nogginApiKey.nogginId !== noggin.id) {
    writeLogToRunStream(run.id, {
      level: 'error',
      stage: 'authenticate',
      message: {
        type: 'key_invalid',
        text: 'The API key provided was not valid for this noggin.',
      },
      privateData: {
        reason: 'This key exists but is for a different noggin.',
        otherNogginId: nogginApiKey.nogginId,
      },
    });
    return sendStatus(403, { error: 'Forbidden' });
  }

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
          editorSchema: aiModel.editorSchema as unknown as EditorSchema,
          modelName: aiModel.name,
          revision: aiModel.revision,
          modelProviderName: aiModel.modelProvider.name,
        };
      });

  writeLogToRunStream(run.id, {
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

  const yDoc = deserializeYDoc(nogginRevision.content);

  const parsedModelInputs = parseModelInputs(
    yDoc.get('modelInputs', Y.Map),
    editorSchema,
  );

  console.log(parsedModelInputs);

  const documentParameters = yDoc.get('documentParameters', Y.Map).toJSON();

  const nogginOptions = yDoc.get('nogginOptions', Y.Map).toJSON();

  // TODO: filter out reserved params like 'key'
  const requestParameters = await createRequestParameters(
    req,
    documentParameters,
  );
  // TODO allow overrides too, i guess

  const {
    partialEvaluated: partialEvaluatedModelInputs,
    evaluated: evaluatedModelParams,
  } = evaluateVariablesInModelInputs(
    parsedModelInputs,
    editorSchema,
    documentParameters,
    requestParameters,
  );

  // todo maybe a timeout on this side before we call into the model code?
  console.log(evaluatedModelParams);

  registerStream(run.id, {
    appendText:
      intent === 'stream'
        ? (text) => {
            res.write(text);
          }
        : undefined,
    finalizeText:
      intent === 'stream'
        ? (text) => {
            // res.write(text);
            // do nothing! we already streamed it
          }
        : undefined,
    finalizeAsset:
      intent === 'stream'
        ? (assetUrl) => {
            if (res.headersSent) {
              // not much we can do.
              // todo, log?
              return;
            }

            // todo we're planning to proxy this.. i guess.. though now that i think about it, maybe it's for the best that we redirect to the cdn (which will be our owned upload) unless the client asks us not to with some param
            res.redirect(assetUrl);
          }
        : undefined,
    reportFinalError:
      intent === 'stream'
        ? (errorMessage) => {
            res.status(500).send(errorMessage);
          }
        : undefined,
    setHeader:
      intent === 'stream'
        ? (key, value) => {
            res.setHeader(key, value);
          }
        : undefined,
    terminateStream:
      intent === 'stream'
        ? () => {
            res.end();
          }
        : undefined,
  });

  const { providerCredentials, needsCredentials } =
    await getProviderCredentialsForNoggin_OMNISCIENT(noggin.id);

  if (needsCredentials && !providerCredentials) {
    writeLogToRunStream(run.id, {
      level: 'error',
      stage: 'run_model',
      message: {
        type: 'credentials_missing',
        text: 'This model provider requires credentials to run models, but they were not configured.',
      },
    });
    return sendStatus(403, {
      error:
        'This model provider requires credentials to run models, but they were not configured.',
    });
  }

  const { streamResponse } = modelProviderIndex(modelProviderName)(modelName);

  const chosenOutputFormat =
    editorSchema.outputFormats.find(
      (format) => format.key === nogginOptions.chosenOutputFormatKey,
    ) || editorSchema.outputFormats[0]; // todo log error if not found

  await prisma.nogginRun.update({
    where: {
      id: run.id,
    },
    data: {
      status: 'running',
    },
  });

  streamResponse(
    {
      unevaluated: parsedModelInputs,
      partialEvaluated: partialEvaluatedModelInputs,
      evaluated: evaluatedModelParams,
    },
    chosenOutputFormat,
    run.id,
    providerCredentials,
    {
      sendStatus, // todo refactor this out
    },
  );
};

export default handleRequest;

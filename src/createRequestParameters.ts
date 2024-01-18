import { Request } from 'express';
import { emptyPNGUrl } from './imageUtils.js';
import { ReagentBucket } from './reagent-noggin-shared/object-storage-buckets.js';

import axios from 'axios';
import { parse } from 'path';
import { validate as validateUuid } from 'uuid';
import { createAssetInBucket } from './object-storage/createAssetInBucket.js';
import { getExternalUrlForBucket } from './object-storage/minio.js';

import gm from 'gm';

// TODO: synced from store.tsx -- probably extract this to shared code
type DocumentBaseVariable = {
  name: string;
};

export interface DocumentTextVariable extends DocumentBaseVariable {
  type: 'text';
  maxLength: number;
  defaultValue: string;
}

export interface DocumentImageVariable extends DocumentBaseVariable {
  type: 'image';
  openAI_detail: 'low' | 'high' | 'auto'; // openai-centric for now. also maybe in the future we do our own scaling in the shim?
}

export type DocumentVariable = DocumentTextVariable | DocumentImageVariable;
type _DPTypeCheck = DocumentVariable['type'];

type DocumentVariables = Record<string, DocumentVariable>;

type RequestParametersWithMetadata = Record<
  string,
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image';
      imageType: 'text'; // later, handle multipart uploads (buffer type)
      text: string;
      objectStorageUrl?: string;
    }
>;

type RequestParameters = Record<string, string>;

const getRequestParametersFromRequest = (
  req: Request,
  documentVariables: DocumentVariables,
) => {
  const parameters: RequestParametersWithMetadata = {};

  for (const parameterKey of Object.keys(documentVariables)) {
    const parameter = documentVariables[parameterKey]; // todo: dupe params etc
    const queryValue = req.query[parameter.name];
    const bodyValue =
      // @ts-expect-error
      req.nogginBody?.body && req.nogginBody?.body[parameter.name];
    switch (parameter.type) {
      case 'text':
        if (bodyValue) {
          parameters[parameterKey] = {
            type: 'text',
            text: bodyValue.toString(),
          };
        } else if (queryValue) {
          parameters[parameterKey] = {
            type: 'text',
            text: queryValue.toString(),
          };
        } else {
          parameters[parameterKey] = {
            type: 'text',
            text: parameter.defaultValue || '',
          };
        }
        break;
      case 'image':
        if (bodyValue) {
          parameters[parameterKey] = {
            type: 'image',
            imageType: 'text',
            text: bodyValue.toString(),
          };
        } else if (queryValue) {
          parameters[parameterKey] = {
            type: 'image',
            imageType: 'text',
            text: queryValue.toString(),
          };
        } else {
          console.warn('no image provided for parameter', parameterKey);
          parameters[parameterKey] = {
            type: 'image',
            imageType: 'text',
            text: emptyPNGUrl(),
          };
        }
        break;
    }
  }

  return parameters;
};

const truncateMaxTextLength = (parameters: RequestParametersWithMetadata) => {}; // TODO noop

const getAlreadyObjectStorageUrl = (text: string): string | null => {
  const objectStoragePrefix = `${getExternalUrlForBucket(
    ReagentBucket.NOGGIN_RUN_INPUTS,
  )}/`;
  if (text.startsWith(objectStoragePrefix)) {
    const remainder = text.slice(objectStoragePrefix.length);
    // remainder is a filename
    const { name } = parse(remainder);
    if (validateUuid(name)) {
      // yeah, looks like one of ours
      return text;
    }
  }

  return null;
};

const streamToInputBucket = async (
  runId: number,
  url: string,
): Promise<string> => {
  // TODO: to protect ourselves from OOMing we really should stream this
  // TODO give it a try catch for logging
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    maxContentLength: 10000000, // 10mb
  });

  const { url: objectUrl } = await createAssetInBucket(
    runId,
    ReagentBucket.NOGGIN_RUN_INPUTS,
    Buffer.from(response.data, 'binary'),
    response.headers['content-type'],
  );

  return objectUrl;
};

const tryUploadingBase64 = async (
  runId: number,
  text: string,
): Promise<string | null> => {
  const dataUrlRegex = /^data:(.+);base64,(.+)$/;
  try {
    const match = dataUrlRegex.exec(text);

    let [mime, buf]: [string, Buffer | null] = ['', null];
    if (match) {
      let base64;
      [mime, base64] = match.slice(1);
      buf = Buffer.from(base64, 'base64');
    } else {
      buf = Buffer.from(text, 'base64');
      mime = await new Promise((resolve, reject) =>
        gm(buf!).identify((err, data) => {
          if (err) {
            return reject(err);
          }

          if (data.format === 'PNG') {
            return resolve('image/png');
          } else if (data.format === 'JPEG') {
            return resolve('image/jpeg');
          } else if (data.format === 'WEBP') {
            // untested
            return resolve('image/webp');
          } else {
            return reject(new Error('Unsupported image format'));
          }
        }),
      );
    }

    if (!buf) {
      return null;
    }

    const { url } = await createAssetInBucket(
      runId,
      ReagentBucket.NOGGIN_RUN_INPUTS,
      buf,
      mime,
    );

    return url;
  } catch (e) {
    return null;
  }
};

const populateObjectStorage = async (
  runId: number,
  parameters: RequestParametersWithMetadata,
) => {
  // todo do these concurrently (promise.all)
  for (const parameterKey of Object.keys(parameters)) {
    const parameter = parameters[parameterKey];
    if (parameter.type === 'image') {
      if (parameter.imageType === 'text') {
        // first let's see if it's a url from our own object storage (e.g. because of the 'use' api)
        const alreadyObjectStorageUrl = getAlreadyObjectStorageUrl(
          parameter.text,
        );
        if (alreadyObjectStorageUrl) {
          parameter.objectStorageUrl = alreadyObjectStorageUrl;
          continue; // good ol' goto
        }

        // otherwise, we need to upload it
        // let's see if it looks like a url from someplace else
        if (
          parameter.text.startsWith('http://') ||
          parameter.text.startsWith('https://') ||
          parameter.text.startsWith('ftp://') // lol sure why not
        ) {
          const objectStorageUrl = await streamToInputBucket(
            runId,
            parameter.text,
          );
          parameter.objectStorageUrl = objectStorageUrl;
          continue;
        }

        // maybe it's base64?
        const objectStorageUrl = await tryUploadingBase64(
          runId,
          parameter.text,
        );
        if (objectStorageUrl) {
          parameter.objectStorageUrl = objectStorageUrl;
          continue;
        }

        // aite i got nothing
      }
    }
  }
};

const flattenParameterMetadata = (
  parameters: RequestParametersWithMetadata,
): RequestParameters => {
  const flattened: RequestParameters = {};

  for (const parameterKey of Object.keys(parameters)) {
    const parameter = parameters[parameterKey];
    if (parameter.type === 'text') {
      flattened[parameterKey] = parameter.text;
    } else if (parameter.type === 'image') {
      flattened[parameterKey] = parameter.objectStorageUrl || '';
    }
  }

  return flattened;
};

export const createRequestParameters = async (
  runId: number,
  req: Request,
  documentParameters: DocumentVariables,
): Promise<RequestParameters> => {
  const parameters: RequestParametersWithMetadata =
    getRequestParametersFromRequest(req, documentParameters);

  truncateMaxTextLength(parameters);
  // await
  await populateObjectStorage(runId, parameters);

  return flattenParameterMetadata(parameters);
};

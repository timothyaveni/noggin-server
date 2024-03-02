import { Request } from 'express';
import { emptyPNGUrl } from './imageUtils.js';
import { ReagentBucket } from './reagent-noggin-shared/object-storage-buckets.js';

import axios from 'axios';
import { parse } from 'path';
import { validate as validateUuid } from 'uuid';
import { createAssetInBucket } from './object-storage/createAssetInBucket.js';
import { getExternalUrlForBucket } from './object-storage/minio.js';

import gm from 'gm';
import { createDocumentVariableForOverride } from './reagent-noggin-shared/createDocumentVariableForOverride.js';
import { DocumentVariables } from './reagent-noggin-shared/types/DocType.js';
import { EditorSchema } from './reagent-noggin-shared/types/editorSchema.js';
import { ModelInputValues } from './reagent-noggin-shared/types/editorSchemaV1.js';

export type RequestParametersWithMetadata = Record<
  string,
  | {
      type: 'text';
      text: string;
      maxLength?: number;
    }
  | {
      type: 'image';
      imageType: 'text'; // later, handle multipart uploads (buffer type)
      text: string;
      objectStorageUrl?: string;
    }
>;

export type RequestParameters = Record<string, string>;

const getRequestParametersFromRequest = (
  req: Request,
  documentVariables: DocumentVariables,
  modelInputValues: ModelInputValues,
  overridableSelections: string[],
  editorSchema: EditorSchema,
) => {
  const parameters: RequestParametersWithMetadata = {};

  const documentVariablesWithOverrides: typeof documentVariables = JSON.parse(
    JSON.stringify(documentVariables),
  );

  for (const overridable of overridableSelections) {
    const modelInputValue = modelInputValues[overridable];
    const documentVariable = createDocumentVariableForOverride(
      overridable,
      modelInputValue, // right okay we also do it here, not just in evaluateOverrides... don't love it
      editorSchema,
    );
    if (modelInputValue) {
      documentVariablesWithOverrides[documentVariable.id] =
        documentVariable.variable;
    } else {
      // ???
    }
  }

  for (const parameterKey of Object.keys(documentVariablesWithOverrides)) {
    const parameter = documentVariablesWithOverrides[parameterKey]; // todo: dupe params etc
    const queryValue = req.query[parameter.name];
    const bodyValue =
      // @ts-expect-error
      req.nogginBody?.body && req.nogginBody?.body[parameter.name];
    switch (parameter.type) {
      case 'text':
      case 'number': // these are represented in text at this point
      case 'integer':
        const maxLength =
          (parameter.type === 'text' && parameter.maxLength) || Infinity;

        if (bodyValue) {
          parameters[parameterKey] = {
            type: 'text',
            text: bodyValue.toString(),
            maxLength: maxLength,
          };
        } else if (queryValue) {
          parameters[parameterKey] = {
            type: 'text',
            text: queryValue.toString(),
            maxLength: maxLength,
          };
        } else {
          parameters[parameterKey] = {
            type: 'text',
            text: parameter.defaultValue.toString() || '', // TODO: hmm, we do this in multiple spots i think
            maxLength: maxLength,
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
      default:
        const _exhaustiveCheck: never = parameter;
        throw new Error('unknown parameter type');
    }
  }

  return parameters;
};

const truncateMaxTextLength = (parameters: RequestParametersWithMetadata) => {
  for (const parameterKey of Object.keys(parameters)) {
    const parameter = parameters[parameterKey];
    if (parameter.type === 'text') {
      // TODO log if this truncation happens
      // TODO allow the user to say the req should just fail
      if (parameter.maxLength) {
        // legit fine to be checking undef/null/0 here -- though i think it'd come out as 0? possibly even nan????
        parameter.text = parameter.text.slice(0, parameter.maxLength);
      }
    }
  }
};

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
  modelInputValues: ModelInputValues,
  overridableSelections: string[],
  editorSchema: EditorSchema,
): Promise<RequestParameters> => {
  const parameters: RequestParametersWithMetadata =
    getRequestParametersFromRequest(
      req,
      documentParameters,
      modelInputValues,
      overridableSelections,
      editorSchema,
    );

  truncateMaxTextLength(parameters);
  // await
  await populateObjectStorage(runId, parameters);

  return flattenParameterMetadata(parameters);
};

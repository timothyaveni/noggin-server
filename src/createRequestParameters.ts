import { Request } from 'express';
import { emptyPNGUrl } from './imageUtils.js';

// TODO: synced from store.tsx -- probably extract this to shared code
type DocumentBaseParameter = {
  name: string;
};

export interface DocumentTextParameter extends DocumentBaseParameter {
  type: 'text';
  maxLength: number;
  defaultValue: string;
}

export interface DocumentImageParameter extends DocumentBaseParameter {
  type: 'image';
  openAI_detail: 'low' | 'high' | 'auto'; // openai-centric for now. also maybe in the future we do our own scaling in the shim?
}

export type DocumentParameter = DocumentTextParameter | DocumentImageParameter;
type _DPTypeCheck = DocumentParameter['type'];

type DocumentParameters = Record<string, DocumentParameter>;

export type RequestParameters = Record<string, string>;

export const createRequestParameters = async (
  req: Request,
  documentParameters: DocumentParameters,
): Promise<RequestParameters> => {
  const parameters: RequestParameters = {};

  // todo truncation etc
  for (const parameterKey of Object.keys(documentParameters)) {
    const parameter = documentParameters[parameterKey]; // todo: dupe params etc
    const queryValue = req.query[parameter.name];
    const bodyValue =
      // @ts-expect-error
      req.nogginBody?.body && req.nogginBody?.body[parameter.name];
    switch (parameter.type) {
      case 'text':
        if (bodyValue) {
          parameters[parameterKey] = bodyValue.toString();
        } else if (queryValue) {
          parameters[parameterKey] = queryValue.toString();
        } else {
          parameters[parameterKey] = parameter.defaultValue || '';
        }
        break;
      case 'image':
        console.log({
          parameterKey,
          parameter,
          bodyValue,
          queryValue,
          rq: req.query,
          // @ts-expect-error
          rb: req.nogginBody,
        });
        if (bodyValue) {
          // parameters[parameterKey] = await imageUrlToBase64(
          //   bodyValue.toString(),
          // );
          parameters[parameterKey] = bodyValue.toString();
        } else if (queryValue) {
          // parameters[parameterKey] = await imageUrlToBase64(
          //   queryValue.toString(),
          // );
          parameters[parameterKey] = queryValue.toString();
        } else {
          console.warn('no image provided for parameter', parameterKey);
          parameters[parameterKey] = emptyPNGUrl();
        }
        break;
    }
  }

  return parameters;
};

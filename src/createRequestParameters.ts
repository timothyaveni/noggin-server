import { Request } from 'express';

type DocumentParameter = {
  name: string;
  // TODO: 'type' -- we probably want images to be parameters as well
  maxLength: string; // TODO: refactor this into a separate 'options' payload
  defaultValue: string;
};

type DocumentParameters = {
  [key: string]: DocumentParameter;
};

export const createRequestParameters = (
  req: Request,
  documentParameters: DocumentParameters,
) => {
  const parameters: any = {};

  // todo truncation etc
  for (const parameterKey of Object.keys(documentParameters)) {
    const parameter = documentParameters[parameterKey]; // todo: dupe params etc
    if (req.query[parameter.name]) {
      parameters[parameterKey] = req.query[parameter.name];
    } else {
      parameters[parameterKey] =
        documentParameters[parameterKey].defaultValue || '';
    }
  }

  return parameters;
};

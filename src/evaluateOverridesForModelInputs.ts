import { RequestParameters } from './createRequestParameters';
import {
  All_ModelInput_Values_for_ModelInputs,
  ModelInputs,
} from './reagent-noggin-shared/types/editorSchemaV1';
import { EvaluatedModelInputs } from './reagent-noggin-shared/types/evaluated-variables';

export function evaluateOverridesForModelInputs<T extends ModelInputs>(
  modelInputs: T,
  modelInputValues: EvaluatedModelInputs<
    All_ModelInput_Values_for_ModelInputs<T>
  >,
  requestParameters: RequestParameters,
  overridableSelections: string[],
) {
  const clonedModelInputValues: typeof modelInputValues = JSON.parse(
    JSON.stringify(modelInputValues),
  );

  for (const key of Object.keys(modelInputs)) {
    if (!overridableSelections.includes(key)) {
      // @ts-ignore
      clonedModelInputValues[key] = modelInputValues[key];
      continue;
    }

    const modelInput = modelInputs[key];
    switch (modelInput.type) {
      case 'integer':
        if (requestParameters[key] !== undefined) {
          // @ts-ignore
          clonedModelInputValues[key] = parseInt(requestParameters[key], 10);
        } else {
          // this is where we set the 'default' value -- to whatever was specified in the noggin config
          // @ts-ignore
          clonedModelInputValues[key] = modelInputValues[key];
        }
        break;
      case 'number':
        if (requestParameters[key] !== undefined) {
          // @ts-ignore
          clonedModelInputValues[key] = parseFloat(requestParameters[key]);
        } else {
          // @ts-ignore
          clonedModelInputValues[key] = modelInputValues[key];
        }
        break;
      case 'image':
        if (requestParameters[key] !== undefined) {
          // @ts-ignore
          clonedModelInputValues[key] = requestParameters[key];
        } else {
          // @ts-ignore
          clonedModelInputValues[key] = modelInputValues[key]; // here we're using the default value that (at present) is NOT making it into params, i think
        }
        break;
      case 'boolean':
        if (requestParameters[key] !== undefined) {
          // @ts-ignore
          clonedModelInputValues[key] =
            requestParameters[key] !== '' &&
            requestParameters[key] !== 'false' &&
            requestParameters[key] !== '0';
        } else {
          // @ts-ignore
          clonedModelInputValues[key] = modelInputValues[key];
        }
        break;
      case 'chat-text':
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
      case 'plain-text-with-parameters':
      case 'select':
      case 'simple-schema':
        // nothing happens if you override these. they can't be made into variables
        // @ts-ignore
        clonedModelInputValues[key] = modelInputValues[key];
        break;
      default:
        const _exhaustiveCheck: never = modelInput;
    }
  }

  return clonedModelInputValues;
}

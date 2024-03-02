import { RequestParameters } from './createRequestParameters';
import {
  DocumentVariable,
  DocumentVariables,
} from './reagent-noggin-shared/types/DocType';
import { EditorSchema } from './reagent-noggin-shared/types/editorSchema';
import {
  ModelInputValues,
  ModelInput_Boolean_Value,
  ModelInput_Image_Value,
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_Select_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
  ModelInput_Value,
  TextOrVariable,
} from './reagent-noggin-shared/types/editorSchemaV1';
import {
  EvaluatedContentChunk,
  EvaluatedModelInput_Value,
  EvaluatedModelInputs,
  EvaluatedStandardChat,
  EvaluatedTextChunk,
} from './reagent-noggin-shared/types/evaluated-variables';

export const evaluateVariablesInModelInputs = (
  modelInputValues: ModelInputValues,
  editorSchema: EditorSchema,
  documentVariables: DocumentVariables,
  // TODO: create document variables for overridden inputs
  parameters: RequestParameters,
) => {
  const partialEvaluatedModelInputValues = JSON.parse(
    JSON.stringify(modelInputValues),
  ) as typeof modelInputValues; // todo of course. just rather not do the whole thing immutable
  const evaluatedModelInputValues: EvaluatedModelInputs<
    typeof modelInputValues
  > = {};

  for (const inputKey of Object.keys(editorSchema.allEditorComponents)) {
    const input = editorSchema.allEditorComponents[inputKey];
    let thisModelInputValue: ModelInput_Value;
    switch (input.type) {
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_StandardChatWithVariables_Value;
        evaluatedModelInputValues[inputKey] = evaluateVariablesInChatText(
          thisModelInputValue,
          documentVariables,
          parameters,
        );
        break;
      case 'plain-text-with-parameters':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_PlainTextWithVariables_Value;
        evaluatedModelInputValues[inputKey] = evaluateVariablesInPlainText(
          thisModelInputValue,
          documentVariables,
          parameters,
        );
        break;
      case 'image':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_Image_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
      case 'integer':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_Integer_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'number':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_Number_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'boolean':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_Boolean_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'select':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_Select_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'simple-schema':
        thisModelInputValue = partialEvaluatedModelInputValues[
          inputKey
        ] as ModelInput_SimpleSchema_Value;
        evaluatedModelInputValues[inputKey] = thisModelInputValue; // no params just yet
        break;
      default:
        const _exhaustiveCheck: never = input;
    }
  }

  return {
    partialEvaluated: partialEvaluatedModelInputValues,
    evaluated: evaluatedModelInputValues,
  };
};

export const evaluateVariablesInChatText = (
  chatText: ModelInput_StandardChatWithVariables_Value,
  documentVariables: DocumentVariables,
  parameters: RequestParameters,
): EvaluatedModelInput_Value<ModelInput_StandardChatWithVariables_Value> => {
  const newChatText: EvaluatedStandardChat = [];

  for (const turn of chatText) {
    const contentChunks: EvaluatedContentChunk[] = [];

    const newTurn = {
      speaker: turn.speaker,
      content: contentChunks,
    };

    for (const chunk of turn.text) {
      contentChunks.push(
        evaluateAndMutateChunk(parameters, documentVariables, chunk),
      );
    }

    newChatText.push(newTurn);
  }

  return newChatText;
};

// we mutate the chunk as well as evaluating it so we can keep this link around for IO visualization rendering
function evaluateAndMutateChunk(
  parameters: RequestParameters,
  documentVariables: DocumentVariables,
  chunk: TextOrVariable,
): EvaluatedContentChunk {
  switch (chunk.type) {
    case 'text':
      return { type: 'text', text: chunk.text };
    case 'parameter':
      const documentVariableSpec: DocumentVariable =
        documentVariables[chunk.parameterId];

      switch (documentVariableSpec.type) {
        case 'text':
          const textEvaluatedValue =
            parameters[chunk.parameterId] || documentVariableSpec.defaultValue;
          chunk.evaluated = {
            variableType: 'text',
            variableName: documentVariableSpec.name,
            variableValue: {
              text: textEvaluatedValue,
            },
          };
          return {
            type: 'text',
            text: textEvaluatedValue,
          };
        case 'number':
          const numberEvaluatedValue =
            parameters[chunk.parameterId] ?? documentVariableSpec.defaultValue;
          chunk.evaluated = {
            variableType: 'number',
            variableName: documentVariableSpec.name,
            variableValue: {
              number: parseFloat(numberEvaluatedValue),
            },
          };
          return {
            type: 'text',
            text: numberEvaluatedValue,
          };
        case 'integer':
          const integerEvaluatedValue =
            parameters[chunk.parameterId] ?? documentVariableSpec.defaultValue;
          chunk.evaluated = {
            variableType: 'integer',
            variableName: documentVariableSpec.name,
            variableValue: {
              integer: parseInt(integerEvaluatedValue, 10),
            },
          };
          return {
            type: 'text',
            text: integerEvaluatedValue,
          };
        case 'image':
          const imageEvaluatedValue: {
            url: string;
            openAI_detail: 'low' | 'high' | 'auto';
          } = {
            url: parameters[chunk.parameterId] || '', // TODO: not sure i'm digging the return type of 'parameters'. also, the empty string should trigger a warning
            openAI_detail: documentVariableSpec.openAI_detail, // yeah that's not gonna work
          };
          chunk.evaluated = {
            variableType: 'image',
            variableName: documentVariableSpec.name,
            variableValue: imageEvaluatedValue,
          };
          return {
            type: 'image_url',
            image_url: imageEvaluatedValue,
          };
        default:
          // throw new Error('Unknown parameter type ' + parameter.type);
          // TODO log an error
          break;
      }
      break;
    // case 'inline-image':
    //   throw new Error('Not implemented'); // TODO
    default:
      // throw new Error('Unknown chunk type ' + chunk.type);
      // TODO log an error. we can't be throwing, it crashes the whole server... probably something we should fix anyway...
      break;
  }

  throw new Error('Unknown chunk ' + chunk);
}

export const evaluateVariablesInPlainText = (
  plainText: ModelInput_PlainTextWithVariables_Value,
  documentVariables: DocumentVariables,
  parameters: RequestParameters,
): EvaluatedModelInput_Value<ModelInput_PlainTextWithVariables_Value> => {
  const contentChunks: EvaluatedContentChunk[] = [];

  for (const chunk of plainText) {
    contentChunks.push(
      evaluateAndMutateChunk(parameters, documentVariables, chunk),
    );
  }

  if (contentChunks.some((chunk) => chunk.type !== 'text')) {
    throw new Error('Unexpected non-text chunk in plain text');
  }

  return contentChunks
    .map((chunk) => (chunk as EvaluatedTextChunk).text)
    .join('');
};

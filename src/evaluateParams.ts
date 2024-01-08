import { EditorSchema } from './reagent-noggin-shared/types/editorSchema';
import {
  ModelInput_Boolean_Value,
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_Select_Value,
  ModelInput_SimpleSchema_Value,
  ModelInput_StandardChatWithVariables_Value,
  ModelInput_Value,
} from './reagent-noggin-shared/types/editorSchemaV1';
import {
  EvaluatedContentChunk,
  EvaluatedModelInput_Value,
  EvaluatedModelInputs,
  EvaluatedStandardChat,
} from './reagent-noggin-shared/types/evaluated-variables';

export const evaluateParamsInModelInputs = (
  modelInputs: Record<string, ModelInput_Value>,
  editorSchema: EditorSchema,
  documentParameters: any,
  parameters: any,
) => {
  const evaluatedModelInputs: EvaluatedModelInputs<typeof modelInputs> = {};

  for (const inputKey of Object.keys(editorSchema.allEditorComponents)) {
    const input = editorSchema.allEditorComponents[inputKey];
    let thisModelInputValue: ModelInput_Value;
    switch (input.type) {
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
        thisModelInputValue = modelInputs[
          inputKey
        ] as ModelInput_StandardChatWithVariables_Value;
        evaluatedModelInputs[inputKey] = evaluateParamsInChatText(
          thisModelInputValue,
          documentParameters,
          parameters,
        );
        break;
      case 'plain-text-with-parameters':
        thisModelInputValue = modelInputs[
          inputKey
        ] as ModelInput_PlainTextWithVariables_Value;
        evaluatedModelInputs[inputKey] = evaluateParamsInPlainText(
          thisModelInputValue,
          documentParameters,
          parameters,
        );
        break;
      case 'integer':
        thisModelInputValue = modelInputs[inputKey] as ModelInput_Integer_Value;
        evaluatedModelInputs[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'number':
        thisModelInputValue = modelInputs[inputKey] as ModelInput_Number_Value;
        evaluatedModelInputs[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'boolean':
        thisModelInputValue = modelInputs[inputKey] as ModelInput_Boolean_Value;
        evaluatedModelInputs[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'select':
        thisModelInputValue = modelInputs[inputKey] as ModelInput_Select_Value;
        evaluatedModelInputs[inputKey] = thisModelInputValue; // no params just yet
        break;
      case 'simple-schema':
        thisModelInputValue = modelInputs[
          inputKey
        ] as ModelInput_SimpleSchema_Value;
        evaluatedModelInputs[inputKey] = thisModelInputValue; // no params just yet
        break;
      default:
        const _exhaustiveCheck: never = input;
    }
  }

  return evaluatedModelInputs;
};

export const evaluateParamsInChatText = (
  chatText: ModelInput_StandardChatWithVariables_Value,
  documentParameters: any,
  parameters: any,
): EvaluatedModelInput_Value<ModelInput_StandardChatWithVariables_Value> => {
  const newChatText: EvaluatedStandardChat = [];

  for (const turn of chatText) {
    const contentChunks: EvaluatedContentChunk[] = [];

    const newTurn = {
      speaker: turn.speaker,
      content: contentChunks,
    };

    for (const chunk of turn.text) {
      switch (chunk.type) {
        case 'text':
          contentChunks.push({ type: 'text', text: chunk.text });
          break;
        case 'parameter':
          const parameterType = documentParameters[chunk.parameterId].type;

          switch (parameterType) {
            case 'text':
              contentChunks.push({
                type: 'text',
                text:
                  parameters[chunk.parameterId] ||
                  documentParameters[chunk.parameterId].defaultValue,
              });
              break;
            case 'image':
              contentChunks.push({
                type: 'image_url',
                image_url: {
                  url: parameters[chunk.parameterId] || '', // TODO: not sure i'm digging the return type of 'parameters'. also, the empty string should trigger a warning
                  openAI_detail: 'low', // yeah that's not gonna work
                },
              });
              break;
            default:
              // throw new Error('Unknown parameter type ' + parameterType);
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
    }

    newChatText.push(newTurn);
  }

  return newChatText;
};

// TODO: dry it out
export const evaluateParamsInPlainText = (
  plainText: ModelInput_PlainTextWithVariables_Value,
  documentParameters: any,
  parameters: any,
): EvaluatedModelInput_Value<ModelInput_PlainTextWithVariables_Value> => {
  let newPlainText = '';

  // console.log('pt', plainText)
  for (const chunk of plainText) {
    switch (chunk.type) {
      case 'text':
        newPlainText += chunk.text;
        break;
      case 'parameter':
        newPlainText +=
          parameters[chunk.parameterId] ||
          documentParameters[chunk.parameterId].defaultValue;
        break;
      default:
        // @ts-expect-error this could still happen at runtime, since it's i/o
        throw new Error('Unknown chunk type ' + chunk.type); // todo but don't throw lol (see above)
    }
  }

  return newPlainText;
};

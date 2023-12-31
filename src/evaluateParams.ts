import { EditorSchema } from './reagent-noggin-shared/types/editorSchema';

export const evaluateParamsInModelInputs = (
  modelInputs: any,
  editorSchema: EditorSchema,
  documentParameters: any,
  parameters: any,
) => {
  const newModelInputs: any = {};

  for (const inputKey of Object.keys(editorSchema.allEditorComponents)) {
    const input = editorSchema.allEditorComponents[inputKey];
    switch (input.type) {
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
        newModelInputs[inputKey] = evaluateParamsInChatText(
          modelInputs[inputKey],
          documentParameters,
          parameters,
        );
        break;
      case 'plain-text-with-parameters':
        newModelInputs[inputKey] = evaluateParamsInPlainText(
          modelInputs[inputKey],
          documentParameters,
          parameters,
        );
        break;
      case 'integer':
        // TODO
        console.log(inputKey, modelInputs[inputKey]);
        break;
      case 'number':
        // TODO
        console.log(inputKey, modelInputs[inputKey]);
        break;
      case 'boolean':
        // TODO
        console.log(inputKey, modelInputs[inputKey]);
        break;
      case 'select':
        // TODO
        console.log(inputKey, modelInputs[inputKey]);
        break;
      case 'simple-schema':
        newModelInputs[inputKey] = modelInputs[inputKey]; // no params just yet
        break;
      default:
        const _exhaustiveCheck: never = input;
    }
  }

  return newModelInputs;
};

export type ContentChunk =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        openAI_detail: 'low' | 'high' | 'auto';
      };
    };

type ChatTurn = {
  speaker: 'user' | 'assistant';
  content: ContentChunk[];
};
export type StandardChat = ChatTurn[];

export const evaluateParamsInChatText = (
  chatText: any,
  documentParameters: any,
  parameters: any,
): StandardChat => {
  const newChatText: StandardChat = [];

  for (const turn of chatText) {
    const contentChunks: ContentChunk[] = [];

    const newTurn: ChatTurn = {
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
                  openAI_detail: 'high', // yeah that's not gonna work
                },
              });
              break;
            default:
              // throw new Error('Unknown parameter type ' + parameterType);
              // TODO log an error
              break;
          }
          break;
        case 'inline-image':
          throw new Error('Not implemented'); // TODO
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
  plainText: any,
  documentParameters: any,
  parameters: any,
): string => {
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
        throw new Error('Unknown chunk type ' + chunk.type);
    }
  }

  return newPlainText;
};

import { yTextToSlateElement } from '@slate-yjs/core';
import * as Y from 'yjs';
import { EditorSchema } from './reagent-noggin-shared/types/editorSchema';

// TODO sync type
export const parseModelInputs = (
  // @ts-expect-error
  modelInputsMap: Y.Map,
  editorSchema: EditorSchema,
) => {
  const parsedInputs: any = {};

  for (const inputKey of Object.keys(editorSchema.allEditorComponents)) {
    const input = editorSchema.allEditorComponents[inputKey];
    switch (input.type) {
      case 'chat-text-user-images-with-parameters':
      // throw new Error('TODO');
      case 'chat-text-with-parameters':
        parsedInputs[inputKey] = slateChatToStandardChat(
          yTextToSlateElement(modelInputsMap.get(inputKey, Y.XmlText)),
        );
        break;
      case 'plain-text-with-parameters':
        parsedInputs[inputKey] = slateTextToTextWithParameters(
          yTextToSlateElement(modelInputsMap.get(inputKey, Y.XmlText)),
        );
        break;
      case 'integer':
      case 'number':
      case 'boolean':
      case 'select':
        parsedInputs[inputKey] = modelInputsMap.get(inputKey);
        break;
      case 'simple-schema':
        parsedInputs[inputKey] = modelInputsMap.get(inputKey);
        break;
      default:
        const _exhaustiveCheck: never = input;
    }
  }

  return parsedInputs;
};

type ParameterizedTextChunk =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'parameter';
      parameterId: string;
    };
type TextWithParameters = ParameterizedTextChunk[];

type ChatTurnWithParameters = {
  speaker: 'user' | 'assistant';
  text: TextWithParameters;
};
type StandardChatWithParameters = ChatTurnWithParameters[];

const slateParagraphToTextWithParameters = (
  slateParagraph: any,
): TextWithParameters => {
  const textWithParameters: TextWithParameters = [];
  for (const child of slateParagraph.children) {
    if (child.hasOwnProperty('text')) {
      textWithParameters.push({
        type: 'text',
        text: child.text,
      });
    } else if (child.type === 'parameter') {
      textWithParameters.push({
        type: 'parameter',
        parameterId: child.parameterId,
      });
    } else {
      throw new Error(`Unexpected child type ${child.type}`);
    }
  }
  return textWithParameters;
};

// TODO type
const slateChatToStandardChat = (
  slateChat: any,
): StandardChatWithParameters => {
  const { children } = slateChat;
  const chatTurns: ChatTurnWithParameters[] = [];

  let currentChatTurn: ChatTurnWithParameters | undefined;
  for (const child of children) {
    if (child.type === 'chat-turn') {
      currentChatTurn = {
        speaker: child.speaker,
        text: [],
      };
      chatTurns.push(currentChatTurn);
    } else if (child.type === 'paragraph') {
      if (!currentChatTurn) {
        throw new Error('Expected chat turn');
      }
      currentChatTurn.text.push(...slateParagraphToTextWithParameters(child)); // really shouldn't ever have more than one in a row -- we enforce this in the editor
    }
  }

  return chatTurns;
};

const slateTextToTextWithParameters = (slateText: any): TextWithParameters => {
  return slateParagraphToTextWithParameters(slateText.children[0]);
};

import { yTextToSlateElement } from '@slate-yjs/core';
import * as Y from 'yjs';
import { EditorSchema } from './reagent-noggin-shared/types/editorSchema';
import {
  ChatTurnWithVariables,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_StandardChatWithVariables_Value,
} from './reagent-noggin-shared/types/editorSchemaV1';

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
      case 'chat-text-with-parameters':
        parsedInputs[inputKey] = slateChatToStandardChat(
          yTextToSlateElement(modelInputsMap.get(inputKey, Y.XmlText)),
        );
        break;
      case 'plain-text-with-parameters':
        parsedInputs[inputKey] = slateTextToTextWithVariables(
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

const slateParagraphToTextWithVariables = (
  slateParagraph: any,
): ModelInput_PlainTextWithVariables_Value => {
  const textWithVariables: ModelInput_PlainTextWithVariables_Value = [];
  for (const child of slateParagraph.children) {
    if (child.hasOwnProperty('text')) {
      textWithVariables.push({
        type: 'text',
        text: child.text,
      });
    } else if (child.type === 'parameter') {
      textWithVariables.push({
        type: 'parameter',
        parameterId: child.parameterId,
      });
    } else {
      throw new Error(`Unexpected child type ${child.type}`);
    }
  }
  return textWithVariables;
};

// TODO type
const slateChatToStandardChat = (
  slateChat: any,
): ModelInput_StandardChatWithVariables_Value => {
  const { children } = slateChat;
  const chatTurns: ChatTurnWithVariables[] = [];

  let currentChatTurn: ChatTurnWithVariables | undefined;
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
      currentChatTurn.text.push(...slateParagraphToTextWithVariables(child)); // really shouldn't ever have more than one in a row -- we enforce this in the editor
    }
  }

  return chatTurns;
};

const slateTextToTextWithVariables = (
  slateText: any,
): ModelInput_PlainTextWithVariables_Value => {
  return slateParagraphToTextWithVariables(slateText.children[0]);
};

export const evaluateParamsInModelInputs = (
  modelInputs: any,
  editorSchema: any,
  documentParameters: any,
  parameters: any,
) => {
  const newModelInputs: any = {};

  for (const inputKey of Object.keys(editorSchema.allInputs)) {
    const input = editorSchema.allInputs[inputKey];
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
    }
  }

  return newModelInputs;
};

type ChatTurn = {
  speaker: 'user' | 'assistant';
  text: string;
};
export type StandardChat = ChatTurn[];

export const evaluateParamsInChatText = (
  chatText: any,
  documentParameters: any,
  parameters: any,
): StandardChat => {
  const newChatText: StandardChat = [];

  for (const turn of chatText) {
    const newTurn = {
      speaker: turn.speaker,
      text: '',
    };

    // console.log('t', turn)

    for (const chunk of turn.text) {
      switch (chunk.type) {
        case 'text':
          newTurn.text += chunk.text;
          break;
        case 'parameter':
          newTurn.text +=
            parameters[chunk.parameterId] ||
            documentParameters[chunk.parameterId].defaultValue;
          break;
        default:
          throw new Error('Unknown chunk type ' + chunk.type);
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

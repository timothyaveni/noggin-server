import {
  IOVisualizationChatTextTurn,
  IOVisualizationComponent_ElementWithTitle,
  IOVisualizationElement_HyperText,
  IOVisualizationHyperTextElement_EvaluatedVariable,
  IOVisualizationHyperTextElement_Text,
  IOVisualizationRender,
} from './reagent-noggin-shared/io-visualization-types/IOVisualizationRender';
import {
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_StandardChatWithVariables_Value,
} from './reagent-noggin-shared/types/editorSchemaV1';

const createHypertextFromTextWithVariables = (
  hypertext: ModelInput_PlainTextWithVariables_Value,
): IOVisualizationElement_HyperText => {
  return {
    type: 'hypertext',
    children: hypertext.map((text) => {
      if (text.type === 'text') {
        return {
          type: 'text',
          text: text.text,
        } as IOVisualizationHyperTextElement_Text;
      } else if (text.type === 'parameter') {
        if (text.evaluated!.variableType === 'text') {
          return {
            type: 'variable',
            variableName: text.evaluated!.variableName,
            variableEvaluatedValue: {
              type: 'text',
              text: text.evaluated!.variableValue.text,
            },
            variableEvaluationNotes: [],
          } as IOVisualizationHyperTextElement_EvaluatedVariable;
        } else if (text.evaluated!.variableType === 'number') {
          return {
            type: 'variable',
            variableName: text.evaluated!.variableName,
            variableEvaluatedValue: {
              type: 'text',
              text: text.evaluated!.variableValue.number.toString(),
            },
            variableEvaluationNotes: [],
          };
        } else if (text.evaluated!.variableType === 'integer') {
          return {
            type: 'variable',
            variableName: text.evaluated!.variableName,
            variableEvaluatedValue: {
              type: 'text',
              text: text.evaluated!.variableValue.integer.toString(),
            },
            variableEvaluationNotes: [],
          };
        } else if (text.evaluated!.variableType === 'boolean') {
          return {
            type: 'variable',
            variableName: text.evaluated!.variableName,
            variableEvaluatedValue: {
              type: 'text',
              text: text.evaluated!.variableValue.boolean.toString(),
            },
            variableEvaluationNotes: [],
          };
        } else if (text.evaluated!.variableType === 'image') {
          return {
            type: 'variable',
            variableName: text.evaluated!.variableName,
            variableEvaluatedValue: {
              type: 'asset',
              url: text.evaluated!.variableValue.url,
              // todo show detail level as well
              mimeType: 'image/png', // TODO
            },
            variableEvaluationNotes: [],
          };
        } else {
          const _exhaustiveCheck: never = text.evaluated;
          throw new Error('unknown variable type'); // TODO we really need to be handling throws better
        }
      } else {
        const _exhaustiveCheck: never = text;
        throw new Error('unknown turn content type');
      }
    }),
  };
};

// TODO: add system prompt. this will vary between openai and anthropic
export const createIOVisualizationForChatTextModel = (
  chatPrompt: ModelInput_StandardChatWithVariables_Value,
): IOVisualizationRender => {
  return {
    version: '1',
    payload: {
      primaryView: [
        {
          type: 'chat text',
          turns: [
            ...chatPrompt.map(
              (turn): IOVisualizationChatTextTurn => ({
                speaker: turn.speaker,
                content: [createHypertextFromTextWithVariables(turn.text)],
              }),
            ),
            {
              speaker: 'assistant',
              content: [
                {
                  type: 'response void',
                },
              ],
            },
          ],
        },
      ],
      secondaryView: [],
    },
  };
};

export const createIOVisualizationForImageOutputModel = (
  prompt: ModelInput_PlainTextWithVariables_Value,
  negativePrompt?: ModelInput_PlainTextWithVariables_Value,
): IOVisualizationRender => {
  const hasNegativePrompt =
    negativePrompt !== undefined &&
    negativePrompt.length > 0 &&
    !(negativePrompt[0].type === 'text' && negativePrompt[0].text === '');

  return {
    version: '1',
    payload: {
      primaryView: [
        {
          type: 'element with title',
          title: {
            en_US: 'Prompt',
          },
          content: [createHypertextFromTextWithVariables(prompt)],
        },
        ...(hasNegativePrompt
          ? [
              {
                type: 'element with title',
                title: {
                  en_US: 'Negative Prompt',
                },
                content: [createHypertextFromTextWithVariables(negativePrompt)],
              } as IOVisualizationComponent_ElementWithTitle,
            ]
          : []),
        {
          type: 'raw element',
          content: [
            {
              type: 'response void',
            },
          ],
        },
      ],
      secondaryView: [],
    },
  };
};

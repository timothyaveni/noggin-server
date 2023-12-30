import { EditorSchema } from '../../types/editorSchema';

const schema: EditorSchema = {
  schemaVersion: '1',
  allEditorComponents: {
    prompt: {
      name: {
        en_US: 'Prompt',
      },
      description: {
        en_US:
          'You can use the system prompt to give general instructions to the model independent of the specific chat prompt. For example, the system prompt is often used to ask the model to respond politely and factually. Some models pay little attention to the system prompt and should be instructed primarily in the chat prompt.',
      },
      type: 'plain-text-with-parameters',
    },
  },

  modelInputComponents: ['prompt'],

  modelParameterComponents: [],

  outputFormats: [
    {
      type: 'completion',
      description: {
        en_US: 'This model will output freeform text.',
      },
      editorComponents: [],
    },
  ],
};

export default schema;

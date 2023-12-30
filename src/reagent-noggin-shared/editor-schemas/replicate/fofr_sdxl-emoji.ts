import { EditorSchema } from '../../types/editorSchema';

const schema: EditorSchema = {
  schemaVersion: '1',
  allEditorComponents: {
    prompt: {
      name: {
        en_US: 'Prompt',
      },
      description: {
        en_US: '',
      },
      type: 'plain-text-with-parameters',
    },
    'negative-prompt': {
      name: {
        en_US: 'Negative prompt',
      },
      description: {
        en_US: '',
      },
      type: 'plain-text-with-parameters',
    },

    width: {
      name: {
        en_US: 'Width',
      },
      description: {
        en_US: 'Width of the generated image',
      },
      type: 'integer',
      default: 1024,
      min: 1,
      max: 4096,
    },
    height: {
      name: {
        en_US: 'Height',
      },
      description: {
        en_US: 'Height of the generated image',
      },
      type: 'number',
      default: 1024,
      min: 1,
      max: 4096,
    },
  },

  modelInputComponents: ['prompt', 'negative-prompt'],

  modelParameterComponents: [],

  outputFormats: [
    {
      type: 'image',
      description: {
        en_US: 'This model will output a single image file.',
      },
      editorComponents: ['width', 'height'],
    },
  ],
};

export default schema;
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

  modelInputComponents: ['prompt'],

  modelParameterComponents: [],

  outputFormats: [
    {
      type: 'image',
      key: 'image',
      name: {
        en_US: 'Image',
      },
      description: {
        en_US: 'This model will output a single image file.',
      },
      editorComponents: ['width', 'height'],
    },
  ],
};

export default schema;

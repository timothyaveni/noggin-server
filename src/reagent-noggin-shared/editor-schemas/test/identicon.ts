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

    size: {
      name: {
        en_US: 'Size',
      },
      description: {
        en_US: 'Width and height of the generated image',
      },
      type: 'integer',
      default: 512,
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
      editorComponents: ['size'],
    },
  ],
};

export default schema;

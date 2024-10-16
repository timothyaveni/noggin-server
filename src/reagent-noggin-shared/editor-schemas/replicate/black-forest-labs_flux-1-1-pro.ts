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

    // TODO: maybe use that 'aspect ratio' parameter
    width: {
      name: {
        en_US: 'Width',
      },
      description: {
        en_US: 'Width of the generated image',
      },
      type: 'integer',
      default: 1024,
      min: 256,
      max: 1440,
    },
    height: {
      name: {
        en_US: 'Height',
      },
      description: {
        en_US: 'Height of the generated image',
      },
      type: 'integer',
      default: 1024,
      min: 256,
      max: 1440,
    },
    prompt_upsampling: {
      name: {
        en_US: 'Prompt upsampling',
      },
      description: {
        en_US:
          'Whether to perform upsampling on the prompt. If active, automatically modifies the prompt for more creative generation.',
      },
      type: 'boolean',
      default: true,
    },
  },

  modelInputComponents: ['prompt'],

  modelParameterComponents: ['prompt_upsampling'],

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

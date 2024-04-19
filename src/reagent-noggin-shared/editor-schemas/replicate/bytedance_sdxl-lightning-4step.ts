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
      max: 1280,
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
      min: 1,
      max: 1280,
    },
    'inference-steps': {
      name: {
        en_US: 'Inference steps',
      },
      description: {
        en_US:
          'Number of "denoising" steps in the diffusion process. For this model, 4 is a common starting point. Cost is approximately proportional to this value.',
      },
      type: 'integer',
      default: 4,
      min: 1,
      max: 10,
    },
    'guidance-scale': {
      name: {
        en_US: 'Guidance scale',
      },
      description: {
        en_US:
          'How closely the image should adhere to the text prompt. Different from other models... a value above 1 approaches nightmarish. Maybe stick with 0 or near 0.',
      },
      type: 'number',
      default: 0,
      min: 0,
      max: 2,
    },
  },

  modelInputComponents: ['prompt', 'negative-prompt'],

  modelParameterComponents: ['inference-steps', 'guidance-scale'],

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

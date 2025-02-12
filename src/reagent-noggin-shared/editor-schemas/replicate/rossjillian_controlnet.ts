import { EditorSchema } from '../../types/editorSchema';

const schema: EditorSchema = {
  schemaVersion: '1',
  allEditorComponents: {
    image: {
      name: {
        en_US: 'Image',
      },
      description: {
        en_US:
          'This model takes a single image, then generates a new image conditioned on the input.',
      },
      type: 'image',
    },
    prompt: {
      name: {
        en_US: 'Prompt',
      },
      description: {
        en_US: 'Text prompt to condition image generation.',
      },
      type: 'plain-text-with-parameters',
    },
    negative_prompt: {
      name: {
        en_US: 'Negative prompt',
      },
      description: {
        en_US: 'Negative prompt to condition image generation.',
      },
      type: 'plain-text-with-parameters',
    },
    structure: {
      name: {
        en_US: 'Input condition type',
      },
      description: {
        en_US: 'The type of conditioning provided by the input image.',
      },
      type: 'select',
      options: {
        canny: {
          en_US: 'John Canny ✨',
        },
        depth: {
          en_US: 'depth',
        },
        hed: {
          en_US: 'hed',
        },
        hough: {
          en_US: 'hough',
        },
        normal: {
          en_US: 'normal',
        },
        pose: {
          en_US: 'pose',
        },
        scribble: {
          en_US: 'scribble',
        },
        seg: {
          en_US: 'seg',
        },
      },
      default: 'scribble',
      multiple: false,
    },
    image_resolution: {
      name: {
        en_US: 'Image resolution',
      },
      description: {
        en_US: 'Resolution of the generated image.',
      },
      type: 'select',
      options: {
        '256': {
          en_US: '256',
        },
        '512': {
          en_US: '512',
        },
        '768': {
          en_US: '768',
        },
      },
      default: '512',
      multiple: false,
    },
    scheduler: {
      name: {
        en_US: 'Scheduler',
      },
      description: {
        en_US: 'Scheduler for the model.',
      },
      type: 'select',
      options: {
        DDIM: {
          en_US: 'DDIM',
        },
        DPMSolverMultistep: {
          en_US: 'DPMSolverMultistep',
        },
        HeunDiscrete: {
          en_US: 'HeunDiscrete',
        },
        K_EULER_ANCESTRAL: {
          en_US: 'K_EULER_ANCESTRAL',
        },
        K_EULER: {
          en_US: 'K_EULER',
        },
        KLMS: {
          en_US: 'KLMS',
        },
        PNDM: {
          en_US: 'PNDM',
        },
        UniPCMultistep: {
          en_US: 'UniPCMultistep',
        },
      },
      default: 'DDIM',
      multiple: false,
    },
    steps: {
      name: {
        en_US: 'Steps',
      },
      description: {
        en_US: 'Number of steps for the model.',
      },
      type: 'integer',
      default: 20,
      min: 1,
      max: 100,
    },
    scale: {
      name: {
        en_US: 'CFG Scale',
      },
      description: {
        en_US: 'Classifier-free guidance scale.',
      },
      type: 'number',
      default: 9,
      min: 0.1,
      max: 30,
    },
    // todo: seed
    eta: {
      name: {
        en_US: 'eta',
      },
      description: {
        en_US: 'Adds noise to the input data during diffusion.',
      },
      type: 'number',
      default: 0,
      min: 0,
      max: 1.0,
    },
    canny_low_threshold: {
      name: {
        en_US: '[Canny] Low threshold',
      },
      description: {
        en_US: 'Low threshold for John Canny ✨ edge detector.',
      },
      type: 'integer',
      default: 100,
      min: 1,
      max: 255,
    },
    canny_high_threshold: {
      name: {
        en_US: '[Canny] High threshold',
      },
      description: {
        en_US: 'High threshold for John Canny ✨ edge detector.',
      },
      type: 'integer',
      default: 200,
      min: 1,
      max: 255,
    },
  },

  modelInputComponents: ['image', 'prompt', 'negative_prompt'],

  modelParameterComponents: [
    'structure',
    'scheduler',
    'steps',
    'scale',
    'eta',
    'canny_low_threshold',
    'canny_high_threshold',
  ],

  outputFormats: [
    {
      type: 'image',
      key: 'image',
      name: {
        en_US: 'Image',
      },
      description: {
        en_US:
          'This model will output an image that is conditioned on the input image and prompt. See the [ControlNet paper](https://arxiv.org/abs/2302.05543).',
      },
      editorComponents: ['image_resolution'],
    },
  ],
};

export default schema;

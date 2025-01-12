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
          'This model takes a single image, then determines a text prompt that matches that particular image.',
      },
      type: 'image',
    },
    clip_model_name: {
      name: {
        en_US: 'CLIP model name',
      },
      description: {
        en_US:
          'Which CLIP embedding model should this model try to match a prompt for?',
      },
      type: 'select',
      options: {
        'ViT-L-14/openai': {
          en_US: 'ViT-L-14/openai (good for Stable Diffusion 1)',
        },
        'ViT-H-14/laion2b_s32b_b79k': {
          en_US: 'ViT-H-14/laion2b_s32b_b79k (good for Stable Diffusion 2)',
        },
        'ViT-bigG-14/laion2b_s39b_b160k': {
          en_US:
            'ViT-bigG-14/laion2b_s39b_b160k (good for Stable Diffusion XL)',
        },
      },
      default: 'ViT-L-14/openai',
      multiple: false,
    },
    mode: {
      name: {
        en_US: 'Mode',
      },
      description: {
        en_US: 'Prompt mode (best takes 10-20 seconds, fast takes 1-2 seconds)',
      },
      type: 'select',
      options: {
        best: {
          en_US: 'best',
        },
        fast: {
          en_US: 'fast',
        },
        classic: {
          en_US: 'classic',
        },
        negative: {
          en_US: 'negative',
        },
      },
      default: 'fast',
      multiple: false,
    },
  },

  modelInputComponents: ['image'],

  modelParameterComponents: ['clip_model_name', 'mode'],

  outputFormats: [
    {
      type: 'completion',
      key: 'completion',
      name: {
        en_US: 'Freeform text (image prompt)',
      },
      description: {
        en_US:
          'This model will output a prompt that matches the input image. You can try using it in a text-to-image model to generate similar images.',
      },
      editorComponents: [],
    },
  ],
};

export default schema;

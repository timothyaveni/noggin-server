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
    num_inference_steps: {
      name: {
        en_US: 'Number of inference steps',
      },
      description: {
        en_US:
          'Number of inference steps to run. More steps increases quality but takes longer to run.',
      },
      type: 'integer',
      default: 4,
      min: 1,
      max: 4,
    },
    go_fast: {
      name: {
        en_US: 'Go fast',
      },
      description: {
        en_US:
          'Run a quantized version of the model (fp8 instead of bf16) to increase speed.',
      },
      type: 'boolean',
      default: true,
    },
  },

  modelInputComponents: ['prompt'],

  modelParameterComponents: ['num_inference_steps', 'go_fast'],

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
      editorComponents: [],
    },
  ],
};

export default schema;

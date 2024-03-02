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
          'This model takes a single image alongside the text prompt, taking the image into account when responding to the prompt.',
      },
      type: 'image',
    },
    prompt: {
      name: {
        en_US: 'Prompt',
      },
      description: {
        en_US: 'The prompt is the main textual input to the model.',
      },
      type: 'plain-text-with-parameters',
      editorHeight: 'primary',
    },
    temperature: {
      name: {
        en_US: 'Temperature',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0.4,
      min: 0,
      max: 2,
    },
    'top-p': {
      name: {
        en_US: 'Top P',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0.95,
      min: 0,
      max: 1,
    },
    'maximum-completion-length': {
      name: {
        en_US: 'Maximum response length (tokens)',
      },
      description: {
        en_US:
          'How many tokens should the model be permitted to respond? It may respond with fewer tokens, but not more than this number.\n\nEach **token** typically represents a word or subword, averaging about four tokens for every three English words. Some text, like symbol-heavy text or text in other languages, requires on average more tokens per character. This is model-dependent.',
      },
      type: 'integer',
      default: 512,
      min: 1,
      max: 4096,
    },
  },

  modelInputComponents: ['image', 'prompt'],

  modelParameterComponents: ['temperature', 'top-p'],

  outputFormats: [
    {
      type: 'chat-text',
      key: 'chat-text',
      name: {
        en_US: 'Freeform text (chat response)',
      },
      description: {
        en_US:
          'This model will output freeform text. The model has been trained to output a "response" to the input prompt, and the model responds well to direct instructions.',
      },
      editorComponents: ['maximum-completion-length'],
    },
  ],
};

export default schema;

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
          'The prompt is the main textual input to the model. Since this is not a chat model, the response will be a continuation of the input prompt (rather than a "response" to the prompt).',
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
      default: 0.2,
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
      default: 1,
      min: 0,
      max: 1,
    },
    'top-k': {
      name: {
        en_US: 'Top K',
      },
      description: {
        en_US:
          'When choosing an output token, the model will only consider the top K most likely tokens. This can help prevent the model from outputting unlikely or nonsensical tokens.',
      },
      type: 'integer',
      default: 0,
      min: 0,
      max: 10000,
    },
    'frequency-penalty': {
      name: {
        en_US: 'Frequency penalty',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0.2,
      min: -2,
      max: 2,
    },
    'presence-penalty': {
      name: {
        en_US: 'Presence penalty',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 1.15,
      min: -2,
      max: 2,
    },
    'minimum-completion-length': {
      name: {
        en_US: 'Minimum response length (tokens)',
      },
      description: {
        en_US:
          'How many tokens should the model be required to respond with? It may respond with more tokens, but not fewer than this number.\n\nEach **token** typically represents a word or subword, averaging about four tokens for every three English words. Some text, like symbol-heavy text or text in other languages, requires on average more tokens per character. This is model-dependent.',
      },
      type: 'integer',
      default: 1,
      min: 1,
      max: 8000,
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
      max: 8000,
    },
  },

  modelInputComponents: ['prompt'],

  modelParameterComponents: [
    'temperature',
    'top-p',
    'top-k',
    'frequency-penalty',
    'presence-penalty',
  ],

  outputFormats: [
    {
      type: 'completion',
      key: 'completion',
      name: {
        en_US: 'Freeform text (completion)',
      },
      description: {
        en_US:
          "This model will output freeform text. Because it is a base model, it completes the prompt rather than responding to it. The model may not respond well to instructions; it's better to provide a prompt for which a natural completion would be a useful response.",
      },
      editorComponents: [
        'minimum-completion-length',
        'maximum-completion-length',
      ],
    },
  ],
};

export default schema;

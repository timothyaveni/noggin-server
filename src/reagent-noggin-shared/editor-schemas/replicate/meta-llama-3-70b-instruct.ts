import { EditorSchema } from '../../types/editorSchema';

const schema: EditorSchema = {
  schemaVersion: '1',
  allEditorComponents: {
    'system-prompt': {
      name: {
        en_US: 'System prompt',
      },
      description: {
        en_US:
          'You can use the system prompt to give general instructions to the model independent of the specific chat prompt. For example, the system prompt is often used to ask the model to respond politely and factually.',
      },
      type: 'plain-text-with-parameters',
      default: 'You are a helpful assistant.',
    },
    'chat-prompt': {
      name: {
        en_US: 'Chat prompt',
      },
      description: {
        en_US:
          'The chat prompt is the main input to the model. It can contain instructions, information, and relevant prior context.\n\nTypically, the last item in a prompt is a &ldquo;User&rdquo; section, representing the current query. The model will always respond with an &ldquo;Assistant&rdquo; section.\n\nEven if you are not building a chatbot, you can use the chat format to delineate &rdquo;turns&ldquo; taken by the system. &ldquo;User&rdquo; sections do not need to be formatted as natural-language questions.\n\nMany of the highest-quality large language models are available only in chat format, so it can be valuable to use chat prompts even if your prompt only ever consists of a single &ldquo;User&rdquo; turn.',
      },
      type: 'chat-text-with-parameters',
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

  modelInputComponents: ['system-prompt', 'chat-prompt'],

  modelParameterComponents: [
    'temperature',
    'top-p',
    'top-k',
    'frequency-penalty',
    'presence-penalty',
  ],

  outputFormats: [
    {
      type: 'chat-text',
      key: 'chat-text',
      name: {
        en_US: 'Freeform text (chat response)',
      },
      description: {
        en_US:
          'This model will output freeform text. Because it is a chat model, it has been trained to output a "response" to the chat input prompt, and the model responds well to direct instructions.',
      },
      editorComponents: [
        'minimum-completion-length',
        'maximum-completion-length',
      ],
    },
  ],
};

export default schema;

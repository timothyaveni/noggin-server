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
          'You can use the system prompt to give general instructions to the model independent of the specific chat prompt. For example, the system prompt is often used to ask the model to respond politely and factually. Some models pay little attention to the system prompt and should be instructed primarily in the chat prompt.',
      },
      type: 'plain-text-with-parameters',
    },
    'chat-prompt': {
      name: {
        en_US: 'Chat prompt',
      },
      description: {
        en_US:
          'The chat prompt is the main input to the model. It can contain instructions, information, and relevant prior context.\n\nTypically, the last item in a prompt is a &ldquo;User&rdquo; section, representing the current query. The model will always respond with an &ldquo;Assistant&rdquo; section.\n\nEven if you are not building a chatbot, you can use the chat format to delineate &rdquo;turns&ldquo; taken by the system. &ldquo;User&rdquo; sections do not need to be formatted as natural-language questions.\n\nMany of the highest-quality large language models are available only in chat format, so it can be valuable to use chat prompts even if your prompt only ever consists of a single &ldquo;User&rdquo; turn.',
      },
      type: 'chat-text',
      chatTextCapabilities: {
        images: false,
        messageTypes: ['user', 'assistant'],
        variables: true,
      },
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
      default: 0.6,
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
    'top-k': {
      name: {
        en_US: 'Top K',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 40,
      min: 0,
      max: 100,
    },
    'min-p': {
      name: {
        en_US: 'Min P',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0.05,
      min: 0,
      max: 1,
    },
    'frequency-penalty': {
      name: {
        en_US: 'Frequency penalty',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0,
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
      default: 0,
      min: -2,
      max: 2,
    },
    'repetition-penalty': {
      name: {
        en_US: 'Repetition penalty',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 1.1,
      min: -2,
      max: 2,
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

  modelInputComponents: ['system-prompt', 'chat-prompt'],

  modelParameterComponents: [
    'temperature',
    'top-p',
    'min-p',
    'top-k',
    'frequency-penalty',
    'presence-penalty',
    'repetition-penalty',
  ],

  outputFormats: [
    {
      type: 'chat-text',
      key: 'chat-text',
      name: {
        en_US: 'Freeform text with thought (chat response)',
      },
      description: {
        en_US:
          'This model will output freeform text. Because it is a chat model, it has been trained to output a "response" to the chat input prompt, and the model responds well to direct instructions.\n\nThe model will include a &lt;think&gt; section before providing a response.',
      },
      editorComponents: ['maximum-completion-length'],
    },
    // hmm, i was thinking i'd do a 'suppressed thought' one, but then it's not being logged anywhere in the ui... i mean, i guess it'd end up in log calls... maybe later
    // {
    //   type: 'json',
    //   key: 'json',
    //   name: {
    //     en_US: 'Freeform JSON',
    //   },
    //   description: {
    //     en_US:
    //       "The model will output valid, parseable JSON. The output is not guaranteed to conform to any particular structure, so you should be clear in your prompt about what you'd like the model to output.\n\n```warn\nYou should explicitly instruct the model to output JSON in your prompt, or it may output only whitespace tokens.\n```",
    //   },
    //   editorComponents: [],
    // },
    // {
    //   type: 'structured-data',
    //   key: 'structured-data',
    //   name: {
    //     en_US: 'Structured data',
    //   },
    //   description: {
    //     en_US:
    //       "The model will output structured data in a format you specify. The model will be informed of the requested structure automatically in the prompt.\n\n```warn\nAlthough this model was trained to adhere to the provided schema, its output may not always match your requested structure perfectly.\n\nIn our observations, the model's outputs consistently have some structure but sometimes include additional unrequested output or omit requested data (even providing an empty response completely). In your prompt, you should **insist** that the model provide a response.\n```",
    //   },
    //   editorComponents: ['output-structure'],
    // },
  ],
};

export default schema;

import { EditorSchema } from '../../types/editorSchema';

const schema: EditorSchema = {
  schemaVersion: '1',
  allEditorComponents: {
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
      default: 0.8,
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
    'frequency-penalty': {
      name: {
        en_US: 'Frequency penalty',
      },
      description: {
        en_US: '',
      },
      type: 'number',
      default: 0,
      min: 0,
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
      min: 0,
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
    'output-structure': {
      name: {
        en_US: 'Output structure',
      },
      description: {
        en_US: '',
      },
      type: 'simple-schema',
      includeOutputTransformations: true, // actually, maybe this SHOULD be a separate component -- it'd be handy for reformatting free-form JSON output
      default: {
        // $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'string',
      },
    },
    // todo: ['stop-sequences'],
  },

  modelInputComponents: ['chat-prompt'],

  modelParameterComponents: [
    'temperature',
    'top-p',
    'frequency-penalty',
    'presence-penalty',
  ],

  outputFormats: [
    {
      type: 'structured-data',
      key: 'structured-data',
      name: {
        en_US: 'Structured data',
      },
      description: {
        en_US:
          'The model will output structured data in a format you specify. The model will be **required** to provide an output matching the requested structure. In addition to configuring the output structure in this section, you should also **inform the model of your requested structure** in the prompt for best performance.',
      },
      editorComponents: ['output-structure', 'maximum-completion-length'],
    },
  ],
};

export default schema;

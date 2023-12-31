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
          'The chat prompt is the main input to the model. It can contain instructions, information, and relevant prior context.\\n\\nTypically, the last item in a prompt is a &ldquo;User&rdquo; section, representing the current query. The model will always respond with an &ldquo;Assistant&rdquo; section.\\n\\nEven if you are not building a chatbot, you can use the chat format to delineate &rdquo;turns&ldquo; taken by the system. &ldquo;User&rdquo; sections do not need to be formatted as natural-language questions.\\n\\nMany of the highest-quality large language models are available only in chat format, so it can be valuable to use chat prompts even if your prompt only ever consists of a single &ldquo;User&rdquo; turn.',
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
      default: 1,
      min: 0,
      max: 2,
    },
    'maximum-completion-length': {
      name: {
        en_US: 'Maximum response length',
      },
      description: {
        en_US: '',
      },
      type: 'integer',
      default: 512,
      min: 1,
      max: 16384,
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
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'string',
      },
    },
    // todo: ['stop-sequences', 'top-p', 'frequency-penalty', 'presence-penalty'],
  },

  modelInputComponents: ['system-prompt', 'chat-prompt'],

  modelParameterComponents: ['temperature'],

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
      editorComponents: ['maximum-completion-length'],
    },
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
    {
      type: 'structured-data',
      key: 'structured-data',
      name: {
        en_US: 'Structured data',
      },
      description: {
        en_US:
          "The model will output structured data in a format you specify. For this particular model, the requested structure will be automatically included in the model's prompt.\n\n```warn\nThis model's JSON output may not always match your requested structure perfectly (e.g. it may hallucinate parameters you did not ask for).\n```",
      },
      editorComponents: ['output-structure'],
    },
  ],
};

export default schema;

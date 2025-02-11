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
          'The chat prompt is the main input to the model. It can contain instructions, information, and relevant prior context.\n\nThis model supports a &ldquo;Developer&rdquo; message type, which contains instructions that should be followed regardless of the user&lsquo;s query. Typically, the last item in a prompt is a &ldquo;User&rdquo; section, representing the current query from the user. The model will always respond with an &ldquo;Assistant&rdquo; section.\n\nEven if you are not building a chatbot, you can use the chat format to delineate &rdquo;turns&ldquo; taken by the system.',
      },
      type: 'chat-text',
      chatTextCapabilities: {
        variables: true,
        messageTypes: ['user', 'assistant', 'developer'],
        images: false,
      },
      editorHeight: 'primary',
    },
    'reasoning-effort': {
      name: {
        en_US: 'Reasoning effort',
      },
      description: {
        en_US:
          'Signals reasoning effort to the model. Lower values can result in the model responding faster and costing less.',
      },
      type: 'select',
      options: {
        low: {
          en_US: 'Low',
        },
        medium: {
          en_US: 'Medium',
        },
        high: {
          en_US: 'High',
        },
      },
      default: 'medium',
      multiple: false,
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
  },

  modelInputComponents: ['chat-prompt'],

  modelParameterComponents: ['reasoning-effort'],

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
      editorComponents: [],
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
          "The model will output structured data in a format you specify. The model will be informed of the requested structure automatically in the prompt.\n\n```warn\nAlthough this model was trained to adhere to the provided schema, its output may not always match your requested structure perfectly.\n\nIn our observations, the model's outputs consistently have some structure but sometimes include additional unrequested output or omit requested data (even providing an empty response completely). In your prompt, you should **insist** that the model provide a response.\n```",
      },
      editorComponents: ['output-structure'],
    },
  ],
};

export default schema;

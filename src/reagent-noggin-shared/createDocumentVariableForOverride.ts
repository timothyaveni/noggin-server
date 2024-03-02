import { DocumentVariable } from './types/DocType';
import { EditorSchema } from './types/editorSchema';

export const overridableModelInputTypes = {
  'chat-text-user-images-with-parameters': false,
  'chat-text-with-parameters': false,
  'plain-text-with-parameters': false,
  'simple-schema': false,

  integer: true,
  number: true,

  // for now:
  boolean: false,
  select: false,
};

export const overridableModelInputTypeMap: {
  [key: string]: 'integer' | 'number' | null;
} = {
  'chat-text-user-images-with-parameters': null,
  'chat-text-with-parameters': null,
  'plain-text-with-parameters': null,
  'simple-schema': null,

  integer: 'integer',
  number: 'number',

  boolean: null,
  select: null,
};

export const createDocumentVariableForOverride = (
  overrideKey: string,
  defaultValue: any,
  editorSchema: EditorSchema,
): { id: string; variable: DocumentVariable } => {
  // const [defaultValue] = useInputValueState(overrideKey);

  const variableType =
    overridableModelInputTypeMap[
      editorSchema.allEditorComponents[overrideKey].type
    ]!;

  switch (variableType) {
    case 'integer':
      return {
        id: overrideKey, // this is a little awkward, but should be okay to rely on no dupes. id is used downstream for editing
        variable: {
          name: overrideKey,
          type: 'integer',
          defaultValue,
        },
      };
    case 'number':
      return {
        id: overrideKey,
        variable: {
          name: overrideKey,
          type: 'number',
          defaultValue,
        },
      };
    default:
      const _exhaustiveCheck: never = variableType;
  }

  throw new Error('unreachable?');
};

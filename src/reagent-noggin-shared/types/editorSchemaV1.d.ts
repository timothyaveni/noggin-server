export type I18nString = {
  en_US: string;
  [languageCode: string]: string;
};

type ModelInputBase = {
  name: I18nString;
  description: I18nString;
};

type EditorHeight = 'primary' | 'default';

interface ModelInput_PlainTextWithParameters extends ModelInputBase {
  type: 'plain-text-with-parameters';
  editorHeight?: EditorHeight;
  default?: string;
}

interface ModelInput_ChatTextUserImagesWithParameters extends ModelInputBase {
  type: 'chat-text-user-images-with-parameters';
  editorHeight?: EditorHeight;
}

interface ModelInput_ChatTextWithParameters extends ModelInputBase {
  type: 'chat-text-with-parameters';
  editorHeight?: EditorHeight;
}

interface ModelInput_Number extends ModelInputBase {
  type: 'number';
  default: number;
  min: number;
  max: number;
}

interface ModelInput_Integer extends ModelInputBase {
  type: 'integer';
  default: number;
  min: number;
  max: number;
}

interface ModelInput_Boolean extends ModelInputBase {
  type: 'boolean';
  default: boolean;
}

interface ModelInput_Select extends ModelInputBase {
  type: 'select';
  options: {
    [optionKey: string]: I18nString;
  };
  default: string;
  multiple: boolean;
}

interface ModelInput_SimpleSchema extends ModelInputBase {
  type: 'simple-schema';
  includeOutputTransformations: boolean;
}

export type ModelInput =
  | ModelInput_PlainTextWithParameters
  | ModelInput_ChatTextUserImagesWithParameters
  | ModelInput_ChatTextWithParameters
  | ModelInput_Number
  | ModelInput_Integer
  | ModelInput_Boolean
  | ModelInput_Select
  | ModelInput_SimpleSchema;

type OutputFormat = {
  type: 'chat-text' | 'completion' | 'image' | 'structured-data';
  description: I18nString;
  editorComponents: string[];
};

export type EditorSchemaV1 = {
  schemaVersion: '1';
  allEditorComponents: {
    [inputKey: string]: ModelInput;
  };
  modelInputComponents: string[];
  modelParameterComponents: string[];
  outputFormats: OutputFormat[];
};

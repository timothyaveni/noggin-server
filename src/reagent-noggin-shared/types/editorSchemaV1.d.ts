import { JSONSchema7 } from 'json-schema';

export type I18nString = {
  en_US: string;
  [languageCode: string]: string;
};

type ModelInputBase = {
  name: I18nString;
  description: I18nString;
};

type EditorHeight = 'primary' | 'default';

export type VariableEvaluation =
  | {
      variableType: 'text';
      variableName: string;
      variableValue: {
        text: string;
      };
    }
  | {
      variableType: 'image';
      variableName: string;
      variableValue: {
        url: string;
        openAI_detail?: 'low' | 'high' | 'auto';
      };
    }
  | {
      variableType: 'number';
      variableName: string;
      variableValue: {
        number: number;
      };
    }
  | {
      variableType: 'integer';
      variableName: string;
      variableValue: {
        integer: number;
      };
    };

type TextOrVariable =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'parameter';
      parameterId: string;
      evaluated?: VariableEvaluation;
    };

export type ModelInput_PlainTextWithVariables_Value = TextOrVariable[];

export type ChatTurnWithVariables = {
  speaker: 'user' | 'assistant';
  text: ModelInput_PlainTextWithVariables_Value;
};
export type ModelInput_StandardChatWithVariables_Value =
  ChatTurnWithVariables[];

interface ModelInput_PlainTextWithVariables extends ModelInputBase {
  type: 'plain-text-with-parameters';
  editorHeight?: EditorHeight;
  default?: string;
}

interface ModelInput_ChatTextUserImagesWithVariables extends ModelInputBase {
  type: 'chat-text-user-images-with-parameters';
  editorHeight?: EditorHeight;
}

interface ModelInput_ChatTextWithVariables extends ModelInputBase {
  type: 'chat-text-with-parameters';
  editorHeight?: EditorHeight;
}

type ModelInput_Number_Value = number;

interface ModelInput_Number extends ModelInputBase {
  type: 'number';
  default: ModelInput_Number_Value;
  min: number;
  max: number;
}

type ModelInput_Integer_Value = number;

interface ModelInput_Integer extends ModelInputBase {
  type: 'integer';
  default: ModelInput_Integer_Value;
  min: number;
  max: number;
}

type ModelInput_Boolean_Value = boolean;

interface ModelInput_Boolean extends ModelInputBase {
  type: 'boolean';
  default: ModelInput_Boolean_Value;
}

// todo fancy type params here or something -- and update evaluated-params.d.t.s
type ModelInput_Select_Value = string | string[];

interface ModelInput_Select extends ModelInputBase {
  type: 'select';
  options: {
    [optionKey: string]: I18nString;
  };
  default: ModelInput_Select_Value;
  multiple: false;
}

type ModelInput_SimpleSchema_Value = JSONSchema7;

interface ModelInput_SimpleSchema extends ModelInputBase {
  type: 'simple-schema';
  default: ModelInput_SimpleSchema_Value; // TODO really this repo should have all of the value-types for these inputs
  includeOutputTransformations: boolean;
}

export type ModelInput_Value =
  | ModelInput_PlainTextWithVariables_Value
  | ModelInput_StandardChatWithVariables_Value
  | ModelInput_Number_Value
  | ModelInput_Integer_Value
  | ModelInput_Boolean_Value
  | ModelInput_Select_Value
  | ModelInput_SimpleSchema_Value;

export type ModelInput =
  | ModelInput_PlainTextWithVariables
  | ModelInput_ChatTextUserImagesWithVariables
  | ModelInput_ChatTextWithVariables
  | ModelInput_Number
  | ModelInput_Integer
  | ModelInput_Boolean
  | ModelInput_Select
  | ModelInput_SimpleSchema;

export type ModelInput_Value_for_ModelInput<T> =
  T extends ModelInput_PlainTextWithVariables
    ? ModelInput_PlainTextWithVariables_Value
    : T extends ModelInput_ChatTextUserImagesWithVariables
    ? ModelInput_StandardChatWithVariables_Value
    : T extends ModelInput_ChatTextWithVariables
    ? ModelInput_StandardChatWithVariables_Value
    : T extends ModelInput_Number
    ? ModelInput_Number_Value
    : T extends ModelInput_Integer
    ? ModelInput_Integer_Value
    : T extends ModelInput_Boolean
    ? ModelInput_Boolean_Value
    : T extends ModelInput_Select
    ? ModelInput_Select_Value
    : T extends ModelInput_SimpleSchema
    ? ModelInput_SimpleSchema_Value
    : never;

export type ModelInputs = Record<string, ModelInput>;

export type All_ModelInput_Values_for_ModelInputs<T> = {
  [K in keyof T]: ModelInput_Value_for_ModelInput<T[K]>;
};

export type ModelInputValues =
  All_ModelInput_Values_for_ModelInputs<ModelInputs>;

export type OutputFormat = {
  type: 'chat-text' | 'completion' | 'image' | 'structured-data';
  key: string;
  name: I18nString;
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

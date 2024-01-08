import { JSONSchema7 } from 'json-schema';
import {
  ModelInput_Boolean_Value,
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_Select_Value,
  ModelInput_StandardChatWithVariables_Value,
  ModelInput_Value,
} from './editorSchemaV1';

export type EvaluatedContentChunk =
  | {
      type: 'text';
      text: string;
    }
  | {
      type: 'image_url';
      image_url: {
        url: string;
        openAI_detail: 'low' | 'high' | 'auto';
      };
    };

type EvaluatedChatTurn = {
  speaker: 'user' | 'assistant';
  content: EvaluatedContentChunk[];
};
export type EvaluatedStandardChat = EvaluatedChatTurn[];

type EvaluatedModelInput_Value<T extends ModelInput_Value> =
  T extends ModelInput_Number_Value
    ? number
    : T extends ModelInput_Integer_Value
    ? number
    : T extends ModelInput_Boolean_Value
    ? boolean
    : T extends JSONSchema7
    ? JSONSchema7
    : T extends ModelInput_PlainTextWithVariables_Value
    ? string
    : T extends ModelInput_StandardChatWithVariables_Value
    ? EvaluatedStandardChat
    : T extends ModelInput_Select_Value
    ? string | string[]
    : never;

export type EvaluatedModelInputs<T extends Record<string, ModelInput_Value>> = {
  [K in keyof T]: EvaluatedModelInput_Value<T[K]>;
};

export type ModelParamsForStreamResponse<
  T extends Record<string, ModelInput_Value>,
> = {
  unevaluated: T;
  evaluated: EvaluatedModelInputs<T>;
};

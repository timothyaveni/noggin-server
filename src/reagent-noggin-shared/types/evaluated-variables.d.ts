import { JSONSchema7 } from 'json-schema';
import {
  ModelInput_Boolean_Value,
  ModelInput_Image_Value,
  ModelInput_Integer_Value,
  ModelInput_Number_Value,
  ModelInput_PlainTextWithVariables_Value,
  ModelInput_Select_Value,
  ModelInput_StandardChatWithVariables_Value,
  ModelInput_Value,
} from './editorSchemaV1';

export type EvaluatedTextChunk = {
  type: 'text';
  text: string;
};

export type EvaluatedImageURLChunk = {
  type: 'image_url';
  image_url: {
    url: string;
    openAI_detail: 'low' | 'high' | 'auto';
  };
};

export type EvaluatedContentChunk = EvaluatedTextChunk | EvaluatedImageURLChunk;

type EvaluatedChatTurn = {
  speaker: 'user' | 'assistant' | 'developer';
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
    : T extends ModelInput_Image_Value
    ? string
    : T extends ModelInput_Select_Value
    ? string | string[] // todo: this doesn't actually work, lol, duh, i did notice this was suspicious bc of structural typing
    : never;

export type EvaluatedModelInputs<T extends Record<string, ModelInput_Value>> = {
  [K in keyof T]: EvaluatedModelInput_Value<T[K]>;
};

export type ModelParamsForStreamResponse<
  T extends Record<string, ModelInput_Value>,
> = {
  unevaluated: T;
  partialEvaluated: T; // todo is there a way we can make 'evaluated' non-optional here, and optional above? i don't want to duplicate all the type defs...
  evaluated: EvaluatedModelInputs<T>;
};

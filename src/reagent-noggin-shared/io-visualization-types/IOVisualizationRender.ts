import { I18nString } from '../types/editorSchemaV1';

type IOVisualizationVariableEvaluationNote = {
  noteMarkdown: string;
  noteSeverity: 'info' | 'warning' | 'error';
};

export type IOVisualizationHyperTextElement_Text = {
  type: 'text';

  text: string;
};

export type IOVisualizationHyperTextElement_EvaluatedVariable = {
  type: 'variable';

  variableName: string;
  variableEvaluatedValue:
    | IOVisualizationHyperTextElement_Text
    | IOVisualizationHyperTextElement_Asset; // hm, should this be a separate abstraction?
  variableEvaluationNotes: IOVisualizationVariableEvaluationNote[];
};

export type AssetBase = {
  url: string;
  mimeType: 'image/png' | 'image/jpeg' | 'application/octet-stream';
  altText?: string;
};

export interface IOVisualizationHyperTextElement_Asset extends AssetBase {
  type: 'asset';
}

export type IOVisualizationHyperTextElement =
  | IOVisualizationHyperTextElement_Text
  | IOVisualizationHyperTextElement_EvaluatedVariable
  | IOVisualizationHyperTextElement_Asset;

export type IOVisualizationElement_HyperText = {
  type: 'hypertext';
  children: IOVisualizationHyperTextElement[];
};

interface IOVisualizationElement_Asset extends AssetBase {
  type: 'asset';
}

type IOVisualizationElement_ResponseVoid = {
  type: 'response void';
};

export type IOVisualizationElement =
  | IOVisualizationElement_HyperText
  | IOVisualizationElement_Asset
  | IOVisualizationElement_ResponseVoid;

export type IOVisualizationChatTextTurn = {
  speaker: 'user' | 'assistant';
  content: IOVisualizationElement[];
};

export type IOVisualizationComponent_ChatText = {
  type: 'chat text';
  turns: IOVisualizationChatTextTurn[];
};

export type IOVisualizationComponent_RawElement = {
  type: 'raw element';
  content: IOVisualizationElement[];
};

export type IOVisualizationComponent_ElementWithTitle = {
  type: 'element with title';
  title: I18nString;
  content: IOVisualizationElement[];
};

export type IOVisualizationTopLevelComponent =
  | IOVisualizationComponent_ChatText
  | IOVisualizationComponent_RawElement
  | IOVisualizationComponent_ElementWithTitle;

type IOVisualizationRenderV1Payload = {
  primaryView: IOVisualizationTopLevelComponent[];
  secondaryView: IOVisualizationTopLevelComponent[];
};

type IOVisualizationRenderV1 = {
  version: '1';
  payload: IOVisualizationRenderV1Payload;
};

export type IOVisualizationRender = IOVisualizationRenderV1;

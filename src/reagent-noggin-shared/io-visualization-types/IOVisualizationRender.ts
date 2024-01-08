type IOVisualizationElementBase = {
  type: string;
};

type IOVisualizationParameterEvaluationNote = {
  noteMarkdown: string;
  noteSeverity: 'info' | 'warning' | 'error';
};

type IOVisualizationHyperTextElement_Text = {
  type: 'text';

  text: string;
};

type IOVisualizationHyperTextElement_EvaluatedParameter = {
  type: 'parameter';

  parameterName: string;
  parameterEvaluatedValue:
    | IOVisualizationHyperTextElement_Text
    | IOVisualizationHyperTextElement_Asset; // hm, should this be a separate abstraction?
  parameterEvaluationNotes: IOVisualizationParameterEvaluationNote[];
};

type AssetBase = {
  url: string;
  mimeType: 'image/png' | 'image/jpeg' | 'application/octet-stream';
  altText?: string;
};

interface IOVisualizationHyperTextElement_Asset extends AssetBase {
  type: 'asset';
}

type IOVisualizationHyperTextElement =
  | IOVisualizationHyperTextElement_Text
  | IOVisualizationHyperTextElement_EvaluatedParameter
  | IOVisualizationHyperTextElement_Asset;

type IOVisualizationElement_HyperText = {
  type: 'hypertext';
  children: IOVisualizationHyperTextElement[];
};

interface IOVisualizationElement_Asset extends AssetBase {
  type: 'asset';
}

type IOVisualizationElement_ResponseVoid = {
  type: 'response void';
};

type IOVisualizationElement =
  | IOVisualizationElement_HyperText
  | IOVisualizationElement_Asset
  | IOVisualizationElement_ResponseVoid;

type IOVisualizationChatTextTurn = {
  speaker: 'user' | 'assistant';
  content: IOVisualizationElement[];
};

type IOVisualizationComponent_ChatText = {
  type: 'chat text';
  turns: IOVisualizationChatTextTurn[];
};

type IOVisualizationTopLevelComponent = IOVisualizationComponent_ChatText;

type IOVisualizationRenderV1Payload = {
  primaryView: IOVisualizationTopLevelComponent[];
  secondaryView: IOVisualizationTopLevelComponent[];
};

type IOVisualizationRenderV1 = {
  version: '1';
  payload: IOVisualizationRenderV1Payload;
};

export type IOVisualizationRender = IOVisualizationRenderV1;

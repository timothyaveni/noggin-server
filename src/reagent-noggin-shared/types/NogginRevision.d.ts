import { OutputFormat } from './editorSchemaV1';

export type NogginRevisionVariables = {
  [variableId: string]: any; // TODO
};

export type NogginRevisionOutputSchema = {
  outputFormatType: OutputFormat['type'];
};

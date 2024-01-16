import * as Y from 'yjs';

type DocumentBaseVariable = {
  name: string;
};

export interface DocumentTextVariable extends DocumentBaseVariable {
  type: 'text';
  maxLength: number;
  defaultValue: string;
}

export interface DocumentImageVariable extends DocumentBaseVariable {
  type: 'image';
  openAI_detail: 'low' | 'high' | 'auto'; // openai-centric for now. also maybe in the future we do our own scaling in the shim?
}

export type DocumentVariable = DocumentTextVariable | DocumentImageVariable;
type _DPTypeCheck = DocumentVariable['type'];

export type DocType = {
  modelInputs: Record<string, Y.XmlText | any>;
  documentParameters: Record<string, Y.Map<DocumentVariable>>;
  // using Object.keys on documentParameters doesn't trigger a rerender on the index component, so we also keep a list of IDs so that the `push` gets noticed by the rerender logic...
  documentParameterIdsByDocument: Record<string, string[]>;
  nogginOptions: {
    chosenOutputFormatKey: string;
  };
  syncState: {
    synced?: boolean;
  };
};

export type JSONDocType = {
  modelInputs: Record<string, any>;
  documentParameters: Record<string, DocumentVariable>;
  documentParameterIdsByDocument: Record<string, string[]>;
  nogginOptions: {
    chosenOutputFormatKey: string;
  };
  syncState: {
    synced?: boolean;
  };
};

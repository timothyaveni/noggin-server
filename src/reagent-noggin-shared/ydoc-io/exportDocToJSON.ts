import { yTextToSlateElement } from '@slate-yjs/core';
import * as Y from 'yjs';
import { JSONDocType } from '../types/DocType';
import { EditorSchema } from '../types/editorSchema';

export const exportDocToObject = (
  editorSchema: EditorSchema,
  doc: Y.Doc,
): JSONDocType => {
  const modelInputs: Record<string, any> = {}; // todo we can prob buff this typing with slate stuff
  const yDocModelInputsMap = doc.getMap('modelInputs');
  for (const key of yDocModelInputsMap.keys()) {
    const inputType = editorSchema.allEditorComponents[key].type;
    switch (inputType) {
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
      case 'plain-text-with-parameters':
        const xmlText = yDocModelInputsMap.get(key) as Y.XmlText;
        modelInputs[key] = yTextToSlateElement(xmlText);
        break;
      case 'integer':
      case 'number':
      case 'boolean':
      case 'select':
        modelInputs[key] = yDocModelInputsMap.get(key);
        break;
      case 'simple-schema':
        modelInputs[key] = yDocModelInputsMap.get(key);
        break;
    }
  }

  const jsonDoc: JSONDocType = {
    modelInputs,
    documentParameters: doc.getMap('documentParameters').toJSON(),
    documentParameterIdsByDocument: doc
      .getMap('documentParameterIdsByDocument')
      .toJSON(),
    nogginOptions: doc
      .getMap('nogginOptions')
      .toJSON() as JSONDocType['nogginOptions'],
    syncState: doc.getMap('syncState').toJSON(), // todo we probably shouldn't expose this in an export -- it's not really part of the noggin, just an impl detail
  };

  return jsonDoc;
};

export const exportDocToJSON = (
  editorSchema: EditorSchema,
  doc: Y.Doc,
): string => {
  return JSON.stringify(exportDocToObject(editorSchema, doc));
};

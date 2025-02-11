import { slateNodesToInsertDelta } from '@slate-yjs/core';
import * as Y from 'yjs';

import { JSONDocType } from '../types/DocType';
import { EditorSchema } from '../types/editorSchema';

export const importDocFromJSON = (
  editorSchema: EditorSchema,
  json: string,
): Y.Doc => {
  return importDocFromObject(editorSchema, JSON.parse(json));
};

export const importDocFromObject = (
  editorSchema: EditorSchema,
  obj: JSONDocType,
): Y.Doc => {
  const yDoc = new Y.Doc();

  const yDocModelInputsMap = yDoc.getMap('modelInputs');
  for (const key of Object.keys(obj.modelInputs)) {
    const inputType = editorSchema.allEditorComponents[key].type;
    switch (inputType) {
      case 'chat-text':
      case 'chat-text-user-images-with-parameters':
      case 'chat-text-with-parameters':
      case 'plain-text-with-parameters':
        const insertDelta = slateNodesToInsertDelta(
          obj.modelInputs[key].children,
        );
        const xmlText = new Y.XmlText();
        xmlText.applyDelta(insertDelta, { sanitize: false });
        yDocModelInputsMap.set(key, xmlText);
        break;
      case 'integer':
      case 'number':
      case 'boolean':
      case 'select':
        yDocModelInputsMap.set(key, obj.modelInputs[key]);
        break;
      case 'simple-schema':
        yDocModelInputsMap.set(key, obj.modelInputs[key]);
        break;
    }
  }

  const yDocOverridableModelInputKeysArray = yDoc.getArray(
    'overridableModelInputKeys',
  );
  for (const key of obj.overridableModelInputKeys) {
    yDocOverridableModelInputKeysArray.push([key]);
  }

  const yDocDocumentParametersMap = yDoc.getMap('documentParameters');
  // todo hm maybe we should do this recursively in case parameters become objects in the future... the frontend syncedStore lib does this automatically
  for (const key of Object.keys(obj.documentParameters)) {
    const parameter = obj.documentParameters[key];
    const map = new Y.Map();
    for (const parameterKey of Object.keys(parameter)) {
      map.set(parameterKey, parameter[parameterKey as keyof typeof parameter]);
    }
    yDocDocumentParametersMap.set(key, map);
  }

  const yDocDocumentParameterIdsByDocumentMap = yDoc.getMap(
    'documentParameterIdsByDocument',
  );
  for (const key of Object.keys(obj.documentParameterIdsByDocument)) {
    const array = new Y.Array();
    array.insert(0, obj.documentParameterIdsByDocument[key]);
    yDocDocumentParameterIdsByDocumentMap.set(key, array);
  }

  const yDocNogginOptionsMap = yDoc.getMap('nogginOptions');
  for (const key of Object.keys(obj.nogginOptions)) {
    // @ts-expect-error
    yDocNogginOptionsMap.set(key, obj.nogginOptions[key]);
  }

  const yDocSyncStateMap = yDoc.getMap('syncState');
  for (const key of Object.keys(obj.syncState)) {
    // @ts-expect-error
    yDocSyncStateMap.set(key, obj.syncState[key]);
  }

  return yDoc;
};

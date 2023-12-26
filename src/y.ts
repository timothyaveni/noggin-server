import * as Y from 'yjs';

export const deserializeYDoc = (serialized: Buffer) => {
  const yDoc = new Y.Doc();
  const uint8Array = new Uint8Array(serialized);
  Y.applyUpdate(yDoc, uint8Array);
  return yDoc;
};

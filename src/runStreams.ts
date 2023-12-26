// this code may go into another server someday, e.g. synced with redis

// type RunStreamMimeType = 'text/plain' | 'application/json' | 'image/png';

// type RunStreamReceiveType = 'output' | 'log';

enum RunState {
  NOT_OPEN,
  OPEN,
  CLOSED,
}

type RunStream = {
  // streamMimeType: RunStreamMimeType;
  appendText: (text: string, metadata: any) => any;
  addLogEvent: (logEvent: any) => any;
  terminateStream: () => any;
  setHeader: (key: string, value: string) => any;
  // receiveTypes: RunStreamReceiveType[];
  lastSentOutputIndex: number;
  lastSentLogIndex: number;
};

// type StreamOutputChunk =
//   | {
//       type: 'text';
//       delta: string;
//     }
//   | {
//       type: 'json';
//       delta: any;
//     }
//   | {
//       type: 'asset';
//       delta: Buffer;
//     };

type StreamOutputChunk = {
  content: string;
  metadata: any;
};

// TODO these gonna leak memory, fix that
const streamOutputContent: {
  [runId: number]: StreamOutputChunk[];
} = {};

const streamLogContent: {
  [runId: number]: any[];
} = {};

const runStreamStates: {
  [runId: number]: RunState;
} = {};

const streams: {
  [runId: number]: RunStream[];
} = {};

export const registerStream = (
  runId: number,
  streamOptions: Partial<RunStream> & {
    // streamMimeType: RunStreamMimeType;
    // receiveTypes: RunStreamReceiveType[];
  },
) => {
  const stream = {
    // streamMimeType: streamOptions.streamMimeType,
    appendText: streamOptions.appendText || (() => {}),
    addLogEvent: streamOptions.addLogEvent || (() => {}),
    terminateStream: streamOptions.terminateStream || (() => {}),
    setHeader: streamOptions.setHeader || (() => {}),
    // receiveTypes: streamOptions.receiveTypes,
    lastSentOutputIndex: -1,
    lastSentLogIndex: -1,
  };

  if (!streams[runId]) {
    streams[runId] = [];
  }

  streams[runId].push(stream);

  console.log({ streams });

  flushStreamOutput(runId, stream);
};

const flushStreamOutput = (runId: number, stream: RunStream) => {
  if (runStreamStates[runId] !== RunState.OPEN) {
    return;
  }

  const chunks = streamOutputContent[runId] || [];

  for (let i = stream.lastSentOutputIndex + 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    stream.appendText(chunk.content, chunk.metadata);

    stream.lastSentOutputIndex = i;
  }
};

const flushStreamLog = (runId: number, stream: RunStream) => {
  if (runStreamStates[runId] !== RunState.OPEN) {
    return;
  }

  const chunks = streamLogContent[runId] || [];

  for (let i = stream.lastSentLogIndex + 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    stream.addLogEvent(chunk);

    stream.lastSentLogIndex = i;
  }
};

export const closeRun = (runId: number) => {
  const runStreams = streams[runId];

  if (!runStreams) {
    return;
  }

  flushAllStreamsForRun(runId);

  runStreamStates[runId] = RunState.CLOSED;

  for (const stream of runStreams) {
    stream.terminateStream();
  }

  delete streams[runId];
};

// todo maybe we have race conditions here
const flushAllStreamsForRun = (runId: number) => {
  const runStreams = streams[runId];

  if (!runStreams) {
    return;
  }

  for (const stream of runStreams) {
    flushStreamOutput(runId, stream);
    flushStreamLog(runId, stream);
  }
};

export const writeTextToRunStream = (
  runId: number,
  content: string,
  metadata: any,
) => {
  const chunks = streamOutputContent[runId] || [];

  chunks.push({
    content,
    metadata,
  });

  streamOutputContent[runId] = chunks;

  flushAllStreamsForRun(runId);
};

export const writeLogToRunStream = (runId: number, logEvent: any) => {
  const chunks = streamLogContent[runId] || [];

  chunks.push(logEvent);

  streamLogContent[runId] = chunks;

  flushAllStreamsForRun(runId);
};

export const openRunStream = (
  runId: number,
  headers: Record<string, string>,
) => {
  const runStreams = streams[runId];

  if (!runStreams) {
    return;
  }

  for (const stream of runStreams) {
    for (const [key, value] of Object.entries(headers)) {
      stream.setHeader(key, value);
    }
  }

  runStreamStates[runId] = RunState.OPEN;

  flushAllStreamsForRun(runId);
};

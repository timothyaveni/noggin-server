// this code may go into another server someday, e.g. synced with redis

import { saveFinalCostCalculation } from './cost-calculation/save-cost-calculations.js';
import { prisma } from './prisma.js';
import { unit } from './reagent-noggin-shared/cost-calculation/units.js';
import { IOVisualizationRender } from './reagent-noggin-shared/io-visualization-types/IOVisualizationRender';
import { LogEntry } from './reagent-noggin-shared/log';

// TODO probably curry all of these to the runId. and rename, since they're less 'stream'y now that they also do the db writes

// type RunStreamMimeType = 'text/plain' | 'application/json' | 'image/png';

// type RunStreamReceiveType = 'output' | 'log';

enum RunState {
  NOT_OPEN,
  OPEN,
  CLOSED,
}

type RunStream = {
  // streamMimeType: RunStreamMimeType;
  setIOVisualization: (ioVisualization: IOVisualizationRender) => any;
  appendText: (text: string, metadata: any) => any;
  finalizeText: (text: string, metadata: any) => any;
  finalizeAsset: (assetUrl: string, metadata: any) => any;
  reportFinalError: (errorMessage: string, metadata: any) => any;
  addLogEvent: (logEvent: any) => any;
  terminateStream: () => any;
  setHeader: (key: string, value: string) => any;
  canAcceptEarlyOutput: () => boolean; // only early output is io visualization, which doesn't get sent in HTTP requests anyway, but the idea here is to allow streams to register as not caring about headers
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

type StreamOutputChunk =
  | {
      stage: 'incremental' | 'final';
      contentType: 'text' | 'assetUrl' | 'error';
      content: string;
      metadata: any;
    }
  | {
      stage: 'io-visualization';
      content: IOVisualizationRender;
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

const outputChunksForRun = (runId: number) => {
  if (!streamOutputContent[runId]) {
    streamOutputContent[runId] = [];
  }

  return streamOutputContent[runId];
};

const logChunksForRun = (runId: number) => {
  if (!streamLogContent[runId]) {
    streamLogContent[runId] = [];
  }

  return streamLogContent[runId];
};

export const registerStream = (
  runId: number,
  streamOptions: Partial<RunStream> & {
    // streamMimeType: RunStreamMimeType;
    // receiveTypes: RunStreamReceiveType[];
  },
) => {
  const stream = {
    // streamMimeType: streamOptions.streamMimeType,
    setIOVisualization: streamOptions.setIOVisualization || (() => {}),
    appendText: streamOptions.appendText || (() => {}),
    finalizeText: streamOptions.finalizeText || (() => {}),
    finalizeAsset: streamOptions.finalizeAsset || (() => {}),
    reportFinalError: streamOptions.reportFinalError || (() => {}),
    addLogEvent: streamOptions.addLogEvent || (() => {}),
    terminateStream: streamOptions.terminateStream || (() => {}),
    setHeader: streamOptions.setHeader || (() => {}),
    canAcceptEarlyOutput: streamOptions.canAcceptEarlyOutput || (() => false),
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

// TODO separate function for errors
// TODO separate function for final output asset -- or maybe even incremental assets, but we can cross that bridge in a few years lol
const flushStreamOutput = (runId: number, stream: RunStream) => {
  if (
    runStreamStates[runId] !== RunState.OPEN &&
    !stream.canAcceptEarlyOutput()
  ) {
    return;
  }

  const chunks = outputChunksForRun(runId);

  for (let i = stream.lastSentOutputIndex + 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    // todo i'm not sure about this abstraction anymore ... should we just be passing the chunk through
    if (chunk.stage === 'io-visualization') {
      stream.setIOVisualization(chunk.content);
    } else if (chunk.stage === 'incremental') {
      stream.appendText(chunk.content, chunk.metadata);
    } else if (chunk.stage === 'final') {
      if (chunk.contentType === 'text') {
        stream.finalizeText(chunk.content, chunk.metadata);
      } else if (chunk.contentType === 'assetUrl') {
        stream.finalizeAsset(chunk.content, chunk.metadata);
      } else if (chunk.contentType === 'error') {
        stream.reportFinalError(chunk.content, chunk.metadata);
      }
    }

    stream.lastSentOutputIndex = i;
  }
};

const flushStreamLog = (runId: number, stream: RunStream) => {
  if (runStreamStates[runId] !== RunState.OPEN) {
    return;
  }

  const chunks = logChunksForRun(runId);

  for (let i = stream.lastSentLogIndex + 1; i < chunks.length; i++) {
    const chunk = chunks[i];

    stream.addLogEvent(chunk);

    stream.lastSentLogIndex = i;
  }
};

const terminateAllStreams = (runId: number) => {
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

export const failRun = (
  runId: number,
  errorMessage: string,
  metadata: any = null,
  chargeRun: boolean = false,
) => {
  console.error('failing run', runId, errorMessage);

  prisma
    .$transaction([
      prisma.nogginRunOutputEntry.create({
        data: {
          entryTypeVersion: 1,
          runId,
          stage: 'final',
          contentType: 'error',
          content: errorMessage,
          metadata,
        },
      }),
      prisma.nogginRun.update({
        where: {
          id: runId,
        },
        data: {
          status: 'failed',
        },
      }),
    ])
    .then();

  // if you want to charge, you'll have to save final cost calculation yourself
  if (!chargeRun) {
    saveFinalCostCalculation(runId, unit(0, 'credits'), {
      type: 'run_failed',
    }).then();
  }

  const chunks = outputChunksForRun(runId);
  chunks.push({
    stage: 'final',
    contentType: 'error',
    content: errorMessage,
    metadata,
  });

  terminateAllStreams(runId);
};

export const succeedRun = (
  runId: number,
  contentType: 'text' | 'assetUrl',
  content: string,
  metadata: any = null,
) => {
  prisma
    .$transaction([
      prisma.nogginRunOutputEntry.create({
        data: {
          entryTypeVersion: 1,
          runId,
          stage: 'final',
          contentType,
          content,
          metadata,
        },
      }),
      prisma.nogginRun.update({
        where: {
          id: runId,
        },
        data: {
          status: 'succeeded',
        },
      }),
    ])
    .then();

  const chunks = outputChunksForRun(runId);
  chunks.push({
    stage: 'final',
    contentType,
    content,
    metadata,
  });

  terminateAllStreams(runId);
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

export const writeIncrementalContentToRunStream = (
  runId: number,
  contentType: 'text' | 'assetUrl',
  content: string,
  metadata?: any,
) => {
  writeLogToRunStream(runId, {
    level: 'debug',
    stage: 'run_model',
    message: {
      type: 'model_partial_output',
      text: 'Model partial output',
      output: content,
    },
  });

  prisma.nogginRunOutputEntry
    .create({
      data: {
        contentType: 'text',
        entryTypeVersion: 1,
        stage: 'incremental',
        runId,
        content,
        metadata,
      },
    })
    .then();

  const chunks = outputChunksForRun(runId);

  chunks.push({
    stage: 'incremental',
    contentType,
    content,
    metadata,
  });

  flushAllStreamsForRun(runId);
};

export const writeLogToRunStream = (runId: number, logEvent: LogEntry) => {
  const timestamp = +new Date();
  logEvent.timestamp = timestamp;

  prisma.nogginRunLogEntry
    .create({
      data: {
        runId,
        entryTypeVersion: 1,
        level: logEvent.level,
        stage: logEvent.stage,
        message: logEvent.message,
        privateData: logEvent.privateData,
        timestamp: logEvent.timestamp,
      },
    })
    .then();

  const userFacingLogEvent = { ...logEvent };
  delete userFacingLogEvent.privateData;

  const chunks = logChunksForRun(runId);

  chunks.push(userFacingLogEvent);

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

export const setIOVisualizationRenderForRunStream = async (
  runId: number,
  ioVisualizationRender: IOVisualizationRender,
) => {
  // todo shouldn't need to await this
  await prisma.nogginRun.update({
    where: {
      id: runId,
    },
    data: {
      // @ts-ignore weirdness converting to json type
      ioVisualizationRender,
    },
  });

  const chunks = outputChunksForRun(runId);

  chunks.push({
    stage: 'io-visualization',
    content: ioVisualizationRender,
  });

  flushAllStreamsForRun(runId);
};

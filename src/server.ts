import cors from 'cors';
import express from 'express';
import { WebSocketServer } from 'ws';

import handleRequest from './handleRequest.js';
import { prisma } from './prisma.js';
import { registerStream } from './runStreams.js';

import bodyParser from 'body-parser';
import qs from 'qs';

import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(
  cors({
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// TODO: create a 'failed' runresult when we die, especially before calling the model

app.get('*', async (req, res) => {
  handleRequest(req, res);
});

app.post(
  '*',
  bodyParser.raw({
    inflate: true,
    limit: '10mb',
    type: '*/*', // postel's law as a service
  }),
  (req, _res, next) => {
    const rawBody = req.body.toString();

    if (!rawBody.length) {
      // @ts-expect-error
      req.nogginBody = {
        parsed: 'empty',
        raw: rawBody,
        body: null,
      };
      return next();
    }

    try {
      const json = JSON.parse(req.body);
      // @ts-expect-error ugh
      req.nogginBody = {
        parsed: 'json',
        raw: rawBody,
        body: json,
      };
      return next();
    } catch (e) {}

    // parse url parms
    // @ts-expect-error
    req.nogginBody = {
      parsed: 'qs',
      raw: rawBody,
      body: qs.parse(rawBody),
    };

    return next();
  },
  async (req, res) => {
    handleRequest(req, res);
  },
);

// app.options(
//   '*',
//   (req, res, next) => {
//     console.log('options');
//     next();
//   },
//   cors(),
// );

const server = app.listen(2358, () => {
  console.log('Server listening on port 2358');
});

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws: WebSocket, req: Request) => {
  console.log('WebSocket connection established');
  // Handle WebSocket events here
  // const token = new URL(req.url, 'http://localhost').searchParams.get(
  //   'authToken',
  // );
  const url = new URL(req.url, 'http://localhost');
  // /ws/uuid
  const match = url.pathname.match(
    /\/ws\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/,
  );
  if (!match) {
    console.log('No run id');
    ws.close();
    return;
  }
  const runUuid = match[1];
  console.log('runUuid', runUuid);

  const key = url.searchParams.get('key')?.toString();

  if (!key) {
    console.log('No key');
    ws.close();
    return;
  }

  const apiKey = await prisma.nogginAPIKey.findUnique({
    where: {
      key,
    },
    select: {
      canViewFullRunHistory: true,
      nogginId: true,
    },
  });

  if (!apiKey) {
    console.log('Invalid key');
    ws.close();
    return;
  }

  if (!apiKey.canViewFullRunHistory) {
    console.log('Key cannot view full run history');
    ws.close();
    return;
  }

  const run = await prisma.nogginRun.findUnique({
    where: {
      uuid: runUuid,
    },
    select: {
      nogginRevision: {
        select: {
          nogginId: true,
        },
      },
      id: true,
    },
  });

  if (!run) {
    console.log('Run not found');
    ws.close();
    return;
  }

  if (run.nogginRevision.nogginId !== apiKey.nogginId) {
    console.log('Run does not belong to noggin');
    ws.close();
    return;
  }

  // TODO: don't attach if the run has a result. or maybe attach but immediately send everything and bail
  console.log('Registering stream', run.id);
  registerStream(run.id, {
    addLogEvent: (logEvent) => {
      ws.send(
        JSON.stringify({
          type: 'log',
          logEvent,
        }),
      );
    },
    setIOVisualization: (ioVisualization) => {
      ws.send(
        JSON.stringify({
          type: 'set io visualization',
          ioVisualization,
        }),
      );
    },
    appendText: (text, metadata) => {
      ws.send(
        JSON.stringify({
          type: 'incremental text output',
          text,
          metadata,
        }),
      );
    },
    finalizeText: (text, metadata) => {
      ws.send(
        JSON.stringify({
          type: 'final text output',
          text,
          metadata,
        }),
      );
    },
    finalizeAsset: (assetUrl, metadata) => {
      ws.send(
        JSON.stringify({
          type: 'final asset URL output',
          assetUrl,
          metadata,
        }),
      );
    },
    reportFinalError: (error, metadata) => {
      ws.send(
        JSON.stringify({
          type: 'error',
          error,
          metadata,
        }),
      );
    },
    terminateStream: () => {
      ws.send(
        JSON.stringify({
          type: 'finish',
        }),
      );
      ws.close();
    },
    canAcceptEarlyOutput: () => true,
  });
});

import { NogginRunLogEntryStage, NogginRunLogLevel } from '@prisma/client';
import { prisma } from './prisma.js';

export type LogArgs = {
  level: NogginRunLogLevel;
  stage: NogginRunLogEntryStage;
  message: any;
  privateData?: any;
};

export const logForRun = (runId: number) => async (log: LogArgs) => {
  return await prisma.nogginRunLogEntry.create({
    data: {
      runId,
      entryTypeVersion: 1,
      level: log.level,
      stage: log.stage,
      message: log.message,
      privateData: log.privateData,
    },
  });
};

import { NogginRunLogEntryStage, NogginRunLogLevel } from '@prisma/client';

export type LogArgs = {
  level: NogginRunLogLevel;
  stage: NogginRunLogEntryStage;
  message: any;
  privateData?: any;
};

// export const logForRun = (runId: number) => async (log: LogArgs) => {};

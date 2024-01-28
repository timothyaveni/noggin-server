import { NogginRunLogEntryStage, NogginRunLogLevel } from '@prisma/client';

export type LogEntry = {
  level: NogginRunLogLevel;
  stage: NogginRunLogEntryStage;
  message: {
    type: string;
  } & Record<string, any>;
  privateData?: any;
  timestamp?: number;
};

// ugh, still having that prisma enum info. will need to keep this in sync

type NogginRunLogLevel = 'debug' | 'info' | 'warn' | 'error';

type NogginRunLogEntryStage =
  | 'request'
  | 'authenticate'
  | 'process_parameters'
  | 'anticipate_cost'
  | 'run_model'
  | 'calculate_cost'
  | 'postprocess'
  | 'deliver'
  | 'other';

export type LogEntry = {
  level: NogginRunLogLevel;
  stage: NogginRunLogEntryStage;
  message: {
    type: string;
  } & Record<string, any>;
  privateData?: any;
  timestamp?: number;
};

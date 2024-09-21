export const ReagentBucket = {
  NOGGIN_FILES:
    process.env.OBJECT_STORAGE_NOGGIN_FILES_BUCKET || 'noggin-files',
  NOGGIN_RUN_INPUTS:
    process.env.OBJECT_STORAGE_NOGGIN_RUN_INPUTS_BUCKET || 'noggin-run-inputs',
  NOGGIN_RUN_OUTPUTS:
    process.env.OBJECT_STORAGE_NOGGIN_RUN_OUTPUTS_BUCKET ||
    'noggin-run-outputs',
};

export const ReagentBucketExternalUrl: {
  [key in keyof typeof ReagentBucket]: string;
} = {
  NOGGIN_FILES:
    process.env.OBJECT_STORAGE_NOGGIN_FILES_BUCKET_EXTERNAL_URL || '',
  NOGGIN_RUN_INPUTS:
    process.env.OBJECT_STORAGE_NOGGIN_RUN_INPUTS_BUCKET_EXTERNAL_URL || '',
  NOGGIN_RUN_OUTPUTS:
    process.env.OBJECT_STORAGE_NOGGIN_RUN_OUTPUTS_BUCKET_EXTERNAL_URL || '',
};

export type ReagentBucketId = keyof typeof ReagentBucket;

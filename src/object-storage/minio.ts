import * as Minio from 'minio';
import {
  ReagentBucket,
  ReagentBucketExternalUrl,
  ReagentBucketId,
} from '../reagent-noggin-shared/object-storage-buckets.js';

export const minioClient = new Minio.Client({
  endPoint: process.env.OBJECT_STORAGE_INTERNAL_HOST!,
  port: parseInt(process.env.OBJECT_STORAGE_INTERNAL_PORT || '', 10),
  useSSL: process.env.OBJECT_STORAGE_INTERNAL_USE_SSL === 'true',
  accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY!,
  secretKey: process.env.OBJECT_STORAGE_SECRET_KEY!,

  // I added this \/ when I thought I'd need it for the R2 API, but later realized
  // I was using the wrong endpoint. kept it around because why not
  pathStyle: process.env.OBJECT_STORAGE_PATH_TYPE === 'path',
});

// todo ehh we might get rid of this bc we probably will just make a boot script that also configures the policy
export const getBucket = async (bucketId: ReagentBucketId): Promise<string> => {
  const bucketName = ReagentBucket[bucketId];

  // console.log(
  //   'ns',
  //   { bucketId, bucketName },
  //   process.env.OBJECT_STORAGE_NOGGIN_RUN_OUTPUTS_BUCKET,
  // );

  if (await minioClient.bucketExists(bucketName)) {
    return bucketName;
  }
  // smol race condition
  await minioClient.makeBucket(bucketName);
  return bucketName;
};

export const verifyUrlIsExternalBucketAsset = (
  url: string,
  bucketId: ReagentBucketId,
): boolean => {
  return url.startsWith(`${ReagentBucketExternalUrl[bucketId]}/`);
};

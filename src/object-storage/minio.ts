import * as Minio from 'minio';
import { ReagentBucket } from '../reagent-noggin-shared/object-storage-buckets';

export const minioClient = new Minio.Client({
  endPoint: process.env.OBJECT_STORAGE_INTERNAL_HOST!,
  port: parseInt(process.env.OBJECT_STORAGE_INTERNAL_PORT || '', 10),
  useSSL: process.env.OBJECT_STORAGE_INTERNAL_USE_SSL === 'true',
  accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY!,
  secretKey: process.env.OBJECT_STORAGE_SECRET_KEY!,
});

// todo ehh we might get rid of this bc we probably will just make a boot script that also configures the policy
export const getBucket = async (bucketName: ReagentBucket): Promise<string> => {
  if (await minioClient.bucketExists(bucketName)) {
    return bucketName;
  }
  // smol race condition
  await minioClient.makeBucket(bucketName);
  return bucketName;
};

export const getExternalUrlForBucket = (bucketName: ReagentBucket): string => {
  return `${process.env.OBJECT_STORAGE_EXTERNAL_URL}/${bucketName}`;
};

export const verifyUrlIsExternalBucketAsset = (
  url: string,
  bucketName: ReagentBucket,
): boolean => {
  return url.startsWith(`${getExternalUrlForBucket(bucketName)}/`);
};

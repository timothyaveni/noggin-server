import { NogginOutputAssetObject } from '@prisma/client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma.js';
import { ReagentBucket } from '../reagent-noggin-shared/object-storage-buckets';
import {
  getBucket,
  getExternalUrlForBucket,
  minioClient,
  verifyUrlIsExternalBucketAsset,
} from './minio.js';

// careful here. there's not a lot stopping malicious uploads, e.g. .html, i think.
// we should not be treating objects.rea.gent as the same origin, but we should
// still be careful. maybe get another cdn url...
const MIME_TYPE_WHITELIST: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export const createAssetInBucket = async (
  runId: number,
  bucket: ReagentBucket,
  file: Buffer,
  mimeType: string,
): Promise<NogginOutputAssetObject> => {
  const outputAssetUuid = uuidv4();
  const extension = MIME_TYPE_WHITELIST[mimeType];
  if (!extension) {
    // TODO... warn? idk
    throw new Error(`Unsupported mime type: ${mimeType}`);
  }
  const outputAssetFilename = `${outputAssetUuid}.${extension}`;

  await minioClient.putObject(
    await getBucket(bucket),
    outputAssetFilename,
    file,
    {
      'Content-Type': mimeType,
    },
  );

  const asset = await prisma.nogginOutputAssetObject.create({
    data: {
      uuid: outputAssetUuid,
      filename: outputAssetFilename,
      nogginRunId: runId,
      mimeType: mimeType,
      url: `${getExternalUrlForBucket(bucket)}/${outputAssetFilename}`,
    },
  });

  return asset;
};

export const fetchBase64Asset = async (
  bucket: ReagentBucket,
  url: string,
): Promise<{
  base64: string;
  mimeType: string;
}> => {
  if (!verifyUrlIsExternalBucketAsset(url, bucket)) {
    throw new Error('Invalid asset URL');
  }

  const { data, headers } = await axios.get<Buffer>(url, {
    responseType: 'arraybuffer',
  });

  return {
    base64: data.toString('base64'),
    mimeType: headers['content-type'],
  };
};

import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Generate presigned PUT URL for client-side upload
 */
export async function getR2UploadUrl(
  objectKey: string,
  contentType: string,
  expiresInSeconds: number = 3600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || '',
    Key: objectKey,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return url;
}

/**
 * Generate presigned GET URL for download
 */
export async function getR2DownloadUrl(objectKey: string, expiresInSeconds: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || '',
    Key: objectKey,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  return url;
}

/**
 * Delete object from R2 storage
 */
export async function deleteR2Object(objectKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || '',
    Key: objectKey,
  });

  await s3Client.send(command);
}

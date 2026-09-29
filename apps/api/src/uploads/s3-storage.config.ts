import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

export function createS3Storage(config: ConfigService) {
  const region = config.get<string>('AWS_REGION') || config.get<string>('S3_REGION') || 'ap-south-1';
  const bucket = config.get<string>('AWS_S3_BUCKET') || config.get<string>('S3_BUCKET') || '';
  const accessKeyId = config.get<string>('AWS_ACCESS_KEY_ID') || config.get<string>('S3_ACCESS_KEY');
  const secretAccessKey = config.get<string>('AWS_SECRET_ACCESS_KEY') || config.get<string>('S3_SECRET_KEY');
  const endpoint = config.get<string>('S3_ENDPOINT') || undefined;
  return {
    region, bucket,
    publicBaseUrl: config.get<string>('AWS_S3_PUBLIC_BASE_URL') || undefined,
    client: bucket && accessKeyId && secretAccessKey
      ? new S3Client({ region, credentials: { accessKeyId, secretAccessKey }, ...(endpoint ? { endpoint } : {}) })
      : null,
  };
}

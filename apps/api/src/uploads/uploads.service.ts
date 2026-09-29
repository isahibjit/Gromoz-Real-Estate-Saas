import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import { join } from 'path';
import { createS3Storage } from './s3-storage.config';

const maxImageBytes = 5 * 1024 * 1024;
const maxPdfBytes = 10 * 1024 * 1024;

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
}

export type UploadedProjectBrochureFile = UploadedImageFile;

@Injectable()
export class UploadsService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl?: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const storage = createS3Storage(configService);
    this.region = storage.region;
    this.bucket = storage.bucket;
    this.publicBaseUrl = storage.publicBaseUrl;
    this.client = storage.client;
  }

  async uploadImage(file: UploadedImageFile, actorUserId?: string) {
    if (!file) throw new BadRequestException('Image file is required');
    
    // Auto-delegate video uploads to uploadProjectVideo
    if (
      file.mimetype?.startsWith('video/') ||
      Boolean(file.originalname?.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/i))
    ) {
      return this.uploadProjectVideo(file, actorUserId);
    }

    if (!file.mimetype?.startsWith('image/'))
      throw new BadRequestException('Only image or video uploads are allowed');
    if (file.size > maxImageBytes)
      throw new BadRequestException('Image must be 5 MB or smaller');

    const extension = file.originalname.includes('.')
      ? file.originalname.split('.').pop()
      : 'bin';
    const filename = `${actorUserId ?? 'system'}-${Date.now()}.${extension}`;

    // If S3 credentials are not configured, fall back to local disk storage
    if (!this.client || !this.bucket) {
      const dir = join(process.cwd(), 'uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const absolutePath = join(dir, filename);
      fs.writeFileSync(absolutePath, file.buffer);

      const port = this.configService.get<string>('PORT') || '5002';
      const url = `http://localhost:${port}/uploads/${filename}`;

      return {
        key: `uploads/${filename}`,
        url,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      };
    }

    const key = `crm/images/${new Date()
      .toISOString()
      .slice(0, 10)}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      key,
      url,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };
  }

  async uploadProjectVideo(file: UploadedImageFile, actorUserId?: string) {
    if (!file) throw new BadRequestException('Video file is required');
    if (
      !file.mimetype?.startsWith('video/') &&
      !file.originalname?.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/i)
    ) {
      throw new BadRequestException('Only video files (.mp4, .webm, .mov) are allowed');
    }
    const maxVideoBytes = 100 * 1024 * 1024; // 100 MB limit for video
    if (file.size > maxVideoBytes) {
      throw new BadRequestException('Video file must be 100 MB or smaller');
    }

    return this.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype || 'video/mp4',
      actorUserId,
      'project-videos',
    );
  }

  async uploadFile(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    actorUserId?: string,
    targetFolder = 'payroll-payslips',
  ) {
    const extension = originalname.includes('.')
      ? originalname.split('.').pop()
      : 'bin';
    const filename = `${actorUserId ?? 'system'}-${Date.now()}.${extension}`;

    // If S3 credentials are not configured, fall back to local disk storage
    if (!this.client || !this.bucket) {
      const dir = join(process.cwd(), 'uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const absolutePath = join(dir, filename);
      fs.writeFileSync(absolutePath, buffer);

      const port = this.configService.get<string>('PORT') || '5002';
      const url = `http://localhost:${port}/uploads/${filename}`;

      return {
        key: `uploads/${filename}`,
        url,
        mimeType: mimetype,
        sizeBytes: buffer.length,
      };
    }

    const key = `crm/${targetFolder}/${new Date()
      .toISOString()
      .slice(0, 10)}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
      }),
    );

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return {
      key,
      url,
      mimeType: mimetype,
      sizeBytes: buffer.length,
    };
  }

  async uploadProjectBrochure(
    file: UploadedProjectBrochureFile,
    actorUserId?: string,
  ) {
    if (!file) throw new BadRequestException('Brochure file is required');
    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF brochures are allowed');
    }
    if (file.size > maxPdfBytes) {
      throw new BadRequestException('Brochure must be 10 MB or smaller');
    }
    return this.uploadFile(
      file.buffer,
      file.originalname,
      file.mimetype,
      actorUserId,
      'project-brochures',
    );
  }
}

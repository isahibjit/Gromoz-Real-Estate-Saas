import { BadRequestException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';
import { createS3Storage } from '../uploads/s3-storage.config';
import { inspectApk, MAX_APK_BYTES, validateApkName } from './apk-validation';

const releaseSelect = {
  id: true, versionName: true, buildNumber: true, originalName: true,
  sizeBytes: true, sha256: true, releaseNotes: true, createdAt: true, publishedAt: true,
} satisfies Prisma.MobileAppReleaseSelect;
export const APK_CONTENT_TYPE = 'application/vnd.android.package-archive';

export function parseReleaseMetadata(body: Record<string, unknown>) {
  const { versionName, buildNumber, releaseNotes = '' } = body;
  if (typeof versionName !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9.+_-]{0,63}$/.test(versionName.trim())) {
    throw new BadRequestException('Version must be 1-64 letters, numbers, dots, hyphens, underscores or plus signs');
  }
  if (typeof buildNumber !== 'string' || !/^[1-9]\d*$/.test(buildNumber) || Number(buildNumber) > 2147483647) {
    throw new BadRequestException('Build number must be a positive integer up to 2147483647');
  }
  if (typeof releaseNotes !== 'string' || releaseNotes.length > 5000) throw new BadRequestException('Release notes must be at most 5000 characters');
  return { versionName: versionName.trim(), buildNumber: Number(buildNumber), releaseNotes: releaseNotes.trim() };
}

@Injectable()
export class MobileAppService {
  private readonly logger = new Logger(MobileAppService.name);
  private readonly storage: ReturnType<typeof createS3Storage>;
  constructor(private readonly prisma: PrismaService, config: ConfigService) {
    // Reuse media storage configuration; keep mobile-app/* private in the bucket policy.
    this.storage = createS3Storage(config);
  }

  private requireStorage() {
    const { client, bucket } = this.storage;
    if (!client || !bucket) throw new ServiceUnavailableException('S3 storage is not configured for APK uploads');
    return { client, bucket };
  }

  async history(pageValue?: string, limitValue?: string) {
    const page = Number(pageValue ?? 1);
    const limit = Number(limitValue ?? 10);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new BadRequestException('Invalid pagination');
    const [rows, total, publication] = await this.prisma.$transaction([
      this.prisma.mobileAppRelease.findMany({ select: releaseSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * limit, take: limit }),
      this.prisma.mobileAppRelease.count(),
      this.prisma.mobileAppPublication.findUnique({ where: { id: 'android' }, select: { release: { select: releaseSelect } } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return { data: rows.map(row => ({ ...row, state: row.id === publication?.release?.id ? 'published' : row.publishedAt ? 'previous' : 'draft' })), meta: { page, limit, total }, currentRelease: publication?.release ?? null };
  }

  async upload(file: Express.Multer.File | undefined, body: Record<string, unknown>, actorUserId: string, signal?: AbortSignal) {
    const { client, bucket } = this.requireStorage();
    const metadata = parseReleaseMetadata(body);
    if (!file || !file.size || file.size > MAX_APK_BYTES) throw new BadRequestException('An APK up to 200 MiB is required');
    validateApkName(file.originalname);
    const sha256 = await inspectApk(file.path);
    if (signal?.aborted) throw new BadRequestException('APK upload cancelled');
    const id = randomUUID();
    const storageKey = `mobile-app/${id}.apk`;
    const stream = createReadStream(file.path);
    try {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: stream, ContentLength: file.size, ContentType: APK_CONTENT_TYPE, Metadata: { sha256 } }), { abortSignal: signal });
      if (signal?.aborted) throw new BadRequestException('APK upload cancelled');
      return await this.prisma.$transaction(async tx => {
        const release = await tx.mobileAppRelease.create({ data: { id, ...metadata, originalName: file.originalname, storageKey, sizeBytes: file.size, sha256, uploaderId: actorUserId }, select: releaseSelect });
        await tx.auditLog.create({ data: { actorUserId, action: 'mobile-app.upload', entityType: 'MobileAppRelease', entityId: id, metadata: { versionName: metadata.versionName, buildNumber: metadata.buildNumber, sha256 } } });
        return { ...release, state: 'draft' as const };
      });
    } catch (error) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storageKey })).catch(() => this.logger.error(`Orphan APK cleanup failed for release ${id}`));
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`APK upload failed for release ${id}`);
      throw new ServiceUnavailableException('APK could not be stored. The current release has not changed.');
    } finally { stream.destroy(); }
  }

  async publish(id: string, actorUserId: string) {
    const { client, bucket } = this.requireStorage();
    const release = await this.prisma.mobileAppRelease.findUnique({ where: { id }, select: { storageKey: true, sizeBytes: true } });
    if (!release) throw new NotFoundException('Release not found');
    try {
      const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: release.storageKey }));
      if (object.ContentLength !== release.sizeBytes) throw new Error('File size mismatch');
    } catch { throw new ServiceUnavailableException('The APK is unavailable in storage. The current release has not changed.'); }
    return this.prisma.$transaction(async tx => {
      // Serialize all pointer changes, including unpublish, across API processes.
      await tx.$queryRaw`SELECT "id" FROM "MobileAppPublication" WHERE "id" = 'android' FOR UPDATE`;
      const previous = await tx.mobileAppPublication.findUniqueOrThrow({ where: { id: 'android' } });
      const target = await tx.mobileAppRelease.findUniqueOrThrow({ where: { id }, select: releaseSelect });
      if (previous.releaseId === id) return target;
      const current = await tx.mobileAppRelease.update({ where: { id }, data: { publishedAt: new Date() }, select: releaseSelect });
      await tx.mobileAppPublication.update({ where: { id: 'android' }, data: { releaseId: id } });
      await tx.auditLog.create({ data: { actorUserId, action: target.publishedAt ? 'mobile-app.rollback' : 'mobile-app.publish', entityType: 'MobileAppRelease', entityId: id, metadata: { previousReleaseId: previous.releaseId } } });
      return current;
    });
  }

  async unpublish(actorUserId: string) {
    await this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "MobileAppPublication" WHERE "id" = 'android' FOR UPDATE`;
      const previous = await tx.mobileAppPublication.findUniqueOrThrow({ where: { id: 'android' } });
      await tx.mobileAppPublication.update({ where: { id: 'android' }, data: { releaseId: null } });
      if (previous.releaseId) await tx.auditLog.create({ data: { actorUserId, action: 'mobile-app.unpublish', entityType: 'MobileAppRelease', entityId: previous.releaseId } });
    });
    return { release: null };
  }

  async current() {
    const publication = await this.prisma.mobileAppPublication.findUnique({ where: { id: 'android' }, select: { release: { select: releaseSelect } } });
    return { release: publication?.release ?? null };
  }

  async download() {
    const publication = await this.prisma.mobileAppPublication.findUnique({ where: { id: 'android' }, select: { release: { select: { storageKey: true, versionName: true, buildNumber: true } } } });
    if (!publication?.release) throw new NotFoundException('The Android app download is not available yet');
    const { client, bucket } = this.requireStorage();
    const release = publication.release;
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: release.storageKey, ResponseContentType: APK_CONTENT_TYPE, ResponseContentDisposition: `attachment; filename="trueroot-${release.versionName}-${release.buildNumber}.apk"` }), { expiresIn: 60 });
  }
}

import { BadRequestException, CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor, PayloadTooLargeException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Request, Response } from 'express';
import multer = require('multer');
import { defer, lastValueFrom } from 'rxjs';
import { MAX_APK_BYTES, validateApkName } from './apk-validation';

export interface ApkRequest extends Request {
  user: { sub: string };
  uploadSignal?: AbortSignal;
}

@Injectable()
export class ApkUploadInterceptor implements NestInterceptor {
  private active = 0;
  private readonly logger = new Logger(ApkUploadInterceptor.name);
  constructor(private readonly config: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return defer(async () => {
      if (this.active >= 2) throw new ServiceUnavailableException('Two APK uploads are already running. Please retry shortly.');
      this.active++;
      const req = context.switchToHttp().getRequest<ApkRequest>();
      const res = context.switchToHttp().getResponse<Response>();
      const abort = new AbortController();
      req.uploadSignal = abort.signal;
      const onClose = () => { if (!res.writableEnded) abort.abort(); };
      const onAbort = () => abort.abort();
      req.once('aborted', onAbort);
      res.once('close', onClose);
      const timeout = setTimeout(() => abort.abort(), 10 * 60 * 1000);
      let directory: string | undefined;
      const cleanup = async () => {
        if (directory) await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      };
      try {
        const root = this.config.get<string>('MOBILE_APP_UPLOAD_TMP_DIR') || join(tmpdir(), 'trueroot-apk');
        await mkdir(root, { recursive: true, mode: 0o700 });
        directory = await mkdtemp(join(root, 'upload-'));
        const upload = multer({
          preservePath: true,
          storage: multer.diskStorage({ destination: directory, filename: (_req, _file, cb) => cb(null, randomUUID()) }),
          limits: { fileSize: MAX_APK_BYTES, files: 1, fields: 3, fieldSize: 10000, parts: 5 },
          fileFilter: (_req, file, cb) => {
            try { validateApkName(file.originalname); cb(null, true); }
            catch { cb(new BadRequestException('Invalid APK filename')); }
          },
        }).single('file');
        await new Promise<void>((resolve, reject) => {
          const cancelled = () => reject(new BadRequestException('APK upload cancelled or timed out'));
          abort.signal.addEventListener('abort', cancelled, { once: true });
          if (abort.signal.aborted) { cancelled(); return; }
          upload(req, res, error => {
            abort.signal.removeEventListener('abort', cancelled);
            if (abort.signal.aborted) {
              void cleanup().catch(() => this.logger.error('Cancelled APK temporary-file cleanup failed'));
              cancelled();
            } else if (error instanceof multer.MulterError) {
              reject(error.code === 'LIMIT_FILE_SIZE' ? new PayloadTooLargeException('APK must be 200 MiB or smaller') : new BadRequestException(error.message));
            } else if (error) reject(error);
            else resolve();
          });
        });
        if (abort.signal.aborted) throw new BadRequestException('APK upload cancelled');
        return await lastValueFrom(next.handle());
      } finally {
        clearTimeout(timeout);
        req.off('aborted', onAbort);
        res.off('close', onClose);
        await cleanup().catch(() => this.logger.error('APK temporary-file cleanup failed; inspect the upload temp directory'));
        this.active--;
      }
    });
  }
}

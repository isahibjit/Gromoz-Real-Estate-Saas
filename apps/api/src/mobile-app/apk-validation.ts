import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { open } from 'yauzl';

export const MAX_APK_BYTES = 200 * 1024 * 1024;

export function validateApkName(name: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,179}\.apk$/i.test(name) || name.includes('..')) {
    throw new BadRequestException('Choose an APK with a simple filename (letters, numbers, spaces, dots or hyphens).');
  }
}

export async function inspectApk(path: string) {
  await new Promise<void>((resolve, reject) => {
    open(path, { lazyEntries: true, validateEntrySizes: true, strictFileNames: true }, (error, zip) => {
      if (error || !zip) return reject(new BadRequestException('Invalid APK archive'));
      let count = 0;
      let expanded = 0;
      let manifest = false;
      const names = new Set<string>();
      const fail = () => { zip.close(); reject(new BadRequestException('Invalid or excessively complex APK archive')); };
      zip.on('error', fail);
      zip.on('entry', entry => {
        count++;
        expanded += entry.uncompressedSize;
        if (count > 50000 || expanded > 4 * 1024 ** 3 || names.has(entry.fileName) ||
            entry.fileName.split('/').includes('..') || entry.fileName.startsWith('/') ||
            entry.generalPurposeBitFlag & 1) return fail();
        names.add(entry.fileName);
        if (entry.fileName === 'AndroidManifest.xml' && entry.uncompressedSize > 0) manifest = true;
        zip.readEntry();
      });
      zip.on('end', () => manifest ? resolve() : reject(new BadRequestException('APK must contain AndroidManifest.xml')));
      if (zip.entryCount > 50000) return fail();
      zip.readEntry();
    });
  });
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

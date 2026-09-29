// Run after the API build: node --test test/mobile-app-storage.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createS3Storage } = require('../dist/src/uploads/s3-storage.config');
const { MobileAppService } = require('../dist/src/mobile-app/mobile-app.service');

const config = values => ({ get: key => values[key] });
const aws = {
  AWS_S3_BUCKET: 'existing-crm-bucket',
  AWS_REGION: 'ap-south-1',
  AWS_ACCESS_KEY_ID: 'test-key',
  AWS_SECRET_ACCESS_KEY: 'test-secret',
};

test('APK service uses the existing AWS bucket without a separate APK setting', () => {
  const service = new MobileAppService({}, config(aws));
  assert.equal(service.storage.bucket, aws.AWS_S3_BUCKET);
  assert.ok(service.storage.client);
  service.storage.client.destroy();
});

test('existing S3 aliases remain supported', async () => {
  const storage = createS3Storage(config({
    S3_BUCKET: 'existing-compatible-bucket', S3_REGION: 'test-region',
    S3_ACCESS_KEY: 'test-key', S3_SECRET_KEY: 'test-secret',
    S3_ENDPOINT: 'https://storage.example.com',
  }));
  assert.equal(storage.bucket, 'existing-compatible-bucket');
  assert.equal(await storage.client.config.region(), 'test-region');
  assert.equal((await storage.client.config.endpoint()).hostname, 'storage.example.com');
  storage.client.destroy();
});

test('AWS settings retain precedence over legacy aliases', () => {
  const storage = createS3Storage(config({ ...aws, S3_BUCKET: 'legacy-bucket' }));
  assert.equal(storage.bucket, aws.AWS_S3_BUCKET);
  storage.client.destroy();
});

test('APK uploads fail closed without S3 and never use local public storage', () => {
  const service = new MobileAppService({}, config({}));
  assert.throws(() => service.requireStorage(), /S3 storage is not configured/);
});

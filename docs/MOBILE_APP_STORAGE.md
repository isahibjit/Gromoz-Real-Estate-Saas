# Android APK storage

APK releases reuse the same S3 configuration and bucket as existing media uploads:

- `AWS_S3_BUCKET` (or the existing `S3_BUCKET` alias).
- Existing AWS/S3 region, access key, secret key and optional `S3_ENDPOINT`.
- No separate APK bucket or additional credentials are required.

APKs are stored under `mobile-app/<release-uuid>.apk`. Existing image and video
paths remain unchanged. APK uploads require S3; they never fall back to a local
public URL. Downloads use a 60-second signed URL rather than the public media URL.

## Required bucket access review

A different prefix does not itself make objects private. Before deploying,
ensure anonymous/public read grants do not cover `mobile-app/*`. If the bucket
currently grants public reads to all objects, narrow those grants to the existing
public media prefixes without breaking their URLs. Also check CDN origins and
access policies so unpublished APKs are not exposed through a public CDN route.
Do not make the entire existing bucket private without reviewing media access.

The API identity needs PutObject, GetObject (including HEAD) and DeleteObject
permissions for `mobile-app/*`; DeleteObject is used only to clean failed uploads.
It does not expose a release-deletion API. Existing credentials must already have
these permissions or have their IAM policy extended by the storage administrator.

Verify a draft object's unsigned URL is inaccessible, then publish and test the
signed download URL. Previously issued signed URLs can remain valid for their
remaining lifetime after unpublishing. Bucket policies, deployment and real-device
installation have not been verified by local build or unit tests.

# Mobile app deployment: 9 September 2026

Deployed the local APK feature changes to the existing CRM server checkout.
The base commit on both machines was
`9575ba6de7e601c6bcca1baed6e2926f0f1e328c`. Changes were transferred as a scoped
source archive, not committed or pushed to GitHub. Existing server `.env` files,
uploads, deploy keys and unrelated untracked scripts were preserved.

## Live routes

- Public landing page: https://crmtrueroot.com/download-app
- Admin settings: https://crmtrueroot.com/settings/mobile-app
- Public metadata: https://crmtrueroot.com/api/public/mobile-app
- Download redirect: https://crmtrueroot.com/api/public/mobile-app/download

Migration `20260909120000_mobile_app_releases` was the only pending migration and
was applied. API and web builds ran in staging before activation. The live Nginx
site (`/etc/nginx/sites-available/truroot`) now has a dedicated APK upload location
with a 201 MiB request-body allowance and 600-second upload/proxy timeouts.
Other locations and SSL configuration were preserved. PM2 `truroot-api` was
restarted and its process configuration saved.

## Same-bucket privacy

The existing S3 bucket and credentials are reused. Its existing public-media
policy was retained. An additional `PrivateCrmApkDownloads` denial restricts
GetObject/GetObjectVersion for `mobile-app/*` to the configured API IAM user and
the owning account root principal. Other principals, including anonymous users,
cannot read this prefix. Credential rotation to a different IAM user/role must
include a review of this policy's allowed principal ARNs.

Using a temporary test object (not an APK), unsigned access returned 403 and a
signed URL returned 200. An existing public image returned 200 both before and
after the policy change. The temporary test object was deleted.

## Verification

- Staging API and web builds passed; web retains a large-bundle warning.
- Four storage configuration tests passed on the server.
- HTTPS login, landing and settings SPA routes returned 200 and referenced the
  new frontend bundle. This is HTTP verification, not authenticated visual QA.
- Public metadata returned `{ "release": null }` with `Cache-Control: no-store`.
- Unpublished download returned 404 with `no-store`.
- Unauthenticated history/upload/publish/unpublish requests returned 401.
- PM2 remained online after activation without a crash restart.

No real APK was published. Authorized upload/publish/rollback behavior, browser
visuals, cancellation, concurrency, checksum round-trip and installation on an
Android device still require acceptance testing. Do not announce app availability
until an administrator uploads and publishes a verified signed release.

## Recovery assets

Server deployment directory: `/home/ubuntu/deployments/apk-20260909`.
Its private `backup/` directory contains the pre-deployment PostgreSQL custom dump,
source archive, compiled API, old dependencies, live website archive, Nginx site
and original S3 bucket policy. Keep these backups private; do not publish them or
commit them. Hashed web assets were retained to support already-open sessions.

For rollback, stop PM2 before restoring the prior compiled API and dependency
directories, then restart and verify it. Restore the web archive and previous
Nginx site as needed, testing Nginx before reloading. The additive APK tables need
not be dropped for a code rollback. Do not restore the entire database casually,
as that would discard CRM writes made after deployment. Keep the APK-prefix
privacy rule unless a reviewed replacement provides equivalent protection.

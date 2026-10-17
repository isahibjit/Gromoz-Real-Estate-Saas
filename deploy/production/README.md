# Production deployment

Target: `https://crm.gromoze.com`, Ubuntu host `13.201.20.104`.

The public GitHub origin is cloned over HTTPS in `/srv/gromoze/app`, owned by
`ubuntu`. No GitHub password or private deploy key is required to pull this public
repository. Runtime uses the restricted `gromoze` system user.

## Files and services

- `/etc/gromoze/api.env`: production secrets, root:gromoze, mode 640. Preserve the
  encryption secrets when updating or restoring; existing encrypted values depend on them.
- `/var/lib/gromoze/uploads`: persistent local uploads, linked from `apps/api/uploads`.
- `/var/lib/gromoze/tmp`: temporary APK upload files.
- `gromoze-api.service`: Nest API on loopback port 5002; automatic restart and boot startup.
- `/etc/nginx/sites-available/gromoze`: SPA, API, uploads and WebSocket proxy.
- Certbot manages the domain certificate and renewal timer. After initial installation,
  do not overwrite its TLS configuration with the HTTP bootstrap `nginx.conf`.
- `gromoze-backup.timer`: daily database and upload backups at 02:10 UTC
  (07:40 IST), retained for seven days in `/var/backups/gromoze`.

## Update

Commit and push changes to `origin/main`, SSH in as `ubuntu`, then run:

```sh
bash /srv/gromoze/app/deploy/production/deploy.sh
sudo systemctl status gromoze-api --no-pager
curl --fail https://crm.gromoze.com/api/health/ready
```

The script installs locked dependencies, builds shared code and both apps, backs up
data, applies committed migrations, restarts the API, and checks database/Redis
readiness. It preserves environment files and uploads. Deployment is in place and
can briefly interrupt requests; it is not a zero-downtime release system. Before
reverting an application commit, check whether new database migrations are backward compatible.

## First administrator

Use the bootstrap helper only on a new empty user database:

```sh
cd /srv/gromoze/app
node --env-file=apps/api/.env deploy/production/bootstrap-admin.cjs \
  superadmin@gromoze.com /home/ubuntu/gromoze-production-login.json
```

It generates a unique password, stores its hash, and saves credentials to a private
file without logging them. It refuses existing users or an existing credential
file. Do not run the development/demo seed scripts on production.

## Operations

```sh
sudo journalctl -u gromoze-api -n 100 --no-pager
sudo systemctl list-timers 'gromoze-*' 'certbot*'
sudo certbot renew --dry-run
sudo /usr/local/sbin/gromoze-backup
```

Backups currently live on this server. Copy them and `/etc/gromoze/api.env` to
protected off-server storage for recovery from loss of the instance. Restore a
database dump with `pg_restore` into a separate database first, and inspect it
before replacing live data. Upload archives restore under `/var/lib/gromoze`.

Third-party integrations require their production credentials: SMS/OTP, email,
WhatsApp, Meta, Razorpay, Google Maps and S3/APK storage. These are not provisioned
by installing the application. Image/document uploads use persistent local storage
when S3 is absent; mobile APK publication requires S3 configuration.

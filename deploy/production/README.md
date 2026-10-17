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

## GitHub Actions

`.github/workflows/ci-cd.yml` builds and runs named authentication, tenancy, portal,
upload and branding regression suites on pushes and pull requests. These focused
suites are not a claim of whole-product test coverage. Failures block deployment;
test errors are never ignored. A successful `main` push deploys automatically,
and the Actions tab also provides **Run workflow** on `main`.

The `production` GitHub environment permits deployments from `main` and contains:

- `PRODUCTION_SSH_HOST`: server IP.
- `PRODUCTION_SSH_USER`: `ubuntu`.
- `PRODUCTION_SSH_KEY`: a dedicated Actions private key, not the administrator PEM.
- `PRODUCTION_SSH_KNOWN_HOSTS`: the verified server host key in known_hosts format.

The corresponding public key in `/home/ubuntu/.ssh/authorized_keys` is restricted
to `/usr/local/sbin/gromoze-deploy-trigger`, installed from `deploy-trigger.sh`.
It cannot open an interactive shell or forward ports. The trigger accepts only
`deploy <40-character commit SHA>`. The deployment script verifies that commit
belongs to `origin/main`, requires a fast-forward, uses a deployment lock, and
builds the exact CI-tested revision. Application secrets remain on the server.

To rotate this key, install the new restricted public key, replace the encrypted
GitHub environment secret, test a deployment, then remove the old public key.
Do not remove the administrator's existing SSH key.

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

## Workspace domains and platform access

The platform console remains at `crm.gromoze.com`. Customer workspaces use
`<slug>.gromoze.com`; DNS must contain `A * -> 13.201.20.104`. Slugs are unique,
validated DNS labels. Infrastructure names such as `crm`, `www`, `api`, and
`admin` are reserved. Host resolution accepts our exact domain suffix, explicit
slugs, or verified custom domains; another domain's first label is never treated
as a tenant identifier.

Deployment installs `gromoze-tenant-domains.timer`. Every two minutes it reads
registered slugs, checks their DNS, obtains individual Let's Encrypt certificates
using HTTP-01, and installs matching nginx hosts. New workspace HTTPS can take
a few minutes. Existing Certbot renewal reloads nginx through a deploy hook.
Failed certificate attempts back off for six hours; inspect
`journalctl -u gromoze-tenant-domains`. Individual certificates are subject to the
CA's issuance limits; large onboarding batches need a DNS-01 wildcard deployment.
No DNS provider credentials are stored on the application server.

`POST /organizations/provision` reuses organization registration but requires a
currently active platform super administrator. It can create a 14-day trial with
an owner membership and deadline. Public registration cannot request a free
trial. Paid onboarding remains `SETUP_PENDING` until payment confirmation;
unavailable Razorpay must not roll a committed account into a misleading error.

Platform headers use the session identity and platform navigation. Employee
profile/payroll/attendance routes are not platform account routes. Platform
admins use `/superadmin/account`, and must explicitly select a workspace only
when inspecting its CRM. TenantGuard still rejects unscoped tenant requests.
Trial access ends at `trialEndsAt`; suspended and cancelled tenants stay blocked.

The audit view displays the latest 100 records, with counts and filters limited
to those records. IP and user-agent fields are returned when recorded; the UI
does not invent locations, percentage trends, or immutable-storage guarantees.

## Platform email and trial payment reminders

The production sender is configured in `/etc/gromoze/api.env`, never in Git or
GitHub Actions. SMTP configuration uses `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` and `SMTP_FROM_NAME`. Gmail uses an app
password, TLS on port 465, and the authenticated Gmail address as the sender.
Restart `gromoze-api` after changing configuration. Never print the environment file.

Existing CRM email and HR notification flows reuse the default connector when
one exists, otherwise the environment sender. Platform billing always uses the
environment sender so a workspace connector cannot take over billing messages.
Delivery logs record SMTP acceptance or failure, not proof of inbox delivery.

After deployment, send a delivery test and a clearly marked reminder preview to
the sender's own mailbox (two emails), and check their saved delivery logs:

```sh
cd /srv/gromoze/app
sudo -u gromoze node --env-file=/etc/gromoze/api.env deploy/production/verify-email.cjs
```

Set `BILLING_REMINDERS_ENABLED=true` only after configuring SMTP.
`BILLING_REMINDER_INTERVAL_MS` defaults to one hour; the worker also scans at API
startup. One payment reminder is sent per active workspace owner and trial end
date once that date has passed, with no advance notices or automatic charges.
Paid, active, suspended and cancelled workspaces are excluded. `SETUP_PENDING`
and `PAST_DUE` workspaces qualify only when a trial deadline is recorded; an old
unpaid signup is not automatically treated as a free trial.

The existing organization status service records a 14-day deadline when an
administrator first grants `TRIAL`; status edits preserve that deadline. Legacy
`TRIAL` rows without a deadline use creation date plus 14 days. Explicit deadlines
are honored. This does not change login/access policies or grant trials to new
signups automatically. The newer `/platform/tenants/provision` wizard API is not
implemented by this backend; it must be integrated separately before that wizard
can create trial records here.

The worker pages through organizations, rechecks payment/status before sending,
uses Redis recipient locks and successful `EmailLog` records to suppress repeat
reminders across restarts, and retries failures on later scans. SMTP and database
writes cannot be atomic: a crash or log-write failure after SMTP acceptance can
lead to a retry. Check sent mail before manually retrying an ambiguous delivery.
The reminder asks owners to reply for payment assistance; it does not fabricate a
checkout URL or invoice. Razorpay credentials remain necessary for online payment.

Third-party integrations require their production credentials: SMS/OTP,
WhatsApp, Meta, Razorpay, Google Maps and S3/APK storage. These are not provisioned
by installing the application. Image/document uploads use persistent local storage
when S3 is absent; mobile APK publication requires S3 configuration.

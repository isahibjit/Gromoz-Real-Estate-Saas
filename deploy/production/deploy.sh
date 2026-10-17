#!/usr/bin/env bash
# Run as ubuntu. Requires the production service, environment and backup helper.
set -euo pipefail
cd /srv/gromoze/app
exec 9>/srv/gromoze/deploy.lock
flock -n 9 || { echo 'Another deployment is running.' >&2; exit 1; }
expected_commit="${1:-}"
if [ -n "$expected_commit" ] && [[ ! "$expected_commit" =~ ^[0-9a-f]{40}$ ]]; then
    echo 'Expected a full Git commit SHA.' >&2
    exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
    echo 'Deployment stopped: the server checkout has local changes.' >&2
    exit 1
fi
git fetch origin main
target_commit="${expected_commit:-origin/main}"
git merge-base --is-ancestor "$target_commit" origin/main
git merge --ff-only "$target_commit"
if [ -n "$expected_commit" ] && [ "$(git rev-parse HEAD)" != "$expected_commit" ]; then
    echo 'Server is ahead of this workflow commit; refusing to deploy a different revision.' >&2
    exit 1
fi
npm ci --include=dev --no-audit --no-fund
npm run build --workspace=@truroot/shared
npx prisma generate --schema=apps/api/prisma/schema.prisma
rm -rf apps/api/dist
npx tsc -p apps/api/tsconfig.build.json --incremental false
test -f apps/api/dist/src/main.js
VITE_API_URL=/api npm run build --workspace=web
sudo /usr/local/sbin/gromoze-backup
(cd apps/api && npx prisma migrate deploy)
sudo systemctl restart gromoze-api
bash deploy/production/install-tenant-domains.sh
for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:5002/health/ready; then
        sudo nginx -t
        sudo systemctl reload nginx
        curl --fail --silent --show-error https://crm.gromoze.com/api/health/ready
        echo
        git log -1 --format='Deployed %h %s'
        exit 0
    fi
    sleep 2
done
echo 'API readiness failed. Inspect sudo journalctl -u gromoze-api.' >&2
exit 1

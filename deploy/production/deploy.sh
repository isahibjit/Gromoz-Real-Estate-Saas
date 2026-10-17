#!/usr/bin/env bash
# Run as ubuntu. Requires the production service, environment and backup helper.
set -euo pipefail
cd /srv/gromoze/app
if [ -n "$(git status --porcelain)" ]; then
    echo 'Deployment stopped: the server checkout has local changes.' >&2
    exit 1
fi
git pull --ff-only origin main
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
for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:5002/health/ready; then
        sudo nginx -t
        sudo systemctl reload nginx
        echo
        git log -1 --format='Deployed %h %s'
        exit 0
    fi
    sleep 2
done
echo 'API readiness failed. Inspect sudo journalctl -u gromoze-api.' >&2
exit 1

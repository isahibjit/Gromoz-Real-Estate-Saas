#!/usr/bin/env bash
# Run as ubuntu; the runtime user must never be able to edit root-executed jobs.
set -euo pipefail
cd /srv/gromoze/app
sudo install -o root -g root -m 755 deploy/production/tenant-domains.py /usr/local/sbin/gromoze-tenant-domains.py
sudo install -o root -g root -m 644 deploy/production/gromoze-tenant-domains.service /etc/systemd/system/gromoze-tenant-domains.service
sudo install -o root -g root -m 644 deploy/production/gromoze-tenant-domains.timer /etc/systemd/system/gromoze-tenant-domains.timer
sudo install -d -m 755 /var/lib/letsencrypt
sudo install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
sudo install -o root -g root -m 755 deploy/production/reload-nginx.sh /etc/letsencrypt/renewal-hooks/deploy/gromoze-nginx
sudo systemctl daemon-reload
sudo systemctl enable --now gromoze-tenant-domains.timer

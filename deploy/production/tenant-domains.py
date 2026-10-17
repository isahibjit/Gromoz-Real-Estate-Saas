#!/usr/bin/env python3
"""Issue and renew workspace HTTPS using existing HTTP-01 and Certbot tooling.

Run as root from the installed systemd unit. Database credentials stay with the
runtime account. Only validated, persisted tenant slugs reach nginx or Certbot.
"""
import fcntl
import json
import pathlib
import socket
import subprocess
import time

APP = pathlib.Path('/srv/gromoze/app')
SITES = pathlib.Path('/etc/nginx/conf.d')
WEBROOT = '/var/lib/letsencrypt'
SERVER_IP = '13.201.20.104'
BASE_DOMAIN = 'gromoze.com'

LOCATIONS = r'''
    root /srv/gromoze/app/apps/web/dist;
    index index.html;
    server_tokens off;
    client_max_body_size 110m;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    location ^~ /.well-known/acme-challenge/ { root /var/lib/letsencrypt; }
    location = /api { return 308 /api/; }
    location /api/ {
        proxy_pass http://127.0.0.1:5002/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
    location /api/socket.io/ {
        proxy_pass http://127.0.0.1:5002/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5002/uploads/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location = /api/mobile-app/releases {
        client_max_body_size 201m;
        proxy_request_buffering off;
        proxy_pass http://127.0.0.1:5002/mobile-app/releases;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
    location /assets/ { try_files $uri =404; expires 1y; }
    location = /index.html { add_header Cache-Control "no-cache"; }
    location ~ /\.(?!well-known/) { deny all; }
    location / { try_files $uri $uri/ /index.html; }
'''


def install_config(path, content):
    old = path.read_text() if path.exists() else None
    if old == content:
        return
    temporary = path.with_suffix('.pending')
    temporary.write_text(content)
    temporary.chmod(0o644)
    temporary.replace(path)
    try:
        subprocess.run(['nginx', '-t'], check=True)
        subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
    except subprocess.CalledProcessError:
        if old is None:
            path.unlink()
        else:
            path.write_text(old)
        raise


def main():
    with open('/run/lock/gromoze-tenant-domains.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        pathlib.Path(WEBROOT).mkdir(parents=True, exist_ok=True)
        install_config(SITES / 'gromoze-tenants-http.conf', '''server {
    listen 80;
    listen [::]:80;
    server_name *.gromoze.com;
    location ^~ /.well-known/acme-challenge/ { root /var/lib/letsencrypt; }
    location / { return 308 https://$host$request_uri; }
}
''')
        node = r'''
const { PrismaClient } = require('@prisma/client');
const { TenantSlugSchema } = require('@truroot/shared');
const db = new PrismaClient();
(async () => {
  const rows = await db.organization.findMany({select:{slug:true}});
  console.log(JSON.stringify(rows.map(row=>row.slug).filter(slug=>TenantSlugSchema.safeParse(slug).success)));
})().catch(()=>{process.exitCode=1}).finally(()=>db.$disconnect());
'''
        result = subprocess.run([
            'sudo', '-u', 'gromoze', 'node', '--env-file=/etc/gromoze/api.env', '-e', node,
        ], cwd=APP, check=True, capture_output=True, text=True)
        slugs = json.loads(result.stdout)
        state = pathlib.Path('/var/lib/gromoze-domain-state')
        state.mkdir(mode=0o700, parents=True, exist_ok=True)
        failed = 0
        for slug in slugs:
            # Defense in depth: never interpolate unvalidated input into a config.
            import re
            if not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?', slug):
                continue
            host = f'{slug}.{BASE_DOMAIN}'
            certificate = f'gromoze-tenant-{slug}'
            cert_path = pathlib.Path('/etc/letsencrypt/live') / certificate
            retry_at = state / f'{slug}.retry'
            if retry_at.exists() and retry_at.stat().st_mtime > time.time() - 21600:
                continue
            try:
                if not cert_path.joinpath('fullchain.pem').exists():
                    addresses = {item[4][0] for item in socket.getaddrinfo(host, 80)}
                    if SERVER_IP not in addresses:
                        print(f'Skipping {host}: DNS does not point to this server.', flush=True)
                        continue
                    subprocess.run([
                        'certbot', 'certonly', '--webroot', '-w', WEBROOT,
                        '--cert-name', certificate, '-d', host, '--non-interactive',
                        '--agree-tos', '--email', 'solverixtechnologies@gmail.com',
                    ], check=True, timeout=180)
                tls = f'''server {{
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name {host};
    ssl_certificate {cert_path}/fullchain.pem;
    ssl_certificate_key {cert_path}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
{LOCATIONS}
}}
'''
                install_config(SITES / f'gromoze-tenant-{slug}.conf', tls)
            except (subprocess.SubprocessError, OSError) as error:
                failed += 1
                retry_at.touch()
                print(f'Workspace HTTPS setup failed for {host}: {type(error).__name__}', flush=True)
        print(f'Workspace domain scan complete: {len(slugs)} registered slugs, {failed} failures.', flush=True)
        if failed:
            raise SystemExit(1)


if __name__ == '__main__':
    main()

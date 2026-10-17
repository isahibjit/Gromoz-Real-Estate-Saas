#!/usr/bin/env bash
set -euo pipefail
umask 077
backup_dir=/var/backups/gromoze
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup_dir"
# Peer authentication avoids putting the production database password in arguments.
runuser -u postgres -- pg_dump --format=custom gromoze > "$backup_dir/gromoze-$timestamp.dump.tmp"
mv "$backup_dir/gromoze-$timestamp.dump.tmp" "$backup_dir/gromoze-$timestamp.dump"
tar -czf "$backup_dir/gromoze-$timestamp-uploads.tar.gz.tmp" -C /var/lib/gromoze uploads
mv "$backup_dir/gromoze-$timestamp-uploads.tar.gz.tmp" "$backup_dir/gromoze-$timestamp-uploads.tar.gz"
find "$backup_dir" -maxdepth 1 -type f -name 'gromoze-*' ! -name '*.tmp' -mtime +6 -delete

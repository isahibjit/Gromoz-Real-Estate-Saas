#!/usr/bin/env bash
# Install root-owned at /usr/local/sbin/gromoze-deploy-trigger.
# The dedicated Actions SSH key can execute only: deploy <full commit SHA>.
set -euo pipefail
if [[ "${SSH_ORIGINAL_COMMAND:-}" =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
    exec bash /srv/gromoze/app/deploy/production/deploy.sh "${BASH_REMATCH[1]}"
fi
echo 'Only deployment of a main-branch commit is permitted.' >&2
exit 1

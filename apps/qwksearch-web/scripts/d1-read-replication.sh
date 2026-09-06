#!/usr/bin/env bash
#
# Show, enable or disable D1 read replication for this app's database.
#
# Read replication is a property of the database itself, not of the Worker, so
# wrangler.jsonc cannot carry it — it is flipped once per database, either in
# the dashboard (D1 > qwksearch-new > Settings > Enable Read Replication) or with
# this script. Turning it on makes D1 answer reads from a replica in the
# region nearest the request instead of from the single primary instance.
#
# The Sessions API wiring in lib/database/d1-session.ts is what keeps those
# replica reads sequentially consistent. It is a no-op while replication is off and keeps
# working if replication is turned back off later, so the two changes can be
# made in either order.
#
# Usage:
#   export CLOUDFLARE_ACCOUNT_ID=...
#   export CLOUDFLARE_API_TOKEN=...     # D1:Read for status, D1:Edit to change
#   ./scripts/d1-read-replication.sh [status|enable|disable]
#
# Note: disabling takes up to 24 hours for replicas to stop serving requests.
set -euo pipefail

DATABASE_NAME="qwksearch-new"
DATABASE_ID="b0ba9a66-e256-43dd-9083-062977c282a4"
ACTION="${1:-status}"

: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN}"

API="https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${DATABASE_ID}"

case "$ACTION" in
  status)
    curl -fsS -X GET "$API" -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}"
    ;;
  enable)
    curl -fsS -X PUT "$API" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"read_replication": {"mode": "auto"}}'
    ;;
  disable)
    curl -fsS -X PUT "$API" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d '{"read_replication": {"mode": "disabled"}}'
    ;;
  *)
    echo "usage: $0 [status|enable|disable]   (database: $DATABASE_NAME)" >&2
    exit 64
    ;;
esac

echo

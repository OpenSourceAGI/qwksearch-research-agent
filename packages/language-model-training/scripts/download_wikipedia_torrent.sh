#!/usr/bin/env bash
# Downloads a Wikipedia XML dump via BitTorrent using aria2c, falling back to
# plain HTTP (also via aria2c, multi-connection) if no .torrent is published
# for the requested dump file.
#
# Wikimedia publishes a .torrent alongside most dump files at
# https://dumps.wikimedia.org/<lang>wiki/latest/ - downloading via torrent
# spreads load across seeders instead of hammering Wikimedia's servers
# directly, and gives resumable, integrity-checked, multi-source transfer
# for files that can be 20GB+ compressed.
#
# Usage:
#   ./scripts/download_wikipedia_torrent.sh
#   WIKI_LANG=simple ./scripts/download_wikipedia_torrent.sh
#   WIKI_DUMP_FILE=enwiki-latest-pages-articles.xml.bz2 ./scripts/download_wikipedia_torrent.sh
#
# Env vars:
#   WIKI_LANG        Wikipedia language code (default: en)
#   WIKI_DUMP_FILE    Dump filename to fetch (default: <lang>wiki-latest-pages-articles-multistream.xml.bz2)
#   WIKI_DATA_DIR     Output directory (default: /app/data, or ./data outside Docker)
#   ARIA2_OPTS        Extra space-separated flags passed through to aria2c

set -euo pipefail

LANG_CODE="${WIKI_LANG:-en}"
DUMP_FILE="${WIKI_DUMP_FILE:-${LANG_CODE}wiki-latest-pages-articles-multistream.xml.bz2}"
BASE_URL="https://dumps.wikimedia.org/${LANG_CODE}wiki/latest"
TORRENT_URL="${BASE_URL}/${DUMP_FILE}.torrent"
HTTP_URL="${BASE_URL}/${DUMP_FILE}"
OUT_DIR="${WIKI_DATA_DIR:-$( [ -d /app ] && echo /app/data || echo ./data )}"
ARIA2_OPTS="${ARIA2_OPTS:-}"

mkdir -p "$OUT_DIR"

if ! command -v aria2c >/dev/null 2>&1; then
  echo "aria2c not found. Install it first:" >&2
  echo "  Debian/Ubuntu: apt-get install -y aria2" >&2
  echo "  macOS:         brew install aria2" >&2
  exit 1
fi

COMMON_OPTS=(
  --dir="$OUT_DIR"
  --continue=true
  --max-connection-per-server=16
  --split=16
  --min-split-size=10M
  --max-tries=5
  --retry-wait=10
  --summary-interval=15
  --console-log-level=notice
)

echo "Wikipedia dump:  $DUMP_FILE"
echo "Output dir:      $OUT_DIR"
echo "Torrent source:  $TORRENT_URL"
echo

TORRENT_PATH="${OUT_DIR}/${DUMP_FILE}.torrent"

if curl -fsSL -o "$TORRENT_PATH" "$TORRENT_URL" 2>/dev/null && [ -s "$TORRENT_PATH" ]; then
  echo "Torrent metadata found - downloading via BitTorrent (seeds + HTTP webseed fallback)..."
  # --seed-time=0: this is a one-shot fetch, don't seed back after completion
  # --bt-stop-timeout: give up on dead torrents and let a retry fall through to HTTP
  aria2c "${COMMON_OPTS[@]}" \
    --seed-time=0 \
    --bt-stop-timeout=180 \
    --bt-tracker-connect-timeout=30 \
    $ARIA2_OPTS \
    "$TORRENT_PATH" \
    || {
      echo "Torrent download stalled or failed, falling back to direct HTTP..." >&2
      rm -f "$TORRENT_PATH"
      aria2c "${COMMON_OPTS[@]}" $ARIA2_OPTS "$HTTP_URL"
    }
  rm -f "$TORRENT_PATH"
else
  echo "No torrent published for this file - downloading directly over HTTP via aria2c..."
  rm -f "$TORRENT_PATH"
  aria2c "${COMMON_OPTS[@]}" $ARIA2_OPTS "$HTTP_URL"
fi

echo
echo "Done: ${OUT_DIR}/${DUMP_FILE}"

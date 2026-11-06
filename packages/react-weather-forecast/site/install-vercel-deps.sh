#!/usr/bin/env bash
# Vercel install for this site (the Vercel project's root directory is
# packages/react-weather-forecast/site).
#
# The site is deliberately not a Bun workspace: it installs the published
# `use-weather-forecast` from npm, so the demo shows exactly what users get.
# --prefix pins npm to this directory; without it npm walks up to the repo
# root, sees the monorepo "workspaces" list and fails on other packages'
# workspace:* deps (EUNSUPPORTEDPROTOCOL).

set -e

SITE_ABS="$(cd "$(dirname "$0")" && pwd)"
npm install --prefix "$SITE_ABS" --no-audit --no-fund

#!/usr/bin/env bash
# Build for Laravel Cloud (Go runtime): the Vue app into ./dist, then the Go
# server into ./app. At runtime `./app` serves the API and ./dist together.
set -euo pipefail

PNPM="npx --yes pnpm@11.20.0"
$PNPM install --frozen-lockfile
$PNPM build

CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o app ./cmd/server

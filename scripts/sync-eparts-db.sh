#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$ROOT/public/database/eparts.db"

cd "$ROOT"

if ! git rev-parse --verify gh-pages >/dev/null 2>&1; then
  echo "Fetching gh-pages branch..."
  git fetch origin gh-pages:gh-pages
fi

git show gh-pages:public/database/eparts.db > "$TARGET"
BYTES=$(wc -c < "$TARGET" | tr -d ' ')
echo "Synced eparts.db from gh-pages (${BYTES} bytes) -> public/database/eparts.db"

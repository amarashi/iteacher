#!/bin/sh
# iTeacher launcher for Linux (#11).
# Boots the built local server and opens the default browser (via xdg-open).
# Run with: ./launchers/iteacher.sh  (or mark executable and double-click).
set -e

# Project root is this script's parent folder (launchers/ sits under the root).
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Build once if the compiled server isn't there yet.
if [ ! -f "dist/server/main.js" ]; then
  echo "Building iTeacher for first use..."
  pnpm build
fi

# --open tells the server to open the browser once it is actually listening.
exec node dist/server/main.js --open

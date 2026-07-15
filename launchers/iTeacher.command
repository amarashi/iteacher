#!/bin/sh
# iTeacher double-click launcher for macOS (#11).
# Boots the built local server and opens the default browser at the served URL.
# Make it double-clickable once with: chmod +x iTeacher.command
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

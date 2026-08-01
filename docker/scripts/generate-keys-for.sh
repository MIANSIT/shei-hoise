#!/bin/sh
# The vendored generate-keys.sh hardcodes ".env" in the current directory.
# This wraps it so it can update any env file (docker/.env or docker/.env.prod).
#
# Usage: docker/scripts/generate-keys-for.sh docker/.env
#        docker/scripts/generate-keys-for.sh docker/.env.prod
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET="$1"

if [ -z "$TARGET" ] || [ ! -f "$TARGET" ]; then
  echo "Usage: $0 <path-to-env-file>" >&2
  echo "  (the file must already exist — copy it from .env.example / .env.prod.example first)" >&2
  exit 1
fi

TARGET="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cp "$TARGET" "$TMPDIR/.env"
(cd "$TMPDIR" && "$SCRIPT_DIR/generate-keys.sh" --update-env)
cp "$TMPDIR/.env" "$TARGET"

echo "Updated $TARGET"

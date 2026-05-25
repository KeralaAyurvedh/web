#!/bin/sh
set -eu

if [ -n "${DIRECT_URL:-}" ]; then
  echo "Running Prisma migrations with DIRECT_URL."
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
  echo "DIRECT_URL is not set. Running Prisma migrations with DATABASE_URL."
  npx prisma migrate deploy
fi

exec node dist/index.js

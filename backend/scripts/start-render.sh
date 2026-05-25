#!/bin/sh
set -eu

if [ -n "${DIRECT_URL:-}" ]; then
  echo "Running Prisma migrations with DIRECT_URL."
  DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy
else
  echo "DIRECT_URL is not set. Running Prisma migrations with DATABASE_URL."
  npx prisma migrate deploy
fi

if [ "${RUN_SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "RUN_SEED_ON_STARTUP=true. Running production seed."
  node dist/seed.js
fi

exec node dist/index.js

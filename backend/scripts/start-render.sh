#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS_ON_STARTUP:-false}" = "true" ]; then
  if [ -n "${DIRECT_URL:-}" ]; then
    echo "Running Prisma migrations with DIRECT_URL."
    if ! npx prisma migrate deploy; then
      echo "Prisma migrations failed with DIRECT_URL. Retrying with DATABASE_URL."
      DIRECT_URL="" npx prisma migrate deploy
    fi
  else
    echo "DIRECT_URL is not set. Running Prisma migrations with DATABASE_URL."
    npx prisma migrate deploy
  fi
else
  echo "RUN_MIGRATIONS_ON_STARTUP is not true. Skipping startup migrations."
fi

if [ "${RUN_SEED_ON_STARTUP:-false}" = "true" ]; then
  echo "RUN_SEED_ON_STARTUP=true. Running production seed."
  node dist/seed.js
fi

exec node dist/index.js

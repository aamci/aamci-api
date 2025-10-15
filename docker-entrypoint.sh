#!/bin/sh
set -e
if [ -d prisma ]; then
  if [ -n "$PRISMA_MIGRATIONS" ]; then
    npx prisma migrate deploy
  else
    npx prisma db push
  fi
fi
exec node dist/main.js
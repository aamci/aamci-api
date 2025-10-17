#!/bin/sh
set -e

echo "🏁 Starting pre-start tasks..."
# Example: Run Prisma migrations or push schema
if [ -d prisma ]; then
  echo "📦 Running Prisma generate..."
  npx prisma generate

  if [ "$PRISMA_MIGRATIONS" = "1" ]; then
    echo "🚀 Running prisma migrate deploy..."
    npx prisma migrate deploy
  else
    echo "🧩 Pushing Prisma schema (dev mode)..."
    npx prisma db push
  fi
fi

echo "✅ Pre-start complete — launching NestJS app..."
exec "$@"
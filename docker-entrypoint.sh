#!/bin/sh
set -e

echo "🏁 Starting pre-start tasks..."

# Example: Wait for the database (optional)
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for database to be reachable..."
  i=0
  until nc -z "$(echo $DATABASE_URL | awk -F[@:/] '{print $5}')" 5432 || [ $i -ge 20 ]; do
    i=$((i+1))
    sleep 2
  done
fi

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
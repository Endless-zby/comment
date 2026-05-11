#!/bin/sh
set -e

echo "============================================"
echo "  酒店评价监控系统 - Starting..."
echo "============================================"

mkdir -p /app/prisma/data
echo "[entrypoint] Data directory ready: /app/prisma/data"

echo "[entrypoint] Running prisma db push..."
npx prisma db push --accept-data-loss --schema=/app/prisma/schema.prisma 2>&1 || true

if [ ! -f /app/prisma/data/reviews.db ]; then
    echo "[entrypoint] No database found, creating fresh database..."
    npx prisma db push --accept-data-loss --schema=/app/prisma/schema.prisma
fi

echo "[entrypoint] Database ready. Starting application..."
echo "============================================"

exec "$@"

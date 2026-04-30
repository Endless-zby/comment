#!/bin/sh
set -e

# Run Prisma db push to ensure database schema
npx prisma db push --skip-generate

# Start the application
exec "$@"
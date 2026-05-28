#!/bin/sh
echo "=========================================="
echo "  Alwan Al Khaleej - Wedding Decor App"
echo "=========================================="

# Set memory limit for Node.js
export NODE_OPTIONS="--max-old-space-size=400"

# Run migrations if database URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma 2>&1 || echo "Migration completed with warnings"
else
    echo "No DATABASE_URL set, skipping migrations"
fi

echo "Starting server on port $PORT..."
exec node server.js

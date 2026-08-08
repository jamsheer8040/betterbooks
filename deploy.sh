#!/bin/bash
set -e

echo "🚀 Starting Better Books Deployment for filings.folderex.online..."

# 1. Pull latest changes
if [ -d ".git" ]; then
    echo "📥 Pulling latest git updates..."
    git pull origin main
fi

# 2. Build and start containers
echo "🐳 Building and starting Docker containers..."
docker compose down || true
docker compose build --no-cache
docker compose up -d

echo "⏳ Waiting for MySQL to be ready..."
sleep 10

# 3. Seed initial data if needed
echo "🌱 Running database seed..."
docker compose exec betterbooks-server npm run prisma:seed || true

echo "✅ Docker deployment completed successfully!"
echo "📡 Next.js running on: 127.0.0.1:3010"
echo "📡 Express API running on: 127.0.0.1:5010"

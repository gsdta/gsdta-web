#!/bin/bash
set -e

echo "🚀 Starting GSDTA Local Development Stack with Docker"
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running!"
    echo ""
    echo "Please start Docker Desktop and try again."
    exit 1
fi

# Kill any processes blocking Firebase emulator ports
echo "🔍 Checking for processes blocking emulator ports..."
for port in 4445 8889 9099 4400 3000 8080; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        echo "   Killing process $pid on port $port..."
        kill -9 $pid 2>/dev/null || true
    fi
done
echo "✅ Ports cleared"

# Stop any existing containers
echo "🧹 Stopping existing containers..."
docker-compose -f docker-compose.local.yml down 2>/dev/null || true

# Check if .env.local files exist, if not copy from emulator templates
if [ ! -f "ui/.env.local" ]; then
    echo "📝 Creating ui/.env.local from template..."
    cp ui/.env.local.emulator ui/.env.local
    echo "✅ Created ui/.env.local"
fi

if [ ! -f "api/.env.local" ]; then
    echo "📝 Creating api/.env.local from template..."
    cp api/.env.local.emulator api/.env.local
    echo "✅ Created api/.env.local"
fi

echo ""
echo "🐳 Starting Docker Compose stack..."
echo ""
echo "📍 Services will be available at:"
echo "   UI:           http://localhost:3000"
echo "   API:          http://localhost:8080"
echo "   Emulator UI:  http://localhost:4445"
echo ""

docker-compose -f docker-compose.local.yml up --build

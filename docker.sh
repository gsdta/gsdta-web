#!/bin/bash

# Docker management script for GSDTA Web (UI + API)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  build       Build the production Docker image (UI + API)"
    echo "  build-dev   Build the development Docker images"
    echo "  run         Run the production container"
    echo "  run-dev     Run the development containers with hot reloading"
    echo "  stop        Stop all running containers"
    echo "  clean       Remove all containers and images"
    echo "  logs        Show container logs"
    echo "  shell       Open a shell in the running container"
    echo "  help        Show this help message"
}

# Build production image
build() {
    print_status "Building production Docker image (UI + API)..."
    docker build -t gsdta-web:latest .
    print_status "Production image built successfully!"
}

# Build development image
build_dev() {
    print_status "Building development Docker images..."
    docker-compose --profile dev build
    print_status "Development images built successfully!"
}

# Run production container
run() {
    print_status "Running production container..."
    docker-compose up -d ui
    print_status "Container started! Access at http://localhost:3000"
}

# Run development containers
run_dev() {
    print_status "Running development containers..."
    docker-compose --profile dev up -d
    print_status "Development containers started! Access UI at http://localhost:3001"
}

# Stop all containers
stop() {
    print_status "Stopping containers..."
    docker-compose down || true
    docker-compose --profile dev down || true
    print_status "All containers stopped"
}

# Clean up everything
clean() {
    print_status "Cleaning up containers and images..."
    docker-compose down -v --rmi local || true
    docker-compose --profile dev down -v --rmi local || true
    print_status "Cleanup complete"
}

# Show logs
logs() {
    print_status "Showing container logs (Ctrl+C to exit)..."
    docker-compose logs -f
}

# Open shell in container
shell() {
    print_status "Opening shell in running container..."
    docker-compose exec ui sh
}

# Main command handler
case "$1" in
    build)
        build
        ;;
    build-dev)
        build_dev
        ;;
    run)
        run
        ;;
    run-dev)
        run_dev
        ;;
    stop)
        stop
        ;;
    clean)
        clean
        ;;
    logs)
        logs
        ;;
    shell)
        shell
        ;;
    help|--help|-h|"")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        exit 1
        ;;
esac

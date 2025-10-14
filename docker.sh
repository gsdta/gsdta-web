#!/bin/bash

# Docker management script for the UI application

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
    echo "  build       Build the production Docker image"
    echo "  build-dev   Build the development Docker image"
    echo "  run         Run the production container"
    echo "  run-dev     Run the development container with hot reloading"
    echo "  stop        Stop all running containers"
    echo "  clean       Remove all containers and images"
    echo "  logs        Show container logs"
    echo "  shell       Open a shell in the running container"
    echo "  help        Show this help message"
}

# Build production image
build() {
    print_status "Building production Docker image..."
    docker build -t gsdta-ui:latest .
    print_status "Production image built successfully!"
}

# Build development image
build_dev() {
    print_status "Building development Docker image..."
    docker build -f Dockerfile.dev -t gsdta-ui:dev .
    print_status "Development image built successfully!"
}

# Run production container
run() {
    print_status "Starting production container..."
    docker-compose up -d ui
    print_status "Production container started on http://localhost:3000"
}

# Run development container
run_dev() {
    print_status "Starting development container with hot reloading..."
    docker-compose --profile dev up -d ui-dev
    print_status "Development container started on http://localhost:3001"
}

# Stop containers
stop() {
    print_status "Stopping all containers..."
    docker-compose down
    print_status "All containers stopped!"
}

# Clean up
clean() {
    print_warning "This will remove all containers and images. Are you sure? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        print_status "Cleaning up containers and images..."
        docker-compose down --rmi all --volumes --remove-orphans
        print_status "Cleanup completed!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Show logs
logs() {
    docker-compose logs -f
}

# Open shell
shell() {
    container_id=$(docker-compose ps -q ui)
    if [ -z "$container_id" ]; then
        print_error "No running production container found. Start it first with: $0 run"
        exit 1
    fi
    docker exec -it "$container_id" /bin/sh
}

# Main script logic
case "${1:-}" in
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
    help|--help|-h)
        show_usage
        ;;
    *)
        print_error "Unknown command: ${1:-}"
        echo ""
        show_usage
        exit 1
        ;;
esac

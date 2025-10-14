# Docker Setup for GSDTA UI Application

This document provides instructions for containerizing and running the GSDTA UI application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and run production container:**

   ```bash
   docker-compose up --build -d ui
   ```

   The application will be available at http://localhost:3000

2. **Build and run development container with hot reloading:**
   ```bash
   docker-compose --profile dev up --build -d ui-dev
   ```
   The development server will be available at http://localhost:3001

### Using Management Scripts

For convenience, use the provided management scripts:

**On Linux/macOS:**

```bash
chmod +x docker.sh
./docker.sh build    # Build production image
./docker.sh run      # Run production container
./docker.sh run-dev  # Run development container
./docker.sh stop     # Stop all containers
./docker.sh clean    # Clean up containers and images
./docker.sh logs     # View container logs
./docker.sh shell    # Open shell in running container
```

**On Windows:**

```cmd
docker.bat build    # Build production image
docker.bat run      # Run production container
docker.bat run-dev  # Run development container
docker.bat stop     # Stop all containers
docker.bat clean    # Clean up containers and images
docker.bat logs     # View container logs
docker.bat shell    # Open shell in running container
```

## Manual Docker Commands

### Production Build

1. **Build the production image:**

   ```bash
   docker build -t gsdta-ui:latest .
   ```

2. **Run the production container:**
   ```bash
   docker run -d -p 3000:3000 --name gsdta-ui-prod gsdta-ui:latest
   ```

### Development Build

1. **Build the development image:**

   ```bash
   docker build -f Dockerfile.dev -t gsdta-ui:dev .
   ```

2. **Run the development container with hot reloading:**
   ```bash
   docker run -d -p 3001:3000 -v $(pwd):/app -v /app/node_modules -v /app/.next --name gsdta-ui-dev gsdta-ui:dev
   ```

## Docker Files Overview

- **`Dockerfile`**: Multi-stage production build optimized for size and security
- **`Dockerfile.dev`**: Development build with hot reloading support
- **`docker-compose.yml`**: Orchestrates both production and development containers
- **`.dockerignore`**: Excludes unnecessary files from Docker build context
- **`docker.sh`** / **`docker.bat`**: Management scripts for easy container operations

## Container Features

### Production Container

- Multi-stage build for optimized image size
- Non-root user for security
- Health checks included
- Standalone Next.js output for better performance
- Port 3000 exposed

### Development Container

- Hot reloading support
- Volume mounting for live code changes
- All dev dependencies included
- Port 3000 exposed (mapped to 3001 on host)

## Environment Variables

The containers support the following environment variables:

- `NODE_ENV`: Set to `production` or `development`
- `PORT`: Port number (default: 3000)
- `HOSTNAME`: Hostname (default: 0.0.0.0)

## Troubleshooting

### Common Issues

1. **Port already in use:**

   ```bash
   docker-compose down  # Stop existing containers
   ```

2. **Build failures:**

   ```bash
   docker system prune  # Clean up Docker cache
   docker-compose build --no-cache
   ```

3. **Permission issues on Linux/macOS:**

   ```bash
   chmod +x docker.sh
   ```

4. **View container logs:**

   ```bash
   docker-compose logs -f ui
   ```

5. **Access container shell:**
   ```bash
   docker-compose exec ui /bin/sh
   ```

### Performance Tips

- Use `.dockerignore` to exclude unnecessary files
- Leverage Docker layer caching by copying package files first
- Use multi-stage builds to reduce final image size
- Consider using Docker BuildKit for faster builds:
  ```bash
  DOCKER_BUILDKIT=1 docker build .
  ```

## Production Deployment

For production deployment, consider:

1. **Using environment-specific configurations**
2. **Setting up proper logging and monitoring**
3. **Implementing health checks**
4. **Using Docker secrets for sensitive data**
5. **Setting up reverse proxy (nginx, traefik, etc.)**

## Security Considerations

- The production container runs as a non-root user
- Minimal Alpine Linux base image
- No unnecessary packages installed
- Health checks implemented
- Proper file permissions set

## Next Steps

- Set up CI/CD pipeline for automated builds
- Consider using Kubernetes for orchestration
- Implement monitoring and logging solutions
- Set up automated security scanning

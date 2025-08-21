# Docker Setup for LangChain RAG API

This document explains how to run the LangChain RAG API using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Environment variables configured (see `.env.example`)

## Package Manager

This application uses **pnpm** as the package manager. The Dockerfiles follow a proven multi-stage build pattern:

- **Base stage**: Installs pnpm globally on Node.js 20.12.2 Alpine
- **Dependencies stage**: Installs all dependencies using pnpm
- **Builder stage**: Builds the TypeScript application
- **Runner stage**: Creates the final production image

## Quick Start

### 1. Production Mode

Build and run the application in production mode:

```bash
# Build and start the application
docker-compose up --build

# Or run in detached mode
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop the application
docker-compose down
```

### 2. Development Mode

Build and run the application in development mode with hot reloading:

```bash
# Build and start the development environment
docker-compose -f docker-compose.dev.yml up --build

# Or run in detached mode
docker-compose -f docker-compose.dev.yml up --build -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f

# Stop the development environment
docker-compose -f docker-compose.dev.yml down
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Docker Commands

### Building Images

```bash
# Build production image
docker build -t langchain-rag-api .

# Build development image
docker build -f Dockerfile.dev -t langchain-rag-api:dev .
```

### Running Containers

```bash
# Run production container
docker run -p 3000:3000 --env-file .env langchain-rag-api

# Run development container
docker run -p 3000:3000 --env-file .env -v $(pwd)/src:/app/src langchain-rag-api:dev
```

### Container Management

```bash
# List running containers
docker ps

# View container logs
docker logs <container_id>

# Execute commands in running container
docker exec -it <container_id> /bin/sh

# Stop and remove containers
docker-compose down
```

## File Structure

```
.
├── Dockerfile              # Production Docker image
├── Dockerfile.dev          # Development Docker image
├── docker-compose.yml      # Production compose file
├── docker-compose.dev.yml  # Development compose file
├── .dockerignore          # Files to exclude from Docker build
├── src/                   # Source code
├── uploads/               # File uploads directory
└── package.json           # Node.js dependencies
```

## Volumes

The application uses the following volumes:

- `./uploads:/app/uploads` - Persists uploaded files
- `./.env:/app/.env:ro` - Mounts environment variables (read-only)
- `./src:/app/src` - Development mode: mounts source code for hot reloading

## Health Checks

The production container includes health checks that verify the API is responding:

- **Endpoint**: `http://localhost:3000/api/`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3
- **Start Period**: 40 seconds

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the port mapping in docker-compose.yml
2. **Permission denied**: Ensure the uploads directory has proper permissions
3. **Environment variables not loaded**: Check that your `.env` file exists and is properly formatted
4. **pnpm installation failed**: The Dockerfiles include fallback installation methods

### Debugging

```bash
# View detailed build logs
docker-compose build --progress=plain

# View container logs
docker-compose logs -f langchain-rag-api

# Access container shell
docker exec -it langchain-rag-api /bin/sh

# Check container health
docker inspect langchain-rag-api | grep Health -A 10

# Test pnpm installation (if having issues)
docker exec -it langchain-rag-api /bin/sh -c "pnpm --version"
```

### Cleanup

```bash
# Remove all containers and images
docker-compose down --rmi all --volumes --remove-orphans

# Remove all unused Docker resources
docker system prune -a
```

## Performance Considerations

- The production image uses multi-stage builds for smaller final image size
- Alpine Linux base image for minimal footprint
- Non-root user for security
- Health checks for monitoring
- Volume mounting for persistent data

## Security

- Runs as non-root user (nodejs:nodejs)
- Read-only environment file mounting
- Minimal base image (Alpine Linux)
- No unnecessary packages installed

## pnpm Installation Troubleshooting

The Dockerfiles now use a proven approach inspired by working production deployments:

1. **Base stage**: Installs pnpm globally using `npm install -g pnpm`
2. **Multi-stage build**: Each stage inherits pnpm from the base stage
3. **Clean dependency management**: Dependencies are installed once and reused across stages

### Testing pnpm Installation

To debug pnpm installation issues:

```bash
# Build and run the container
docker-compose up --build

# In another terminal, test pnpm installation
docker exec -it langchain-rag-api /bin/sh -c "pnpm --version"
```

### Manual pnpm Installation

If you need to manually install pnpm (should not be necessary with the new structure):

```bash
# Access the container
docker exec -it langchain-rag-api /bin/sh

# Install pnpm manually
npm install -g pnpm

# Verify installation
pnpm --version
```

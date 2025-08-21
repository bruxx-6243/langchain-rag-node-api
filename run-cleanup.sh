#!/bin/bash

echo "Running uploads cleanup service..."

# Run the cleanup service
docker-compose --profile cleanup run --rm uploads-cleanup

echo "Cleanup completed!"

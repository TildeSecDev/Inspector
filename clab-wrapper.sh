#!/bin/bash
# Wrapper script for containerlab using Docker container
# This allows the 'clab' command to work via Docker container: ghcr.io/srl-labs/clab
# 
# Usage: clab [command] [args...]
# Examples:
#   clab deploy -t topology.clab.yml
#   clab destroy -t topology.clab.yml
#   clab inspect -t topology.clab.yml

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

# Check if running in a TTY
TTY_FLAG=""
if [ -t 0 ]; then
    TTY_FLAG="-it"
else
    TTY_FLAG="-i"
fi

# Run containerlab in Docker container with proper mounts
docker run --rm $TTY_FLAG --privileged \
    --network host \
    -v /var/run/docker.sock:/var/run/docker.sock \
    -v /var/run/netns:/var/run/netns \
    -v /etc/hosts:/etc/hosts \
    -v /var/lib/docker/containers:/var/lib/docker/containers \
    --pid="host" \
    -v "$(pwd):$(pwd)" \
    -w "$(pwd)" \
    ghcr.io/srl-labs/clab "$@"

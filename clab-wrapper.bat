@echo off
REM Wrapper script for containerlab using Docker container
REM This allows the 'clab' command to work via Docker container: ghcr.io/srl-labs/clab
REM Usage: clab [command] [args...]

REM Check if Docker is available
docker --version >nul 2>nul
if errorlevel 1 (
    echo Error: Docker is not installed or not in PATH
    echo Please install Docker Desktop from: https://www.docker.com/products/docker-desktop
    exit /b 1
)

REM Get current directory
for /f "tokens=*" %%i in ('cd') do set "CDIR=%%i"

REM Run containerlab in Docker container with proper mounts
docker run --rm -it --privileged ^
    --network host ^
    -v /var/run/docker.sock:/var/run/docker.sock ^
    -v /var/run/netns:/var/run/netns ^
    -v /etc/hosts:/etc/hosts ^
    -v /var/lib/docker/containers:/var/lib/docker/containers ^
    --pid="host" ^
    -v "%CDIR%:%CDIR%" ^
    -w "%CDIR%" ^
    ghcr.io/srl-labs/clab %*

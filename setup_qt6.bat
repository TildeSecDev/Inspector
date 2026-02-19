@echo off
REM Setup script for Inspector Twin PyQt6 Edition (Windows)

echo ===================================
echo Inspector Twin - PyQt6 Edition
echo Setup Script
echo ===================================
echo.

REM Check Python version
echo Checking Python version...
python --version
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    exit /b 1
)

REM Check for containerlab
echo.
echo Checking for containerlab...
where clab >nul 2>nul
if errorlevel 1 (
    echo containerlab is not installed.
    echo.
    echo Installation options:
    echo 1. Automated installation (Linux preferred):
    echo    Run: https://get.containerlab.dev
    echo.
    echo 2. Docker container approach (recommended for macOS and Windows):
    echo    Requires: Docker Desktop installed
    echo    Then use: docker run --rm -it --privileged --network host ^
    echo      -v /var/run/docker.sock:/var/run/docker.sock ^
    echo      -v /var/run/netns:/var/run/netns ^
    echo      ghcr.io/srl-labs/clab bash
    echo.
    echo 3. Manual installation:
    echo    Visit: https://containerlab.dev/install/
    echo.
    echo Attempting automated installation...
    powershell -Command "& { iwr -useb https://get.containerlab.dev | iex }" 2>nul
    
    where clab >nul 2>nul
    if errorlevel 1 (
        echo.
        echo Checkmark Automated installation did not complete.
        echo Use one of the options above, or Inspector can run without containerlab.
    ) else (
        echo Checkmark containerlab installed successfully
    )
) else (
    echo Checkmark containerlab is already installed
)

REM Create virtual environment
echo.
echo Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created
) else (
    echo Virtual environment already exists
)

REM Activate virtual environment
echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo.
echo Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt

REM Install in development mode
echo.
echo Installing Inspector Twin in development mode...
pip install -e .

echo.
echo ===================================
echo Setup complete!
echo ===================================
echo.
echo Starting Inspector Twin...
echo.
python -m inspector_qt6

pause

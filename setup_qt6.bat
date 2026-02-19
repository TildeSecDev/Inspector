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

@echo off
REM Inspector Twin Development Runner for Windows

echo Inspector Twin - Starting Development Environment
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed. Please install Node.js 18+ and try again.
    exit /b 1
)

echo Node.js detected
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed
)

REM Build packages
echo Building packages...
call npm run build --workspaces --if-present

REM Start the application
echo Starting Inspector Twin...
echo.
echo The application will open in a new window.
echo Press Ctrl+C to stop the development server.
echo.

cd apps\desktop
call npm run dev

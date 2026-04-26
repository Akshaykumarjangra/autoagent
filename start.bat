@echo off
title Autonomix Global Swarm — Enterprise Edition
color 0A

echo.
echo  ======================================================
echo     AUTONOMIX GLOBAL SWARM — ENTERPRISE EDITION
echo     Autonomous Digital Workforce Platform
echo  ======================================================
echo.

:: Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Install from https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Backend install failed.
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed.
echo.

echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Frontend install failed.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed.
echo.

echo [3/4] Starting backend server on port 5000...
cd /d "%~dp0backend"
start "Autonomix Backend" cmd /k "npm run dev"

:: Wait for backend to boot
timeout /t 4 /nobreak >nul

echo [4/4] Starting frontend dev server...
cd /d "%~dp0frontend"
start "Autonomix Frontend" cmd /k "npm run dev"

echo.
echo  ======================================================
echo     ALL SYSTEMS ONLINE
echo  ======================================================
echo.
echo   Backend:   http://localhost:5000
echo   Frontend:  http://localhost:5173
echo   Admin:     http://localhost:5173/#admin
echo   Health:    http://localhost:5000/api/health
echo.
echo   Admin login: akg45272@gmail.com
echo.
echo   Two new terminal windows have been opened.
echo   Press any key to close this launcher.
echo  ======================================================
pause >nul

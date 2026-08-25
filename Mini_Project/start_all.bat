@echo off
setlocal enabledelayedexpansion
title Clinical-NIDS Launcher

echo ============================================================
echo   Clinical-NIDS -- Starting All Services
echo ============================================================
echo.

set "SCRIPT_DIR=%~dp0"

echo [1/3] Starting ML Service (FastAPI on port 8000)...
start "Clinical-NIDS: ML Service" cmd /k "cd /d %SCRIPT_DIR%ml-service && python app.py"
timeout /t 3 /nobreak >nul

echo [2/3] Starting Spring Boot Backend (port 8080)...
where mvn >nul 2>&1
if %errorlevel% equ 0 (
    start "Clinical-NIDS: Backend" cmd /k "cd /d %SCRIPT_DIR%backend && mvn spring-boot:run"
) else (
    start "Clinical-NIDS: Backend" cmd /k "cd /d %SCRIPT_DIR%backend && .\mvnw.cmd spring-boot:run"
)
timeout /t 5 /nobreak >nul

echo [3/3] Starting React Frontend (Vite on port 5173)...
start "Clinical-NIDS: Frontend" cmd /k "cd /d %SCRIPT_DIR%clinical-nids-dashboard && npm run dev"
timeout /t 3 /nobreak >nul

echo ============================================================
echo   All Services Starting:
echo   - ML Service:   http://localhost:8000  (FastAPI)
echo   - Backend:      http://localhost:8080  (Spring Boot)
echo   - Frontend:     http://localhost:5173  (React + Vite)
echo ============================================================
echo.
echo You can close this window now. Services will keep running in their respective windows.
pause

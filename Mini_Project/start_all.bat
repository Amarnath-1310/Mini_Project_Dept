@echo off
echo ============================================================
echo   Clinical-NIDS — Starting All Services
echo ============================================================
echo.

echo [1/3] Starting ML Service (FastAPI on port 8000)...
start "ML Service" cmd /k "cd /d D:\Mini_Project\ml-service && python app.py"
timeout /t 5 /nobreak >nul

echo [2/3] Starting React Frontend (Vite on port 5173)...
start "Frontend" cmd /k "cd /d D:\Mini_Project\clinical-nids-dashboard && npm run dev"
timeout /t 5 /nobreak >nul

echo [3/3] Starting Spring Boot Backend (port 8080)...
echo NOTE: Requires Maven. Install Maven first, then run:
echo   cd D:\Mini_Project\backend
echo   mvn spring-boot:run
echo.

echo ============================================================
echo   Services Status:
echo   - ML Service:   http://localhost:8000  (FastAPI)
echo   - Frontend:     http://localhost:5173  (React + Vite)
echo   - Backend:      http://localhost:8080  (Spring Boot)
echo ============================================================
echo.
echo Press any key to exit this window...
pause >nul

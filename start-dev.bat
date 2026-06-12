@echo off
title GeoEnergy Intelligence AI — Dev Launcher
echo.
echo  =============================================
echo   GeoEnergy Intelligence AI — Dev Launcher
echo  =============================================
echo.
echo  [1/2] Launching Backend  (FastAPI :8081)...
start "GEI Backend" cmd /k ""C:\Users\Prabh\My Projects\GeoEnergyIntelligenceAI\start-backend.bat""

timeout /t 5 /nobreak > nul

echo  [2/2] Launching Frontend (Vite   :5173)...
start "GEI Frontend" cmd /k ""C:\Users\Prabh\My Projects\GeoEnergyIntelligenceAI\start-frontend.bat""

echo.
echo  Both servers are starting in separate windows.
echo.
echo  Backend  -->  http://localhost:8081
echo  Frontend -->  http://localhost:5173
echo.
timeout /t 3 /nobreak > nul

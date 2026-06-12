@echo off
title GEI — Backend :8081
cd /d "C:\Users\Prabh\My Projects\GeoEnergyIntelligenceAI\backend"
echo.
echo  GeoEnergy Intelligence AI — Backend
echo  =====================================
echo  Installing / verifying Python packages...
echo.
pip install -r requirements.txt
echo.
echo  Starting FastAPI on http://localhost:8081
echo  Press Ctrl+C to stop.
echo.
python -m uvicorn main:app --reload --port 8081 --host 0.0.0.0
pause

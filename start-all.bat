@echo off
title KCEnglishKids - Runner
echo ==============================================================
echo           KCEnglishKids - Interactive Learning Platform
echo ==============================================================
echo.

echo [1/3] Khoi dong Backend (Port 5000)...
start "KCEnglishKids - Backend (Port 5000)" cmd /k "cd /d %~dp0KCEnglishKids_BE && npm start"

timeout /t 3 /nobreak >nul

echo [2/3] Khoi dong Client (Hoc sinh / Giao vien) (Port 5173)...
start "KCEnglishKids - Client (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

timeout /t 1 /nobreak >nul

echo [3/3] Khoi dong Admin Portal (Port 5174)...
start "KCEnglishKids - Admin (Port 5174)" cmd /k "cd /d %~dp0admin && npm run dev"

echo.
echo ==============================================================
echo   Tat ca dich vu da duoc khoi chay thanh cong:
echo   - Backend API:    http://localhost:5000
echo   - Client Web:     http://localhost:5173
echo   - Admin Portal:   http://localhost:5174
echo ==============================================================
echo.
pause

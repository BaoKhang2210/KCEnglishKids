@echo off
title KCEnglishKids - Runner
echo ==============================================================
echo           KCEnglishKids - Interactive Learning Platform
echo ==============================================================
echo.

echo [1/2] Khoi dong Backend API (Port 5000)...
start "KCEnglishKids - Backend (Port 5000)" cmd /k "cd /d %~dp0KCEnglishKids_BE && npm start"

timeout /t 3 /nobreak >nul

echo [2/2] Khoi dong He thong Web App (Port 5173)...
start "KCEnglishKids - Web App (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ==============================================================
echo   Tat ca dich vu da duoc khoi chay thanh cong:
echo   - Backend API:       http://localhost:5000
echo   - Web App He thong:  http://localhost:5173
echo     * Trang Hoc sinh:  http://localhost:5173/login
echo     * Trang Giao vien: http://localhost:5173/teacher
echo     * Trang Admin:     http://localhost:5173/admin/classrooms
echo ==============================================================
echo.
pause

@echo off
title KCEnglishKids - Stopper
echo ==============================================================
echo           KCEnglishKids - Tat toan bo dich vu
echo ==============================================================
echo.

for %%P in (5000 5173 5174) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
        echo Dang tat tien trinh tai port %%P (PID: %%a)...
        taskkill /F /PID %%a 2>nul
    )
)

echo.
echo Da dung toan bo tien trinh (5000, 5173, 5174).
pause

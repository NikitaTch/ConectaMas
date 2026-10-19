@echo off
chcp 65001 >nul
title Conecta2 - Detener Servidor y Tunel
cls
echo ========================================================
echo        DETENIENDO CONECTA2 Y TUNEL CLOUDFLARE
echo ========================================================
echo.
echo 1. Cerrando conexiones de Cloudflare...
taskkill /F /IM cloudflared.exe >nul 2>&1

echo 2. Liberando puerto 5000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo ========================================================
echo  Todo detenido correctamente.
echo  El puerto 5000 esta libre.
echo  Ya puedes hacer doble clic en 'iniciar_todo.bat'.
echo ========================================================
echo.
pause

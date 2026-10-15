@echo off
chcp 65001 >nul
title Conecta2 - Servidor y Tunel
cls
echo ========================================================
echo       CONECTA2 - LANZADOR COMPLETO (Servidor + Tunel)
echo ========================================================
echo.
echo 1. Iniciando servidor local Flask...
if exist ".venv\Scripts\activate" (
    start "Conecta2 - Servidor Local" cmd /k "cd /d %~dp0 && call .venv\Scripts\activate && python app.py"
) else (
    start "Conecta2 - Servidor Local" cmd /k "cd /d %~dp0 && python app.py"
)

echo Esperando 3 segundos a que el servidor este listo...
timeout /t 3 >nul

echo 2. Iniciando Tunel HTTPS de Cloudflare...
start "Conecta2 - Tunel HTTPS" cmd /k "cd /d %~dp0 && call iniciar_tunel.bat"

echo.
echo ========================================================
echo  ¡Listo! Se han abierto dos ventanas:
echo   1) Servidor Flask (recibe las conexiones)
echo   2) Tunel Cloudflare (te da el enlace HTTPS)
echo.
echo  Copia el enlace 'https://....trycloudflare.com'
echo  que aparece en la ventana del Tunel y compartelo.
echo ========================================================
echo.
pause

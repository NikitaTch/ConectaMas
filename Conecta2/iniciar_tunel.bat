@echo off
chcp 65001 >nul
title Conecta2 - Tunel Seguro HTTPS (Cloudflare)
cls
echo ========================================================
echo       CONECTA2 - TUNEL SEGURO HTTPS (Cloudflare)
echo ========================================================
echo.
echo 1. Asegurate de que el servidor Flask este en marcha:
echo    (python app.py en el puerto 5000)
echo.
echo 2. Conectando con los servidores seguros de Cloudflare...
echo.
echo --------------------------------------------------------
echo ATENCION:
echo En unos segundos aparecera un recuadro con un enlace:
echo   https://xxxx-xxxx-xxxx.trycloudflare.com
echo.
echo - Copia ese enlace 'https://...'
echo - Pasaselo a tu companero
echo - Abrelo tu tambien en tu navegador
echo --------------------------------------------------------
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --protocol http2 --url http://localhost:5000
pause

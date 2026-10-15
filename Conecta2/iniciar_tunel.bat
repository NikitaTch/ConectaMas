@echo off
chcp 65001 >nul
title Conecta2 - Tunel Seguro HTTPS (Cloudflare)
cls
echo ========================================================
echo       CONECTA2 - TUNEL SEGURO HTTPS (Cloudflare)
echo ========================================================
echo.
echo Conectando con los servidores seguros de Cloudflare...
echo.
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --protocol http2 --edge-ip-version 4 --url http://localhost:5000
pause

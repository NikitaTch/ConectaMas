@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
title Conecta2 - Servidor y Tunel
cd /d "%~dp0"

set "PY_EXE="
if exist ".venv\bin\python.exe" (
    set "PY_EXE=.venv\bin\python.exe"
) else if exist ".venv\Scripts\python.exe" (
    set "PY_EXE=.venv\Scripts\python.exe"
) else (
    set "PY_EXE=python"
)

"%PY_EXE%" lanzar_conecta2.py
if errorlevel 1 (
    echo.
    echo Ocurrio un error al ejecutar Conecta2.
    pause
)

@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Anatopedia Python Sunucu

where py >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8080/"
  py -m http.server 8080 --bind 127.0.0.1
  exit /b
)

where python >nul 2>nul
if not errorlevel 1 (
  start "" "http://127.0.0.1:8080/"
  python -m http.server 8080 --bind 127.0.0.1
  exit /b
)

echo Python bulunamadi. ANATOPEDIA_BASLAT.bat dosyasini kullanin.
pause

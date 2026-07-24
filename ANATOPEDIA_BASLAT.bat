@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Anatopedia Yerel Sunucu

echo Anatopedia aciliyor...
echo Bu pencereyi uygulamayi kullandiginiz surece kapatmayin.
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo HATA: Windows PowerShell bulunamadi.
  echo README_KOLAY_KURULUM.txt dosyasini acin.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -File "%~dp0start-server.ps1"

if errorlevel 1 (
  echo.
  echo Uygulama baslatilamadi. README_KOLAY_KURULUM.txt dosyasina bakin.
  pause
)

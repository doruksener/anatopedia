@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Anatopedia Veri Hazırlama

echo Anatopedia cekirdek 3D veri paketi hazirlaniyor.
echo Bu islem internet hizina gore uzun surebilir ancak yalnizca bir kez gerekir.
echo.

where py.exe >nul 2>nul
if not errorlevel 1 (
  py -3 tools\prepare_anatopedia_data.py
) else (
  where python.exe >nul 2>nul
  if errorlevel 1 (
    echo HATA: Python bulunamadi. Python 3 kurup tekrar deneyin.
    pause
    exit /b 1
  )
  python tools\prepare_anatopedia_data.py
)

echo.
echo Islem tamamlandi. Simdi ANATOPEDIA_BASLAT.bat dosyasini acabilirsiniz.
pause

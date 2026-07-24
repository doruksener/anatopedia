@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Anatopedia Veri Hazırlama

echo ==============================================
echo  Anatopedia yerel 3D veri hazırlama
echo ==============================================
echo.
echo 1 - Hızlı çekirdek paket (önerilen)
echo 2 - Çekirdek paket + büyük deri mesh'i
echo.
set /p SECIM=Seçiminiz [1]: 
if "%SECIM%"=="" set SECIM=1

set EXTRA=
if "%SECIM%"=="2" set EXTRA=--include-skin

where py.exe >nul 2>nul
if not errorlevel 1 (
  py -3 tools\prepare_anatopedia_data.py %EXTRA%
) else (
  where python.exe >nul 2>nul
  if errorlevel 1 (
    echo.
    echo HATA: Python 3 bulunamadı.
    echo Python kurulumunda "Add Python to PATH" seçeneğini işaretleyin.
    pause
    exit /b 1
  )
  python tools\prepare_anatopedia_data.py %EXTRA%
)

echo.
if errorlevel 1 (
  echo İşlem hatayla tamamlandı. Yukarıdaki mesajları kontrol edin.
) else (
  echo Veri hazırlama tamamlandı.
  echo Şimdi ANATOPEDIA_BASLAT.bat dosyasını açabilirsiniz.
)
pause

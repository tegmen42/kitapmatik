@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════
echo 🚀 OTOMATİK GITHUB REPOSITORY OLUŞTURMA
echo ═══════════════════════════════════════════════════════
echo.

cd /d "%~dp0"

REM PATH güncelle
for /f "tokens=2*" %%A in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYSTEM_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%B"
set "PATH=%SYSTEM_PATH%;%USER_PATH%"

echo 📋 Repository Bilgileri:
echo   Adı: kitapmatik
echo   Tipi: Public
echo.

echo 🔐 GitHub Authentication Kontrol Ediliyor...
gh auth status >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  GitHub'a giriş yapılmamış!
    echo.
    echo 🔑 GitHub'a giriş yapılacak...
    echo    Lütfen tarayıcıda açılan sayfada giriş yapın...
    echo.
    gh auth login --web --git-protocol https --hostname github.com
    if errorlevel 1 (
        echo.
        echo ❌ Giriş işlemi başarısız!
        echo.
        echo 💡 Alternatif: Manuel repository oluşturun ve URL'ini verin
        pause
        exit /b 1
    )
    echo.
    echo ✅ GitHub'a giriş yapıldı!
) else (
    echo ✅ GitHub'a zaten giriş yapılmış!
)

echo.
echo 📦 GitHub Repository Oluşturuluyor...
echo.

gh repo create kitapmatik --public --source=. --remote=origin --push

if errorlevel 1 (
    echo.
    echo ❌ Repository oluşturma hatası!
    echo.
    echo 💡 Alternatif: Manuel repository oluşturun ve URL'ini verin
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════════
echo ✅ BAŞARILI! Repository Oluşturuldu ve Push Edildi!
echo ═══════════════════════════════════════════════════════
echo.
echo 🌐 Repository URL: https://github.com/%USERNAME%/kitapmatik
echo.
echo ✨ Sonraki Adımlar:
echo   1. Vercel'e deploy edebilirsiniz
echo   2. Repository ayarlarını yapabilirsiniz
echo.
echo ═══════════════════════════════════════════════════════
echo.
pause


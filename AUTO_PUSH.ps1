# Otomatik GitHub Push Script
# Bu script repository URL'i alıp otomatik push yapar

param(
    [string]$RepoUrl = ""
)

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n🚀 Otomatik GitHub Push Başlatılıyor..." -ForegroundColor Cyan

if ($RepoUrl -eq "") {
    Write-Host "❌ Repository URL gerekli!" -ForegroundColor Red
    Write-Host "Kullanım: .\AUTO_PUSH.ps1 -RepoUrl 'https://github.com/KULLANICI/REPO.git'" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📋 İşlemler:" -ForegroundColor Yellow
Write-Host "  1. Remote ekleniyor..." -ForegroundColor Gray
Write-Host "  2. GitHub'a push yapılıyor..." -ForegroundColor Gray

# Remote ekle
Write-Host "`n🔗 Remote ekleniyor..." -ForegroundColor Cyan
git remote add origin $RepoUrl 2>$null
if ($LASTEXITCODE -ne 0) {
    git remote set-url origin $RepoUrl
}

# Push yap
Write-Host "📤 GitHub'a push yapılıyor..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ BAŞARILI! Tüm dosyalar GitHub'a yüklendi!" -ForegroundColor Green
    Write-Host "`n🌐 Repository URL: $RepoUrl" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Push hatası! Lütfen manuel kontrol edin." -ForegroundColor Red
    Write-Host "Manuel komut: git push -u origin main" -ForegroundColor Yellow
}


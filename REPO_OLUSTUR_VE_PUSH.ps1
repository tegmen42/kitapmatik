# Otomatik GitHub Repository Oluşturma ve Push Scripti
# GitHub'a giriş yaptıktan sonra bu scripti çalıştırın

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 OTOMATIK GITHUB REPOSITORY OLUŞTURMA" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

$repoName = "kitapmatik"

# Authentication kontrolü
Write-Host "`n🔐 GitHub Authentication Kontrol Ediliyor...`n" -ForegroundColor Cyan
$authCheck = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ GitHub'a giriş yapılmamış!`n" -ForegroundColor Red
    Write-Host "📝 Lütfen önce GitHub'a giriş yapın:" -ForegroundColor Yellow
    Write-Host "   Komut: gh auth login --web`n" -ForegroundColor Gray
    
    Write-Host "⏳ GitHub login başlatılıyor...`n" -ForegroundColor Cyan
    gh auth login --web --git-protocol https --hostname github.com
    
    Write-Host "`n⏳ Giriş yapmanız için 15 saniye bekleniyor...`n" -ForegroundColor Yellow
    Start-Sleep -Seconds 15
    
    # Tekrar kontrol
    $authCheck = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Henüz giriş yapılmadı!`n" -ForegroundColor Red
        Write-Host "💡 Lütfen manuel olarak şu komutu çalıştırın:" -ForegroundColor Yellow
        Write-Host "   gh auth login --web`n" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host "✅ GitHub'a giriş yapıldı!`n" -ForegroundColor Green

# Mevcut remote kontrolü
Write-Host "🔍 Mevcut remote kontrol ediliyor...`n" -ForegroundColor Cyan
$remoteCheck = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Zaten bir remote var: $remoteCheck`n" -ForegroundColor Yellow
    Write-Host "🗑️  Mevcut remote kaldırılıyor...`n" -ForegroundColor Cyan
    git remote remove origin
}

# Repository oluştur ve push yap
Write-Host "📦 GitHub Repository Oluşturuluyor: $repoName`n" -ForegroundColor Cyan
Write-Host "   → Tip: Public`n" -ForegroundColor Gray

gh repo create $repoName --public --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    $username = gh api user --jq .login 2>$null
    $repoUrl = "https://github.com/$username/$repoName"
    
    Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ BAŞARILI! Repository Oluşturuldu ve Push Edildi!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "`n🌐 Repository URL: $repoUrl" -ForegroundColor Yellow
    Write-Host "`n✨ Sonraki Adımlar:" -ForegroundColor Cyan
    Write-Host "  1. Repository'yi kontrol edin: $repoUrl" -ForegroundColor Gray
    Write-Host "  2. Vercel'e deploy edebilirsiniz" -ForegroundColor Gray
    Write-Host "  3. Repository ayarlarını yapabilirsiniz" -ForegroundColor Gray
    Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Repository oluşturma hatası!" -ForegroundColor Red
    Write-Host "`n💡 Hata detayları için yukarıdaki mesajları kontrol edin.`n" -ForegroundColor Yellow
    exit 1
}


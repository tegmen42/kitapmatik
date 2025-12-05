# Otomatik GitHub Repository Oluşturma ve Push Scripti
# Bu script GitHub CLI kullanarak repository oluşturur ve push yapar

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n🚀 Otomatik GitHub Repository Oluşturma Başlatılıyor..." -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Repository adı
$repoName = "kitapmatik"
$isPublic = $true  # Public repo için true, Private için false

Write-Host "`n📋 Repository Bilgileri:" -ForegroundColor Yellow
Write-Host "  Adı: $repoName" -ForegroundColor Gray
Write-Host "  Tipi: $(if ($isPublic) { 'Public' } else { 'Private' })" -ForegroundColor Gray

# GitHub authentication kontrolü
Write-Host "`n🔐 GitHub Authentication Kontrol Ediliyor..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  GitHub'a giriş yapılmamış!" -ForegroundColor Yellow
    Write-Host "`n🔑 GitHub'a giriş yapılacak..." -ForegroundColor Cyan
    Write-Host "   Lütfen tarayıcıda açılan sayfada giriş yapın..." -ForegroundColor Gray
    
    # Web tabanlı login
    gh auth login --web
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Giriş işlemi başarısız!" -ForegroundColor Red
        Write-Host "`n💡 Alternatif: Manuel repository oluşturun ve URL'ini verin" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ GitHub'a giriş yapıldı!" -ForegroundColor Green

# Repository oluştur
Write-Host "`n📦 GitHub Repository Oluşturuluyor..." -ForegroundColor Cyan
$visibility = if ($isPublic) { "public" } else { "private" }

gh repo create $repoName --$visibility --source=. --remote=origin --push

if ($LASTEXITCODE -eq 0) {
    $repoUrl = "https://github.com/$(gh api user --jq .login)/$repoName"
    
    Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "✅ BAŞARILI! Repository Oluşturuldu ve Push Edildi!" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "`n🌐 Repository URL: $repoUrl" -ForegroundColor Yellow
    Write-Host "`n✨ Sonraki Adımlar:" -ForegroundColor Cyan
    Write-Host "  1. Vercel'e deploy edebilirsiniz" -ForegroundColor Gray
    Write-Host "  2. Repository ayarlarını yapabilirsiniz" -ForegroundColor Gray
    Write-Host "  3. README.md'yi güncelleyebilirsiniz" -ForegroundColor Gray
    Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Repository oluşturma hatası!" -ForegroundColor Red
    Write-Host "`n💡 Alternatif: Manuel repository oluşturun ve URL'ini verin" -ForegroundColor Yellow
    exit 1
}


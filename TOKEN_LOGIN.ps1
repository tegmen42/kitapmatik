# GitHub CLI Token ile Login Scripti
# Kullanım: .\TOKEN_LOGIN.ps1 -Token "YOUR_TOKEN"

param(
    [Parameter(Mandatory=$true)]
    [string]$Token
)

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n🔑 GitHub CLI Token Login Başlatılıyor...`n" -ForegroundColor Cyan

# Token ile login
Write-Host "📝 Token ile giriş yapılıyor...`n" -ForegroundColor Yellow

# GitHub CLI token ile login
echo $Token | gh auth login --with-token

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ GitHub'a başarıyla giriş yapıldı!`n" -ForegroundColor Green
    
    # Authentication durumunu kontrol et
    Write-Host "🔍 Authentication durumu kontrol ediliyor...`n" -ForegroundColor Cyan
    gh auth status
    
    Write-Host "`n📦 Şimdi repository oluşturuluyor...`n" -ForegroundColor Cyan
    gh repo create kitapmatik --public --source=. --remote=origin --push
    
    if ($LASTEXITCODE -eq 0) {
        $username = gh api user --jq .login 2>$null
        $repoUrl = "https://github.com/$username/kitapmatik"
        
        Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "✅ BAŞARILI! Repository Oluşturuldu ve Push Edildi!" -ForegroundColor Green
        Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
        Write-Host "`n🌐 Repository URL: $repoUrl" -ForegroundColor Yellow
        Write-Host "`n✨ Sonraki Adımlar:" -ForegroundColor Cyan
        Write-Host "  1. Repository'yi kontrol edin: $repoUrl" -ForegroundColor Gray
        Write-Host "  2. Vercel'e deploy edebilirsiniz" -ForegroundColor Gray
        Write-Host "  3. README.md'yi güncelleyebilirsiniz" -ForegroundColor Gray
        Write-Host "`n═══════════════════════════════════════════════════════`n" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Repository oluşturma hatası!`n" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Token ile giriş başarısız! Token'ı kontrol edin.`n" -ForegroundColor Red
    exit 1
}


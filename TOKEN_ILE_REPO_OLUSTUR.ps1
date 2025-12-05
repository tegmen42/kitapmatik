# GitHub Token ile Tam Otomatik Repository Oluşturma
# Bu script GitHub Personal Access Token kullanarak repository oluşturur

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "kitapmatik",
    
    [Parameter(Mandatory=$false)]
    [string]$Username = ""
)

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 TOKEN İLE OTOMATIK REPOSITORY OLUŞTURMA" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

# Username'i token'dan al
if ($Username -eq "") {
    Write-Host "`n🔍 GitHub kullanıcı adı token'dan alınıyor...`n" -ForegroundColor Cyan
    try {
        $headers = @{
            Authorization = "token $Token"
            Accept = "application/vnd.github.v3+json"
        }
        $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
        $Username = $user.login
        Write-Host "✅ Kullanıcı adı: $Username`n" -ForegroundColor Green
    } catch {
        Write-Host "❌ Token geçersiz veya hatalı!`n" -ForegroundColor Red
        exit 1
    }
}

# Repository oluştur
Write-Host "📦 GitHub Repository Oluşturuluyor: $RepoName`n" -ForegroundColor Cyan

try {
    $headers = @{
        Authorization = "token $Token"
        Accept = "application/vnd.github.v3+json"
    }
    
    $body = @{
        name = $RepoName
        description = "KitapMatik - Kitap arama ve fiyat karşılaştırma uygulaması"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    
    $repo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    
    Write-Host "✅ Repository oluşturuldu!`n" -ForegroundColor Green
    
    # Remote ekle
    Write-Host "🔗 Remote ekleniyor...`n" -ForegroundColor Cyan
    $remoteUrl = "https://$Token@github.com/$Username/$RepoName.git"
    
    # Mevcut remote varsa kaldır
    $existingRemote = git remote get-url origin 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "🗑️  Mevcut remote kaldırılıyor...`n" -ForegroundColor Yellow
        git remote remove origin
    }
    
    git remote add origin $remoteUrl
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Remote eklendi!`n" -ForegroundColor Green
    }
    
    # Push yap
    Write-Host "📤 Dosyalar GitHub'a push ediliyor...`n" -ForegroundColor Cyan
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        $repoUrl = "https://github.com/$Username/$RepoName"
        
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
        Write-Host "`n⚠️  Push işleminde hata oluştu. Repository oluşturuldu ama push yapılamadı.`n" -ForegroundColor Yellow
        Write-Host "💡 Manuel push için: git push -u origin main`n" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "`n❌ Repository oluşturma hatası!" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)`n" -ForegroundColor Yellow
    exit 1
}


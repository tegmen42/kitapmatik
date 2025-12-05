# GitHub API ile Repository Oluşturma ve Push
$token = "ghp_cwz4HAGOQZnqDuuzSYrKRQEMM638Bd1vLexu"

Write-Host "`n═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 GITHUB API İLE REPOSITORY OLUŞTURMA" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan

$headers = @{
    Authorization = "token $token"
    Accept = "application/vnd.github.v3+json"
}

# Kullanıcı bilgisi al
Write-Host "`n🔍 GitHub kullanıcı bilgisi alınıyor...`n" -ForegroundColor Cyan
try {
    $user = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers
    $username = $user.login
    Write-Host "✅ Kullanıcı: $username`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Token geçersiz veya hatalı!`n" -ForegroundColor Red
    Write-Host "Hata: $($_.Exception.Message)`n" -ForegroundColor Yellow
    exit 1
}

# Repository oluştur
Write-Host "📦 Repository oluşturuluyor: kitapmatik`n" -ForegroundColor Cyan
try {
    $body = @{
        name = "kitapmatik"
        description = "KitapMatik - Kitap arama ve fiyat karşılaştırma uygulaması"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    
    $repo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body
    $repoUrl = $repo.html_url
    Write-Host "✅ Repository oluşturuldu: $repoUrl`n" -ForegroundColor Green
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "⚠️  Repository zaten mevcut olabilir. Kontrol ediliyor...`n" -ForegroundColor Yellow
        $repoUrl = "https://github.com/$username/kitapmatik"
    } else {
        Write-Host "❌ Repository oluşturma hatası!`n" -ForegroundColor Red
        Write-Host "Hata: $($_.Exception.Message)`n" -ForegroundColor Yellow
        exit 1
    }
}

# Remote ekle
Write-Host "🔗 Remote ekleniyor...`n" -ForegroundColor Cyan
$remoteUrl = "https://$token@github.com/$username/kitapmatik.git"

# Mevcut remote varsa kaldır
$existingRemote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "🗑️  Mevcut remote kaldırılıyor...`n" -ForegroundColor Yellow
    git remote remove origin
}

git remote add origin $remoteUrl

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Remote eklendi!`n" -ForegroundColor Green
} else {
    Write-Host "⚠️  Remote eklenemedi veya zaten mevcut. Devam ediliyor...`n" -ForegroundColor Yellow
}

# Push yap
Write-Host "📤 Dosyalar GitHub'a push ediliyor...`n" -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
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
    Write-Host "🌐 Repository URL: $repoUrl`n" -ForegroundColor Yellow
}


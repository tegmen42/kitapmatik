# 🚀 GitHub Repository Kurulum Rehberi

## ✅ Otomatik Yapılan İşlemler

1. ✅ Git kuruldu (Winget ile)
2. ✅ Git repository başlatıldı
3. ✅ Main branch oluşturuldu
4. ✅ .gitignore dosyası hazır
5. ✅ README.md dosyası hazır
6. ✅ vercel.json yapılandırması hazır
7. ✅ api/price.js Vercel formatına dönüştürüldü

## 📋 Şimdi Yapmanız Gerekenler

### 1. GitHub'da Repository Oluşturun

1. https://github.com adresine gidin
2. Sağ üstteki "+" butonuna tıklayın
3. "New repository" seçin
4. Repository adını girin (örnek: `kitapmatik`)
5. **Public** veya **Private** seçin
6. **"Initialize this repository with a README"** işaretini KALDIRIN (zaten README'miz var)
7. "Create repository" butonuna tıklayın

### 2. Repository URL'ini Bana Verin

GitHub'da repository oluşturduktan sonra, sayfanın üstünde göreceğiniz URL'yi bana verin:

- **HTTPS**: `https://github.com/KULLANICI_ADI/kitapmatik.git`
- **SSH**: `git@github.com:KULLANICI_ADI/kitapmatik.git`

Ben otomatik olarak:
- Remote ekleyeceğim
- Tüm dosyaları commit edeceğim
- GitHub'a push yapacağım

## 🔧 Manuel İşlemler (İsteğe Bağlı)

Eğer otomatik işlem çalışmazsa, şu komutları manuel çalıştırabilirsiniz:

```bash
# Remote ekle
git remote add origin https://github.com/KULLANICI_ADI/kitapmatik.git

# Tüm dosyaları ekle
git add .

# Commit yap
git commit -m "Initial commit: KitapMatik - Kitap arama ve fiyat karşılaştırma uygulaması"

# Push yap
git push -u origin main
```

## 🌐 Vercel Deploy

GitHub'a push yaptıktan sonra:

1. https://vercel.com adresine gidin
2. "Import Project" butonuna tıklayın
3. GitHub repository'nizi seçin
4. Vercel otomatik olarak `vercel.json` dosyasını algılayacak
5. "Deploy" butonuna tıklayın

## 📝 Notlar

- Git başarıyla kuruldu
- Tüm dosyalar hazır
- Sadece GitHub repo URL'ini vermeniz yeterli!


# 📚 KitapMatik Blog

Kitap önerileri, özetler, fiyat karşılaştırma ve okuma rehberi.

## 📁 Klasör Yapısı

```
blog/
├── index.html          # Ana sayfa
├── style.css          # Stil dosyası
├── seo.json           # SEO anahtar kelimeleri
├── generator.md       # Blog yazısı generator prompt'u
├── kitaplar/          # Kitap inceleme sayfaları
│   ├── empati.html
│   ├── seker-portakali.html
│   ├── suc-ve-ceza.html
│   ├── olasiliksiz.html
│   ├── simyaci.html
│   ├── hayvan-ciftligi.html
│   └── 1984-roman.html
└── listeler/          # Kitap listesi sayfaları
    ├── 2025-en-iyi-kitaplar.html
    ├── surukleyici-roman-onerileri.html
    └── psikolojik-kitap-onerileri.html
```

## 🎯 Özellikler

- ✅ Fiyat karşılaştırma butonları (API entegrasyonu)
- ✅ SEO optimizasyonu
- ✅ Responsive tasarım
- ✅ Temiz ve modern UI

## 🔧 Kullanım

1. `index.html` dosyasını tarayıcıda açın
2. Kitap sayfalarında "💰 Fiyatları Göster" butonuna tıklayın
3. Fiyat karşılaştırma API'si (`localhost:3002`) çalışır durumda olmalı

## 📝 Yeni İçerik Ekleme

1. `generator.md` dosyasındaki prompt şablonunu kullanın
2. Yeni blog yazısını uygun klasöre ekleyin
3. `index.html`'e yeni içerik kartını ekleyin

## 🔗 API Entegrasyonu

Fiyat karşılaştırma için `http://localhost:3002/api/price?name=` endpoint'i kullanılıyor.

---

**Toplam İçerik:** 11 sayfa  
**Durum:** ✅ Yayına hazır


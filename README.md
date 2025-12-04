# 📚 KitapMatik

Kitap arama, fiyat karşılaştırma ve blog sistemi içeren modern bir web uygulaması.

## ✨ Özellikler

- 🔍 **Kitap Arama**: Google Books API ile kitap arama
- 💰 **Fiyat Karşılaştırma**: 6 farklı mağazadan gerçek zamanlı fiyat karşılaştırma
  - Amazon
  - Kitapyurdu
  - D&R
  - Trendyol
  - Hepsiburada
  - BKM Kitap
- 📱 **Deep Link Desteği**: Mobil uygulamalara doğrudan yönlendirme
- 🛒 **Sepete Ekle**: Tek tıkla sepete ekleme
- 📖 **Blog Sistemi**: Kitap önerileri ve incelemeler
- 🎨 **Modern UI**: Responsive ve kullanıcı dostu arayüz
- ⚡ **Animasyonlu Yükleme**: Gerçek zamanlı fiyat arama durumu

## 🚀 Kurulum

### Gereksinimler

- Node.js 18+ 
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**
```bash
git clone https://github.com/KULLANICI_ADI/kitapmatik.git
cd kitapmatik
```

2. **Server bağımlılıklarını yükleyin**
```bash
cd server
npm install
```

3. **Server'ı başlatın**
```bash
npm start
# veya
node index.js
```

Server `http://localhost:3002` adresinde çalışacaktır.

4. **Frontend'i açın**
- `android/app/src/main/assets/index.html` dosyasını tarayıcıda açın
- Veya Android uygulaması olarak çalıştırın

## 📁 Proje Yapısı

```
kitapmatik/
├── server/              # Node.js backend (scraping API)
│   ├── index.js         # Express server
│   └── package.json
├── android/             # Android uygulama
│   └── app/src/main/assets/
│       ├── index.html   # Ana uygulama
│       └── blog/        # Blog sistemi
├── api/                 # Vercel serverless functions
│   └── price.js        # Fiyat karşılaştırma API
└── vercel.json         # Vercel yapılandırması
```

## 🔧 API Kullanımı

### Fiyat Karşılaştırma

```javascript
GET /api/price?name=KitapAdı

// Response
{
  "Amazon": {
    "price": "129.90",
    "link": "https://...",
    "deeplink": null,
    "cartLink": "https://..."
  },
  "Trendyol": {
    "price": "125.00",
    "link": "https://...",
    "deeplink": "trendyol://product-detail/12345",
    "cartLink": "trendyol://product-detail/12345"
  }
  // ... diğer mağazalar
}
```

## 🌐 Deployment

### Vercel

1. Vercel hesabınıza giriş yapın
2. Projeyi import edin
3. Otomatik deploy başlayacaktır

### Manuel Deploy

```bash
vercel --prod
```

## 🛠️ Teknolojiler

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express
- **Scraping**: Axios, Cheerio, Puppeteer
- **Deployment**: Vercel

## 📝 Lisans

MIT License

## 👤 Geliştirici

KitapMatik - Kitap arama ve fiyat karşılaştırma platformu

---

⭐ Projeyi beğendiyseniz yıldız vermeyi unutmayın!

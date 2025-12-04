# 📊 KitapMatik Fiyat Karşılaştırma Scraper

Gerçek zamanlı kitap fiyat karşılaştırma scraping servisi.

## 🚀 Kurulum

```bash
cd server
npm install
```

## ▶️ Çalıştırma

```bash
npm start
# veya
node index.js
```

Server `http://localhost:3001` adresinde çalışacak.

## 📡 API Endpoint

### GET `/api/price?name=KitapAdı`

Kitap adına göre tüm mağazalardan fiyatları çeker.

**Örnek:**
```
GET http://localhost:3001/api/price?name=Suç ve Ceza
```

**Yanıt:**
```json
{
  "Amazon": "165.00",
  "Trendyol": "-",
  "Hepsiburada": "180.50",
  "Kitapyurdu": "194.35",
  "BKM": "-",
  "DR": "175.00"
}
```

## 🏪 Desteklenen Mağazalar

- ✅ Amazon.com.tr
- ✅ Trendyol
- ✅ Hepsiburada
- ✅ Kitapyurdu
- ✅ BKM Kitap
- ✅ D&R

## ⚙️ Teknolojiler

- **Express.js** - Web framework
- **Axios** - HTTP client
- **Cheerio** - HTML parsing/scraping

## 📝 Notlar

- Scraping selector'ları mağaza HTML yapılarına göre güncellenebilir
- Bazı mağazalar bot koruması kullanabilir
- Timeout: 10 saniye
- Paralel scraping kullanılır (hızlı yanıt)


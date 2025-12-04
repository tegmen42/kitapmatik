# 🧹 Build Cache Temizleme Talimatları

## ⚠️ ÖNEMLİ: Build cache sorunu çözümü

Eğer "Beni Şaşırt" butonu hala Google Books kullanıyorsa, build cache'i temizlemeniz gerekiyor.

## 📋 Adım Adım Temizleme

### Windows PowerShell için:

```powershell
# 1. Proje dizinine git
cd "c:\Users\Mustafa\Desktop\kitap"

# 2. Çalışan servisleri durdur (Ctrl+C ile)

# 3. node_modules ve build klasörlerini sil
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force build
Remove-Item -Recurse -Force .next  # Next.js kullanıyorsanız
Remove-Item -Recurse -Force dist   # Vite kullanıyorsanız

# 4. npm cache'i temizle
npm cache clean --force

# 5. Bağımlılıkları yeniden yükle
npm install

# 6. Projeyi başlat
npm start
```

### Windows CMD için:

```cmd
cd c:\Users\Mustafa\Desktop\kitap
rmdir /s /q node_modules
rmdir /s /q build
rmdir /s /q .next
rmdir /s /q dist
npm cache clean --force
npm install
npm start
```

## ✅ Kontrol Listesi

Temizleme sonrası kontrol edin:

1. ✅ `src/components/SurpriseButton.js` - Sadece `getLocalSurpriseBook` import ediyor mu?
2. ✅ `src/api/localSurpriseEngine.js` - JSON path doğru mu? (`../data/surpriseBooks.json`)
3. ✅ `src/data/surpriseBooks.json` - Dosya var mı ve içinde kitaplar var mı?
4. ✅ Browser console'da log mesajları görünüyor mu?
   - `🔘 Beni Şaşırt butonuna tıklandı`
   - `✅ JSON yüklendi: X kitap bulundu`
   - `📚 Seçilen kitap: ...`

## 🐛 Sorun Giderme

### Eğer hala Google Books çağrılıyorsa:

1. Browser'ın Developer Tools'unu açın (F12)
2. Network sekmesine gidin
3. "Beni Şaşırt" butonuna tıklayın
4. Eğer `googleapis.com` veya `openlibrary.org` çağrıları görüyorsanız:
   - Build cache temizlenmemiş demektir
   - Yukarıdaki adımları tekrar uygulayın

### Eğer JSON yüklenmiyorsa:

1. `src/data/surpriseBooks.json` dosyasının var olduğunu kontrol edin
2. JSON dosyasının geçerli JSON formatında olduğunu kontrol edin
3. Browser console'da hata mesajlarını kontrol edin

## 📝 Notlar

- Build cache temizleme işlemi 5-10 dakika sürebilir
- `npm install` işlemi internet bağlantısı gerektirir
- Temizleme sonrası ilk build biraz uzun sürebilir


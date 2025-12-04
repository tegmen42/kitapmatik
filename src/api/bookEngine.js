/**
 * SÜPER RASTGELE KİTAP MOTORU
 * Çoklu API desteği ile rastgele kitap seçimi yapan ana motor
 * Beni Şaşırt butonu için test/ders kitaplarını filtreler
 */

import { fetchRandomBook } from "./googleBooks.js";
import { fetchRandomFromOpenLibrary } from "./openLibrary.js";

/**
 * Test / ders / sınav kitaplarını tespit eden keskin filtre
 * Kitap bilgisinin tüm alanlarını tarar (title, subtitle, categories, publisher, authors, reason)
 * @param {Object} book - Kitap objesi
 * @returns {boolean} Test kitabı ise true
 */
function isTestBookStrict(book = {}) {
  const {
    title = "",
    description = "",
    subtitle = "",
    categories = [],
    publisher = "",
    authors = [],
    reason = ""
  } = book;

  const text = (
    title + " " +
    description + " " +
    subtitle + " " +
    categories.join(" ") + " " +
    publisher + " " +
    authors.join(" ") + " " +
    reason
  ).toLowerCase();

  const bannedWords = [
    "tyt", "ayt", "kpss", "dgs", "ales", "ygs", "lys",
    "soru bankası", "soru bankasi",
    "deneme", "çıkmış sorular", "cikmis sorular",
    "paragraf", "problem", "çözümlü",
    "test", "sınav", "konu anlatımı", "konu anl",
    "öabt", "yks", "lgs",
    "workbook", "grammar", "practice test"
  ];

  return bannedWords.some(w => text.includes(w));
}

/**
 * Test / ders / sınav kitaplarını tespit eden filtre (eski versiyon - geriye uyumluluk için)
 * @param {string} title - Kitap başlığı
 * @param {string} description - Kitap açıklaması
 * @returns {boolean} Test kitabı ise true
 */
function isTestBook(title = "", description = "") {
  const text = (title + " " + description).toLowerCase();

  const bannedWords = [
    "tyt", "ayt", "kpss", "ales", "dgs",
    "lys", "ygs", "soru bankası",
    "deneme", "çıkmış sorular",
    "paragraf", "problem", "çözümlü",
    "test", "sınav", "konu anlatımı",
    "öabt"
  ];

  return bannedWords.some(word => text.includes(word));
}

/**
 * API'den test kitabı olmayan bir kitap çekmeyi dene
 * Keskin filtre ile tüm kitap alanlarını kontrol eder
 * @param {Function} fetchFn - API fonksiyonu
 * @param {number} maxAttempts - Maksimum deneme sayısı
 * @returns {Promise<Object|null>} Kitap bilgisi veya null
 */
async function fetchNonTestBook(fetchFn, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const result = await fetchFn();
      
      if (!result) continue;

      // Keskin test kitabı kontrolü - tüm alanları tarar
      if (!isTestBookStrict(result)) {
        // Temiz kitap bulundu
        return result;
      }
      // Test kitabıysa tekrar dene
    } catch (error) {
      // API hatası durumunda sessizce devam et
      console.warn('API hatası:', error);
      continue;
    }
  }
  
  // Maksimum deneme sayısına ulaşıldı, temiz kitap bulunamadı
  return null;
}

/**
 * Ana rastgele kitap çekme fonksiyonu
 * 1 tıklamada 1 API seçer, başarısız olursa diğerine geçer
 * Test/ders kitaplarını filtreler
 * @returns {Promise<Object>} Unified format kitap bilgisi (id, title, reason, source)
 */
export async function getRandomBookMaster() {
  const sources = [
    fetchRandomBook,
    fetchRandomFromOpenLibrary
  ];

  // API'leri rastgele sırala (her tıklamada farklı sıra)
  const shuffledSources = sources.sort(() => Math.random() - 0.5);

  // Sırayla her API'yi dene
  for (let fn of shuffledSources) {
    const result = await fetchNonTestBook(fn, 15);
    
    // Eğer temiz bir kitap bulunduysa dön
    if (result && result.id && result.title) {
      // Unified format garantisi
      return {
        id: result.id,
        title: result.title || "Bilinmeyen Kitap",
        reason: result.reason || "Açıklama bulunamadı.",
        source: result.source || "Bilinmeyen Kaynak",
        // Ek alanlar (opsiyonel)
        author: result.author || null,
        thumbnail: result.thumbnail || null,
        year: result.year || null
      };
    }
  }

  // Tüm API'ler başarısız olduysa veya sadece test kitapları bulunduysa fallback dön
  return {
    id: "fallback",
    title: "Kitap bulunamadı",
    reason: "API'lardan uygun kitap bulunamadı.",
    source: "Fallback"
  };
}

/**
 * getRandomBook - Alternatif fonksiyon adı (geriye uyumluluk için)
 * @returns {Promise<Object>} Unified format kitap bilgisi
 */
export async function getRandomBook() {
  return getRandomBookMaster();
}

/**
 * Beni Şaşırt butonu için Open Library tabanlı rastgele kitap çekme fonksiyonu
 * Google Books devre dışı - Sadece Open Library kullanılır
 * Test kitabı riski = 0 (güvenli kategoriler)
 * @returns {Promise<Object|null>} Kitap bilgisi veya null
 */
export async function fetchSurpriseBook() {
  try {
    // Güvenli, edebi, test içermeyen büyük konu havuzu
    const subjects = [
      "fantasy",
      "fiction",
      "romance",
      "adventure",
      "history",
      "science",
      "philosophy",
      "psychology",
      "biography",
      "mythology",
      "mystery",
      "poetry",
      "art",
      "spirituality"
    ];

    // 1) Rastgele konu
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    // 2) Rastgele sayfa (Open Library offset sistemi)
    const offset = Math.floor(Math.random() * 500);

    // 3) API çağrısı — test kitabı içerme ihtimali yok
    const url = `https://openlibrary.org/subjects/${subject}.json?limit=50&offset=${offset}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.warn(`Open Library API hatası: ${res.status}`);
      return null;
    }

    const data = await res.json();

    if (!data.works || data.works.length === 0) return null;

    // 4) Rastgele gerçek kitap seç
    const book = data.works[Math.floor(Math.random() * data.works.length)];

    return {
      id: book.key || `surprise-${Date.now()}`,
      title: book.title ?? "Bilinmeyen Kitap",
      reason: `Bu kitap Open Library üzerinde '${subject}' kategorisinden rastgele seçildi.`,
      source: "Open Library",
      thumbnail: book.cover_id
        ? `https://covers.openlibrary.org/b/id/${book.cover_id}-L.jpg`
        : null,
      year: book.first_publish_year || null
    };

  } catch (e) {
    console.error("SurpriseBook Error:", e);
    return null;
  }
}


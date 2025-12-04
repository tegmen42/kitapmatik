/**
 * i18n Texts
 * Uygulama metinleri ve çevirileri
 */

export const texts = {
  tr: {
    surprise: {
      button: "Beni Şaşırt",
      loading: "Arıyorum...",
      error: "Şu anda rastgele kitap bulunamadı. Lütfen tekrar deneyin.",
      errorGeneric: "Bir hata oluştu. Lütfen tekrar deneyin.",
      title: "Rastgele Kitap",
      author: "Yazar",
      year: "Yıl",
      source: "Kaynak",
      why: "Neden Bu Kitap?",
      close: "Kapat",
      ok: "Tamam"
    },
    api: {
      googleBooks: "Google Books",
      openLibrary: "Open Library"
    }
  },
  en: {
    surprise: {
      button: "Surprise Me",
      loading: "Searching...",
      error: "Could not find a random book at the moment. Please try again.",
      errorGeneric: "An error occurred. Please try again.",
      title: "Random Book",
      author: "Author",
      year: "Year",
      source: "Source",
      why: "Why This Book?",
      close: "Close",
      ok: "OK"
    },
    api: {
      googleBooks: "Google Books",
      openLibrary: "Open Library"
    }
  }
};

// Varsayılan dil
export const defaultLanguage = 'tr';

// Mevcut dil
let currentLanguage = defaultLanguage;

/**
 * Dil değiştir
 * @param {string} lang - Dil kodu (tr, en)
 */
export function setLanguage(lang) {
  if (texts[lang]) {
    currentLanguage = lang;
  }
}

/**
 * Mevcut dili al
 * @returns {string} Dil kodu
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Metin al
 * @param {string} key - Metin anahtarı (örn: "surprise.button")
 * @returns {string} Çevrilmiş metin
 */
export function t(key) {
  const keys = key.split('.');
  let value = texts[currentLanguage];

  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      // Fallback to default language
      value = texts[defaultLanguage];
      for (const k2 of keys) {
        if (value && value[k2]) {
          value = value[k2];
        } else {
          return key; // Return key if not found
        }
      }
      break;
    }
  }

  return typeof value === 'string' ? value : key;
}

export default { texts, setLanguage, getLanguage, t, defaultLanguage };


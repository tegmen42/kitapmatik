// Global Detection ve Internationalization (i18n) Sistemi

let currentLanguage = 'en'; // Varsayılan dil
let translations = {}; // Mevcut çeviriler

// Desteklenen diller
const SUPPORTED_LANGUAGES = {
  tr: 'tr',
  en: 'en',
  de: 'de',
  fr: 'fr',
  es: 'es'
};

// Ülke koduna göre dil eşleştirmesi
const COUNTRY_TO_LANGUAGE = {
  'TR': 'tr',
  'US': 'en',
  'UK': 'en',
  'GB': 'en', // UK için alternatif kod
  'CA': 'en',
  'AU': 'en', // Avustralya da İngilizce
  'DE': 'de',
  'FR': 'fr',
  'ES': 'es'
};

/**
 * IP'den ülke kodu belirle
 * @returns {Promise<string>} Ülke kodu (örn: "TR", "US", "DE")
 */
export async function detectCountryFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error('IP detection failed');
    }
    const data = await response.json();
    const countryCode = data.country_code || data.country || null;
    return countryCode ? countryCode.toUpperCase() : null;
  } catch (error) {
    console.error('Country detection error:', error);
    return null;
  }
}

/**
 * Ülke koduna göre dil belirle
 * @param {string} countryCode - Ülke kodu (örn: "TR", "US")
 * @returns {string} Dil kodu (tr, en, de, fr, es)
 */
export function getLanguageFromCountry(countryCode) {
  if (!countryCode) {
    return 'en'; // Varsayılan İngilizce
  }

  const upperCode = countryCode.toUpperCase();
  
  // Direkt eşleşme kontrolü
  if (COUNTRY_TO_LANGUAGE[upperCode]) {
    return COUNTRY_TO_LANGUAGE[upperCode];
  }

  // Varsayılan İngilizce
  return 'en';
}

/**
 * Dil dosyasını yükle
 * @param {string} lang - Dil kodu (tr, en, de, fr, es)
 * @returns {Promise<Object>} Çeviri objesi
 */
export async function loadTranslations(lang) {
  try {
    // localStorage'dan önce kontrol et
    const cached = localStorage.getItem(`translations_${lang}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // Dil dosyasını dinamik import et
    let translations;
    switch (lang) {
      case 'tr':
        translations = await import('./locales/tr.json');
        break;
      case 'de':
        translations = await import('./locales/de.json');
        break;
      case 'fr':
        translations = await import('./locales/fr.json');
        break;
      case 'es':
        translations = await import('./locales/es.json');
        break;
      case 'en':
      default:
        translations = await import('./locales/en.json');
        break;
    }

    // Cache'e kaydet
    localStorage.setItem(`translations_${lang}`, JSON.stringify(translations.default || translations));
    
    return translations.default || translations;
  } catch (error) {
    console.error(`Failed to load translations for ${lang}:`, error);
    // Hata durumunda İngilizce'ye fallback
    if (lang !== 'en') {
      return await loadTranslations('en');
    }
    // İngilizce de yüklenemezse boş obje döndür
    return {};
  }
}

/**
 * Otomatik dil belirleme ve yükleme
 * @returns {Promise<string>} Seçilen dil kodu
 */
export async function autoDetectLanguage() {
  // 1. Öncelikle localStorage'dan kontrol et (kullanıcı tercihi)
  const savedLanguage = localStorage.getItem('kitapmatik_language');
  if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
    currentLanguage = savedLanguage;
    await loadTranslations(currentLanguage);
    return currentLanguage;
  }

  // 2. IP'den ülke belirle
  try {
    const countryCode = await detectCountryFromIP();
    const detectedLanguage = getLanguageFromCountry(countryCode);
    
    currentLanguage = detectedLanguage;
    await loadTranslations(currentLanguage);
    
    // Tespit edilen dili localStorage'a kaydet (kullanıcı değiştirmediyse)
    if (!localStorage.getItem('kitapmatik_language')) {
      localStorage.setItem('kitapmatik_language', currentLanguage);
    }
    
    return currentLanguage;
  } catch (error) {
    console.error('Auto-detect language error:', error);
    // Hata durumunda varsayılan İngilizce
    currentLanguage = 'en';
    await loadTranslations(currentLanguage);
    return currentLanguage;
  }
}

/**
 * Dil değiştir
 * @param {string} lang - Yeni dil kodu
 * @returns {Promise<void>}
 */
export async function changeLanguage(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    console.warn(`Unsupported language: ${lang}`);
    return;
  }

  currentLanguage = lang;
  translations = await loadTranslations(lang);
  
  // localStorage'a kaydet
  localStorage.setItem('kitapmatik_language', lang);
  
  // Event dispatch (React component'lerin güncellenmesi için)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
}

/**
 * Çeviri al
 * @param {string} key - Çeviri anahtarı (örn: "title" veya "header.selectLanguage")
 * @param {Object} params - Parametreler (opsiyonel)
 * @returns {string} Çevrilmiş metin
 */
export function t(key, params = {}) {
  // Nested key desteği: "header.selectLanguage" -> translations.header.selectLanguage
  const keys = key.split('.');
  let translation = translations;
  
  // Nested objeyi traverse et
  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      // Key bulunamadı, orijinal key'i döndür
      translation = key;
      break;
    }
  }
  
  // Eğer translation bir obje ise (son key bir obje döndürmüşse), key'i döndür
  if (typeof translation === 'object' && translation !== null) {
    return key;
  }
  
  // String'e çevir
  translation = String(translation || key);
  
  // Parametre değiştirme (örn: "Hello {name}" -> "Hello John")
  if (params && Object.keys(params).length > 0) {
    return Object.keys(params).reduce((str, paramKey) => {
      return str.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    }, translation);
  }
  
  return translation;
}

/**
 * Mevcut dili al
 * @returns {string} Dil kodu
 */
export function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Desteklenen dilleri al
 * @returns {Array<string>} Dil kodları dizisi
 */
export function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES);
}

/**
 * i18n'i başlat
 * @returns {Promise<Object>} { language, translations }
 */
export async function initI18n() {
  const language = await autoDetectLanguage();
  translations = await loadTranslations(language);
  
  return {
    language,
    translations,
    t,
    changeLanguage,
    getCurrentLanguage
  };
}

// Varsayılan olarak i18n'i başlat
initI18n().catch(console.error);

// Export varsayılan fonksiyonlar
export default {
  initI18n,
  t,
  changeLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  autoDetectLanguage,
  detectCountryFromIP,
  getLanguageFromCountry
};


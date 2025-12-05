// Global Detection ve Internationalization (i18n) Sistemi - HTML Version

let currentLanguage = 'en'; // Varsayılan dil
let translations = {}; // Mevcut çeviriler

/**
 * Check if running as file:// protocol
 * @returns {boolean} True if file://, false if http/https
 */
function isFileProtocol() {
  return window.location.protocol === 'file:';
}

/**
 * Show warning if running as file://
 */
function showFileProtocolWarning() {
  if (isFileProtocol()) {
    const warningDiv = document.createElement('div');
    warningDiv.id = 'file-protocol-warning';
    warningDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff6b6b;
      color: white;
      padding: 15px;
      text-align: center;
      z-index: 10000;
      font-weight: bold;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    warningDiv.innerHTML = `
      ⚠️ Run via HTTP server for full functionality. 
      <a href="http://localhost:5500" style="color: white; text-decoration: underline; margin-left: 10px;">
        Open http://localhost:5500
      </a>
      <button onclick="this.parentElement.remove()" style="margin-left: 15px; padding: 5px 10px; background: white; color: #ff6b6b; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
        ✕
      </button>
    `;
    document.body.insertBefore(warningDiv, document.body.firstChild);
  }
}

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
async function detectCountryFromIP() {
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
function getLanguageFromCountry(countryCode) {
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
async function loadTranslations(lang) {
  try {
    // localStorage'dan önce kontrol et
    const cached = localStorage.getItem(`translations_${lang}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // file:// protocol kontrolü - sadece http/https üzerinden yükle
    if (isFileProtocol()) {
      console.warn('Running as file:// protocol. Translations can only be loaded over http/https.');
      console.warn('Using cached translations if available, otherwise returning empty object.');
      // file:// durumunda sadece cache'den yükle, fetch yapma
      return {};
    }

    // Dil dosyasını fetch ile yükle (sadece http/https üzerinden)
    const response = await fetch(`./locales/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    
    const translations = await response.json();
    
    // Cache'e kaydet
    localStorage.setItem(`translations_${lang}`, JSON.stringify(translations));
    
    return translations;
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
async function autoDetectLanguage() {
  // 1. Öncelikle localStorage'dan kontrol et (kullanıcı tercihi)
  const savedLanguage = localStorage.getItem('kitapmatik_language');
  if (savedLanguage && SUPPORTED_LANGUAGES[savedLanguage]) {
    currentLanguage = savedLanguage;
    translations = await loadTranslations(currentLanguage);
    return currentLanguage;
  }

  // 2. IP'den ülke belirle
  try {
    const countryCode = await detectCountryFromIP();
    const detectedLanguage = getLanguageFromCountry(countryCode);
    
    currentLanguage = detectedLanguage;
    translations = await loadTranslations(currentLanguage);
    
    // Tespit edilen dili localStorage'a kaydet (kullanıcı değiştirmediyse)
    if (!localStorage.getItem('kitapmatik_language')) {
      localStorage.setItem('kitapmatik_language', currentLanguage);
    }
    
    return currentLanguage;
  } catch (error) {
    console.error('Auto-detect language error:', error);
    // Hata durumunda varsayılan İngilizce
    currentLanguage = 'en';
    translations = await loadTranslations(currentLanguage);
    return currentLanguage;
  }
}

/**
 * Dil değiştir
 * @param {string} lang - Yeni dil kodu
 * @returns {Promise<void>}
 */
async function changeLanguage(lang) {
  if (!SUPPORTED_LANGUAGES[lang]) {
    console.warn(`Unsupported language: ${lang}`);
    return;
  }

  currentLanguage = lang;
  translations = await loadTranslations(lang);
  
  // localStorage'a kaydet
  localStorage.setItem('kitapmatik_language', lang);
  
  // Event dispatch (UI güncellenmesi için)
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang, translations: translations } }));
  
  // UI'ı güncelle
  updateUI();
}

/**
 * Çeviri al
 * @param {string} key - Çeviri anahtarı (örn: "title" veya "header.selectLanguage")
 * @param {Object} params - Parametreler (opsiyonel)
 * @returns {string} Çevrilmiş metin
 */
function t(key, params = {}) {
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
function getCurrentLanguage() {
  return currentLanguage;
}

/**
 * Desteklenen dilleri al
 * @returns {Array<string>} Dil kodları dizisi
 */
function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES);
}

/**
 * UI'ı güncelle (çevirilerle) - Kapsamlı güncelleme
 */
function updateUI() {
  if (!translations || typeof translations !== 'object') {
    console.warn('Translations not loaded yet');
    return;
  }

  // Helper function to get nested translation
  const getTranslation = (key) => {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return null;
      }
    }
    return typeof value === 'string' ? value : null;
  };

  // Title güncelle
  const title = getTranslation('title');
  if (title) {
    document.title = title;
  }

  // Helper: Emoji koruyarak metin güncelle
  const updateTextWithEmoji = (element, newText, emoji = null) => {
    if (!element || !newText) return;
    if (element.tagName === 'BUTTON' || element.tagName === 'SPAN' || element.tagName === 'LABEL') {
      const currentText = element.innerText || element.textContent || '';
      const existingEmoji = emoji || currentText.match(/^[^\s]+/)?.[0];
      element.textContent = existingEmoji ? `${existingEmoji} ${newText}` : newText;
    } else if (element.tagName === 'INPUT') {
      element.placeholder = newText;
    }
  };

  // Helper: Aria-label güncelle
  const updateAriaLabel = (element, newLabel) => {
    if (!element || !newLabel) return;
    element.setAttribute('aria-label', newLabel);
  };

  // Header elements
  const langSelector = document.getElementById('langSelector');
  if (langSelector) {
    updateAriaLabel(langSelector, getTranslation('header.selectLanguage') || 'Dil seç');
  }

  const themeToggleBtn = document.querySelector('.theme-toggle-btn');
  if (themeToggleBtn) {
    updateAriaLabel(themeToggleBtn, getTranslation('header.changeTheme') || 'Tema değiştir');
    themeToggleBtn.setAttribute('title', getTranslation('header.themeTooltip') || 'Koyu/Açık tema değiştir');
    
    const themeText = document.getElementById('themeText');
    if (themeText) {
      const isDark = document.body.classList.contains('dark-mode');
      themeText.textContent = isDark 
        ? (getTranslation('header.darkMode') || 'Koyu Mod')
        : (getTranslation('header.lightMode') || 'Açık Mod');
    }
  }

  const favoritesBtnText = document.getElementById('favoritesBtnText');
  if (favoritesBtnText) {
    favoritesBtnText.textContent = getTranslation('favorites.title') || 'Favorilerim';
  }

  const badgeButton = document.getElementById('badgeButton');
  if (badgeButton) {
    updateTextWithEmoji(badgeButton, getTranslation('header.badges') || 'Rozetler', '🏅');
  }

  const quoteBox = document.getElementById('quoteBox');
  if (quoteBox) {
    updateAriaLabel(quoteBox, getTranslation('quote.ariaLabel') || 'Günün sözü');
  }

  // Search elements
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.placeholder = getTranslation('search.inputPlaceholder') || 'Adı, yazar, yayınevi veya test kitabı arayın...';
    updateAriaLabel(searchInput, getTranslation('search.inputAriaLabel') || 'Arama kutusu');
  }

  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn) {
    searchBtn.textContent = getTranslation('search.button') || 'Ara';
    updateAriaLabel(searchBtn, getTranslation('search.buttonAriaLabel') || 'Ara');
  }

  const sortLabel = document.querySelector('.sort-label');
  if (sortLabel) {
    updateTextWithEmoji(sortLabel, getTranslation('search.sortLabel') || 'Sıralama:', '📊');
  }

  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    updateAriaLabel(sortSelect, getTranslation('search.sortLabel') || 'Sıralama seçeneği');
    
    // Option'ları güncelle
    const relevanceOption = sortSelect.querySelector('option[value="relevance"]');
    const newestOption = sortSelect.querySelector('option[value="newest"]');
    const popularOption = sortSelect.querySelector('option[value="popular"]');
    
    if (relevanceOption) {
      updateTextWithEmoji(relevanceOption, getTranslation('search.sortRelevance') || 'İlgililik', '🎯');
    }
    if (newestOption) {
      updateTextWithEmoji(newestOption, getTranslation('search.sortNewest') || 'En Yeni', '🆕');
    }
    if (popularOption) {
      updateTextWithEmoji(popularOption, getTranslation('search.sortPopular') || 'Popüler', '🔥');
    }
  }

  const trendRafBtn = document.getElementById('trend-raft-btn');
  if (trendRafBtn) {
    updateTextWithEmoji(trendRafBtn, getTranslation('trend.title') || 'Trend Rafı', '🔥');
    updateAriaLabel(trendRafBtn, getTranslation('trend.title') || 'Trend Rafı');
  }

  // Filter buttons
  const filterButtons = document.querySelectorAll('.filter-buttons .filter-btn');
  filterButtons.forEach(btn => {
    const text = btn.textContent.trim();
    if (text === 'Tümü') {
      btn.textContent = getTranslation('search.filterAll') || 'Tümü';
      updateAriaLabel(btn, getTranslation('search.filterAllAria') || 'Tümü filtresi');
    } else if (text === 'Adı') {
      btn.textContent = getTranslation('search.filterBook') || 'Adı';
      updateAriaLabel(btn, getTranslation('search.filterBookAria') || 'Adı filtresi');
    } else if (text === 'Yazar') {
      btn.textContent = getTranslation('search.filterAuthor') || 'Yazar';
      updateAriaLabel(btn, getTranslation('search.filterAuthorAria') || 'Yazar filtresi');
    } else if (text === 'Yayınevi') {
      btn.textContent = getTranslation('search.filterPublisher') || 'Yayınevi';
      updateAriaLabel(btn, getTranslation('search.filterPublisherAria') || 'Yayınevi filtresi');
    } else if (text === 'Test Kitabı') {
      btn.textContent = getTranslation('search.filterTest') || 'Test Kitabı';
      updateAriaLabel(btn, getTranslation('search.filterTestAria') || 'Test Kitabı filtresi');
    }
  });

  // Favorites view
  const favoritesView = document.getElementById('favoritesView');
  if (favoritesView) {
    const favoritesTitle = favoritesView.querySelector('h2');
    if (favoritesTitle) {
      updateTextWithEmoji(favoritesTitle, getTranslation('favorites.title') || 'Favorilerim', '⭐');
    }
    
    const backButton = favoritesView.querySelector('.back-btn');
    if (backButton) {
      backButton.textContent = getTranslation('favorites.backButton') || '← Arama Sayfasına Dön';
    }
  }

  // Results containers
  const resultsNormal = document.getElementById('results-normal');
  if (resultsNormal) {
    updateAriaLabel(resultsNormal, getTranslation('search.resultsAria') || 'Arama sonuçları');
  }

  const resultsTrend = document.getElementById('results-trend');
  if (resultsTrend) {
    updateAriaLabel(resultsTrend, getTranslation('trend.ariaLabel') || 'Trend kitaplar');
  }

  const favoritesContainer = document.getElementById('favoritesContainer');
  if (favoritesContainer) {
    updateAriaLabel(favoritesContainer, getTranslation('favorites.containerAria') || 'Favori kitaplar');
  }

  // Privacy notice
  const privacyNotice = document.querySelector('.privacy-notice');
  if (privacyNotice) {
    updateAriaLabel(privacyNotice, getTranslation('privacy.ariaLabel') || 'Gizlilik açıklaması');
    
    const privacyTitle = privacyNotice.querySelector('strong');
    if (privacyTitle) {
      privacyTitle.textContent = getTranslation('privacy.title') || 'Gizlilik ve Veri Güvenliği:';
    }
    
    // Description'ı güncelle
    const privacyText = privacyNotice.childNodes;
    privacyText.forEach(node => {
      if (node.nodeType === 3 && node.textContent.trim()) {
        node.textContent = getTranslation('privacy.description') || 
          'Uygulama kullanıcı verilerini sunuculara göndermez. Favoriler, tema seçimi ve arama geçmişi yalnızca cihazda yerel olarak saklanır.';
      }
    });
  }

  // User title box
  const userTitleBox = document.getElementById('userTitleBox');
  if (userTitleBox) {
    const label = getTranslation('userTitle.label') || 'Ünvan:';
    if (userTitleBox.textContent.includes('Ünvan:')) {
      userTitleBox.innerHTML = userTitleBox.innerHTML.replace(/Ünvan:/, label);
    }
  }

  // Language menu options
  const langOptions = document.querySelectorAll('.lang-option');
  langOptions.forEach(option => {
    const lang = option.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
    if (lang && translations.languages && translations.languages[lang]) {
      option.textContent = translations.languages[lang];
    }
  });

  // Splash screen
  const splashTitle = document.querySelector('.splash-title');
  if (splashTitle) {
    splashTitle.textContent = getTranslation('splash.title') || 'KitapMatik';
  }

  const splashSubtitle = document.querySelector('.splash-subtitle');
  if (splashSubtitle) {
    splashSubtitle.textContent = getTranslation('splash.subtitle') || 'Ara • Bul • Al';
  }

  const splashLoadingText = document.querySelector('.splash-loading-text');
  if (splashLoadingText) {
    splashLoadingText.textContent = getTranslation('splash.loading') || 'Yükleniyor...';
  }
}

/**
 * i18n'i başlat
 * @returns {Promise<Object>} { language, translations }
 */
async function initI18n() {
  const language = await autoDetectLanguage();
  translations = await loadTranslations(language);
  
  // UI'ı güncelle
  updateUI();
  
  return {
    language,
    translations,
    t,
    changeLanguage,
    getCurrentLanguage,
    getSupportedLanguages
  };
}

// Export global functions
window.i18n = {
  initI18n,
  t,
  changeLanguage,
  getCurrentLanguage,
  getSupportedLanguages,
  autoDetectLanguage,
  detectCountryFromIP,
  getLanguageFromCountry,
  updateUI
};

// Otomatik başlat (DOM hazır olduğunda)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    showFileProtocolWarning();
    initI18n();
  });
} else {
  showFileProtocolWarning();
  initI18n();
}


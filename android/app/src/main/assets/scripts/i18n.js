// Global Detection ve Internationalization (i18n) Sistemi - HTML Version
// SADECE TR DESTEĞİ - Çoklu dil/ülke kaldırıldı, yapı korundu

let currentLanguage = 'tr'; // SABİT: Her zaman Türkçe
let translations = {}; // Mevcut çeviriler (TR)
let currentCountry = 'TR'; // SABİT: Her zaman Türkiye
let countryUpdateCallbacks = []; // Ülke güncellendiğinde çağrılacak callback'ler (kullanılmıyor ama yapı korundu)

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

// SABİT DEĞERLER - Çoklu dil/ülke desteği kaldırıldı
const SUPPORTED_LANGUAGES = {
  tr: 'tr' // Sadece Türkçe
};

/**
 * Ülke koduna göre dil belirle (STUB - her zaman 'tr' döner)
 * @param {string} countryCode - Ülke kodu (kullanılmıyor)
 * @returns {string} Dil kodu (her zaman 'tr')
 */
function getLanguageFromCountry(countryCode) {
  return 'tr'; // SABİT: Her zaman Türkçe
}

/**
 * Dil dosyasını yükle (SADECE TR)
 * @param {string} lang - Dil kodu (her zaman 'tr')
 * @returns {Promise<Object>} Çeviri objesi
 */
async function loadTranslations(lang) {
  // Sadece 'tr' yükle, diğer dilleri yoksay
  const targetLang = 'tr';
  
  try {
    // localStorage'dan önce kontrol et
    const cached = localStorage.getItem(`translations_${targetLang}`);
    if (cached) {
      return JSON.parse(cached);
    }

    // file:// protocol kontrolü
    if (isFileProtocol()) {
      console.warn('Running as file:// protocol. Translations can only be loaded over http/https.');
      return {};
    }

    // Sadece tr.json yükle
    const response = await fetch(`./locales/${targetLang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${targetLang}.json`);
    }
    
    const translations = await response.json();
    
    // Cache'e kaydet
    localStorage.setItem(`translations_${targetLang}`, JSON.stringify(translations));
    
    return translations;
  } catch (error) {
    console.error(`Failed to load translations for ${targetLang}:`, error);
    return {}; // Boş obje döndür, uygulama çalışmaya devam etsin
  }
}

/**
 * Otomatik dil belirleme (STUB - her zaman 'tr' döner)
 * @returns {Promise<string>} Seçilen dil kodu (her zaman 'tr')
 */
async function autoDetectLanguage() {
  currentLanguage = 'tr'; // SABİT
  currentCountry = 'TR'; // SABİT
  translations = await loadTranslations('tr');
  return 'tr';
}

/**
 * Dil değiştir (STUB - her zaman 'tr' kalır)
 * @param {string} lang - Yeni dil kodu (kullanılmıyor)
 * @returns {Promise<void>}
 */
async function changeLanguage(lang) {
  // Dil değiştirme devre dışı, her zaman 'tr' kalır
  currentLanguage = 'tr';
  translations = await loadTranslations('tr');
  updateUI();
}

/**
 * Çeviri al (STUB - key döndürür veya tr.json'dan okur)
 * @param {string} key - Çeviri anahtarı
 * @param {Object} params - Parametreler (opsiyonel)
 * @returns {string} Çevrilmiş metin
 */
function t(key, params = {}) {
  const keys = key.split('.');
  let translation = translations;
  
  for (const k of keys) {
    if (translation && typeof translation === 'object' && k in translation) {
      translation = translation[k];
    } else {
      translation = key;
      break;
    }
  }
  
  if (typeof translation === 'object' && translation !== null) {
    return key;
  }
  
  translation = String(translation || key);
  
  if (params && Object.keys(params).length > 0) {
    return Object.keys(params).reduce((str, paramKey) => {
      return str.replace(new RegExp(`{${paramKey}}`, 'g'), params[paramKey]);
    }, translation);
  }
  
  return translation;
}

/**
 * Mevcut dili al (STUB - her zaman 'tr' döner)
 * @returns {string} Dil kodu (her zaman 'tr')
 */
function getCurrentLanguage() {
  return 'tr';
}

/**
 * Desteklenen dilleri al (STUB - sadece 'tr' döner)
 * @returns {Array<string>} Dil kodları dizisi (sadece ['tr'])
 */
function getSupportedLanguages() {
  return ['tr'];
}

/**
 * UI'ı güncelle (çevirilerle) - Sadece TR çevirileri kullanılır
 */
function updateUI() {
  if (!translations || typeof translations !== 'object') {
    return;
  }

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

  // Language menu options (devre dışı ama yapı korundu)
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
 * Ülke güncellendiğinde callback kaydet (STUB - kullanılmıyor)
 */
function onCountryUpdate(callback) {
  if (typeof callback === 'function') {
    countryUpdateCallbacks.push(callback);
  }
}

/**
 * i18n'i başlat (SPLASH'İ ASLA BLOKLAMAZ) - SADECE TR
 * @returns {Promise<Object>} { language, translations, country }
 */
async function initI18n() {
  try {
    // SABİT DEĞERLER - Algılama yok
    currentLanguage = 'tr';
    currentCountry = 'TR';
    
    // window.i18n'i hemen set et (diğer scriptler erişebilsin)
    if (!window.i18n) {
      window.i18n = {
        getCurrentCountry: () => 'TR',
        t: (key) => key,
        getCurrentLanguage: () => 'tr',
        ready: false
      };
    }
    
    // Sadece TR çevirilerini yükle
    translations = await loadTranslations('tr');
    updateUI();
    
    // window.i18n'i tam olarak güncelle
    updateI18nExports();
    
    return {
      language: 'tr',
      translations,
      country: 'TR',
      t,
      changeLanguage,
      getCurrentLanguage,
      getSupportedLanguages,
      getCurrentCountry: () => 'TR',
      onCountryUpdate
    };
  } catch (error) {
    console.error('❌ i18n initialization failed:', error);
    // Fallback: Varsayılan değerler (TR)
    currentLanguage = 'tr';
    currentCountry = 'TR';
    translations = await loadTranslations('tr').catch(() => ({}));
    updateUI();
    updateI18nExports();
    return {
      language: 'tr',
      translations,
      country: 'TR',
      t,
      changeLanguage,
      getCurrentLanguage,
      getSupportedLanguages,
      getCurrentCountry: () => 'TR',
      onCountryUpdate
    };
  }
}

// initI18n tamamlandığında window.i18n'i güncelle
function updateI18nExports() {
  window.i18n = {
    initI18n,
    t,
    changeLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    getLanguageFromCountry,
    updateUI,
    getCurrentCountry: () => 'TR',
    onCountryUpdate,
    ready: true
  };
}

// Export global functions - initI18n tamamlandıktan sonra güncellenecek
// Ama önce geçici bir obje set et (beyaz ekran önleme)
if (!window.i18n) {
  window.i18n = {
    getCurrentCountry: () => 'TR',
    t: (key) => key,
    getCurrentLanguage: () => 'tr',
    initI18n: null,
    ready: false
  };
}

// Otomatik başlat (DOM hazır olduğunda) - SPLASH'İ BLOKLAMAZ
(function() {
  function startI18n() {
    showFileProtocolWarning();
    // initI18n'i await etmeden başlat (splash'i bloklamaz)
    initI18n().catch((error) => {
      console.error('i18n start error:', error);
      // Hata olsa bile sayfa çalışmaya devam etsin
    });
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startI18n);
  } else {
    // DOM zaten hazır, hemen başlat
    startI18n();
  }
})();

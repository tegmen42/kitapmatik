import React, { useState, useEffect } from 'react';
import SurpriseCard from './components/SurpriseCard.js';
import TrendRaf from './components/TrendRaf.jsx';
import { getRandomBook } from './modules/surprise.js';
import { initI18n, t, changeLanguage, getCurrentLanguage, getSupportedLanguages } from './i18n.js';
import './styles/surprise.css';

function App() {
  const [selectedBook, setSelectedBook] = useState(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState("en"); // Varsayılan en (i18n otomatik belirleyecek)
  const [translations, setTranslations] = useState({});
  const [isI18nReady, setIsI18nReady] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // i18n başlatma ve dil değişikliklerini dinleme
  useEffect(() => {
    async function init() {
      try {
        const i18n = await initI18n();
        setLang(i18n.language);
        setTranslations(i18n.translations);
        setIsI18nReady(true);
        
        // Document title'ı güncelle
        document.title = i18n.translations.title || 'KitapMatik';
      } catch (error) {
        console.error('i18n init error:', error);
        setIsI18nReady(true); // Hata olsa bile devam et
      }
    }

    init();

    // Dil değişikliği event'ini dinle
    const handleLanguageChange = (event) => {
      setLang(event.detail.language);
      loadTranslations(event.detail.language);
    };

    window.addEventListener('languageChanged', handleLanguageChange);
    return () => window.removeEventListener('languageChanged', handleLanguageChange);
  }, []);

  // Dil değiştiğinde çevirileri yükle
  const loadTranslations = async (language) => {
    try {
      const translationsModule = await import(`./locales/${language}.json`);
      setTranslations(translationsModule.default || translationsModule);
      document.title = (translationsModule.default || translationsModule).title || 'KitapMatik';
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  };

  // Dil değiştirme handler
  const handleLanguageChange = async (newLang) => {
    await changeLanguage(newLang);
    setShowLangMenu(false);
  };

  const loadBook = () => {
    try {
      const book = getRandomBook();
      setSelectedBook(book);
      setError(null);
      if (!isCardOpen) {
        setIsCardOpen(true);
      }
    } catch (err) {
      setError(translations.error || 'An error occurred');
    }
  };

  const handleSurpriseClick = () => {
    if (!isCardOpen) {
      loadBook();
    }
  };

  const handleNextBook = () => {
    loadBook();
  };

  const handleCloseCard = () => {
    setIsCardOpen(false);
  };

  // Dil menüsü
  const languageNames = {
    tr: '🇹🇷 Türkçe',
    en: '🇬🇧 English',
    de: '🇩🇪 Deutsch',
    fr: '🇫🇷 Français',
    es: '🇪🇸 Español'
  };

  if (!isI18nReady) {
    return (
      <div className="App">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>{translations.loading || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {/* Dil Seçici */}
      <div style={{ position: 'fixed', top: '10px', right: '10px', zIndex: 1000 }}>
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: '1px solid #ddd',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🌐 {languageNames[lang] || lang.toUpperCase()}
        </button>
        {showLangMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '5px',
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: '150px'
          }}>
            {getSupportedLanguages().map(language => (
              <button
                key={language}
                onClick={() => handleLanguageChange(language)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 15px',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: lang === language ? '#f0f0f0' : 'white',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {languageNames[language]}
              </button>
            ))}
          </div>
        )}
      </div>

      <header className="App-header">
        <p className="eyebrow">{translations.trendRaf || 'Trend Shelf'}</p>
        <h1>{translations.title || 'KitapMatik'}</h1>
        <p>{translations.searchPlaceholder || 'Search books...'}</p>
      </header>

      <main className="App-main">
        <button
          className="cta-button"
          onClick={handleSurpriseClick}
          aria-label={translations.surprise || 'Surprise me'}
        >
          {translations.surprise || 'Surprise Me'}
        </button>

        {error && <p className="surprise-error">{error}</p>}
      </main>

      {/* Trend Raf - Aktif kalacak */}
      <TrendRaf country={lang === 'tr' ? 'TR' : 'DEFAULT'} lang={lang} />

      <footer className="App-footer">
        <p>{'\u00a9 '}{new Date().getFullYear()} {translations.title || 'KitapMatik'}</p>
      </footer>

      {isCardOpen && selectedBook && (
        <SurpriseCard book={selectedBook} onClose={handleCloseCard} onNext={handleNextBook} />
      )}
    </div>
  );
}

export default App;

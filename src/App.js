import React, { useState, useEffect } from 'react';
import SurpriseCard from './components/SurpriseCard.js';
import TrendRaf from './components/TrendRaf.jsx';
import { getRandomBook } from './modules/surprise.js';
import { detectCountry } from './utils/detectCountry.js';
import './styles/surprise.css';

function App() {
  const [selectedBook, setSelectedBook] = useState(null);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [error, setError] = useState(null);
  const [country, setCountry] = useState("TR"); // Varsayılan TR
  const [lang, setLang] = useState("tr"); // Varsayılan tr

  // IP algılama ve dil belirleme
  useEffect(() => {
    async function initCountry() {
      // localStorage'dan dil kontrolü (öncelikli)
      const savedLang = localStorage.getItem("kitap_lang");
      if (savedLang === "tr" || savedLang === "en") {
        setLang(savedLang);
        if (savedLang === "tr") {
          setCountry("TR");
        } else {
          setCountry("DEFAULT");
        }
        return;
      }

      // IP'den ülke algılama
      try {
        const detectedCountry = await detectCountry();
        
        // Ülke kodunu normalize et (TR, tr, Turkey gibi farklı formatlar olabilir)
        const normalizedCountry = detectedCountry?.toUpperCase() || "TR";
        setCountry(normalizedCountry);

        // Ülkeye göre dil belirleme
        if (normalizedCountry === "TR" || normalizedCountry === "TURKEY") {
          setLang("tr");
          setCountry("TR");
        } else {
          setLang("en");
        }
      } catch (error) {
        // Hata durumunda varsayılan olarak TR/tr kullan
        setCountry("TR");
        setLang("tr");
      }
    }

    initCountry();
  }, []);

  const loadBook = () => {
    try {
      const book = getRandomBook();
      setSelectedBook(book);
      setError(null);
      if (!isCardOpen) {
        setIsCardOpen(true);
      }
    } catch (err) {
      setError('Beni \u015ea\u015f\u0131rt listesi y\u00fcklenemedi. L\u00fctfen daha sonra tekrar deneyin.');
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

  return (
    <div className="App">
      <header className="App-header">
        <p className="eyebrow">G\u00fcn\u00fcn \u00d6nerisi</p>
        <h1>Beni {"\u015ea\u015f\u0131rt"}</h1>
        <p>Tek dokunu\u015fla yeni kitaplar ke\u015ffet, raflarda gizlenen hik\u00e2yelere kap\u0131 a\u00e7.</p>
      </header>

      <main className="App-main">
        <button
          className="cta-button"
          onClick={handleSurpriseClick}
          aria-label={lang === "tr" ? "Beni şaşırt" : "Surprise me"}
        >
          {lang === "tr" ? "Beni Şaşırt" : "Surprise Me"}
        </button>

        {error && <p className="surprise-error">{error}</p>}
      </main>

      {/* Trend Raf - Aktif kalacak */}
      <TrendRaf country={country} lang={lang} />

      <footer className="App-footer">
        <p>{'\u00a9 '}{new Date().getFullYear()} Kitap Ke\u015ffet</p>
      </footer>

      {isCardOpen && selectedBook && (
        <SurpriseCard book={selectedBook} onClose={handleCloseCard} onNext={handleNextBook} />
      )}
    </div>
  );
}

export default App;

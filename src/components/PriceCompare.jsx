import React, { useState } from "react";
import "./price.css";

export default function PriceCompare({ book }) {
  const [open, setOpen] = useState(false);
  
  // Kitap yoksa bileşeni gösterme
  if (!book) {
    return null;
  }
  
  // Fiyat verilerini al ve formatı normalize et
  let normalizedPrices = {};
  
  if (!book.prices) {
    // Fiyat yoksa default oluştur
    normalizedPrices = {
      "Trendyol": { price: "-", url: "#" },
      "D&R": { price: "-", url: "#" },
      "Amazon": { price: "-", url: "#" }
    };
  } else {
    // Eski format kontrolü: { "TR": { "trendyol": "url" } }
    if (book.prices.TR || book.prices.DEFAULT || book.prices.US || book.prices.DE) {
      // Eski format - ülkeye göre mağaza linklerini al
      const countryPrices = book.prices.TR || book.prices.DEFAULT || {};
      normalizedPrices = {};
      
      // Eski formatı yeni formata çevir
      if (countryPrices.trendyol) {
        normalizedPrices["Trendyol"] = { price: "-", url: countryPrices.trendyol };
      }
      if (countryPrices.dr) {
        normalizedPrices["D&R"] = { price: "-", url: countryPrices.dr };
      }
      if (countryPrices.amazon || countryPrices.amazon_tr) {
        normalizedPrices["Amazon"] = { price: "-", url: countryPrices.amazon || countryPrices.amazon_tr };
      }
      
      // Eğer hiçbir şey bulunamadıysa default
      if (Object.keys(normalizedPrices).length === 0) {
        normalizedPrices = {
          "Trendyol": { price: "-", url: "#" },
          "D&R": { price: "-", url: "#" },
          "Amazon": { price: "-", url: "#" }
        };
      }
    } else {
      // Yeni format: { "Trendyol": { price: "...", url: "..." } }
      normalizedPrices = book.prices;
    }
  }

  // Debug: Butonun render edildiğinden emin ol
  console.log('PriceCompare rendering for book:', book?.id || book?.title_tr || 'unknown');
  
  return (
    <div 
      className="price-section" 
      style={{ 
        display: 'block',
        visibility: 'visible',
        width: '100%',
        marginTop: '10px',
        marginBottom: '10px',
        position: 'relative',
        zIndex: 999,
        opacity: 1
      }}
    >
      <button 
        className="price-btn" 
        onClick={() => {
          console.log('Price button clicked!');
          setOpen(!open);
        }}
        type="button"
        style={{
          display: 'block',
          visibility: 'visible',
          width: '100%',
          opacity: 1,
          background: '#249bff',
          color: 'white',
          padding: '12px 16px',
          fontSize: '16px',
          fontWeight: 600,
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          margin: 0,
          boxShadow: '0 2px 8px rgba(36, 155, 255, 0.3)',
          minHeight: '48px',
          lineHeight: '1.5'
        }}
      >
        {open ? "Kapat" : "💰 Fiyatları Karşılaştır"}
      </button>

      {open && (
        <div className="price-box" style={{
          display: 'block',
          visibility: 'visible'
        }}>
          {Object.entries(normalizedPrices).map(([store, data], i) => {
            // Eğer data obje değilse (eski format), dönüştür
            const priceData = typeof data === 'object' && data !== null && !Array.isArray(data)
              ? data
              : { price: "-", url: typeof data === 'string' ? data : "#" };
            
            return (
              <div key={i} className="price-row">
                <span className="store">{store}</span>
                <span className="cost">{priceData.price || "-"}</span>
                <a 
                  className="go-buy" 
                  href={priceData.url || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Git →
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


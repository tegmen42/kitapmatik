import React from "react";
import PriceCompare from "./PriceCompare.jsx";
import "./trendCard.css";

function getTitle(b, lang) {
  return lang === "tr" ? b.title_tr : b.title_en;
}

function getSummary(b, lang) {
  return lang === "tr" ? b.summary_tr : b.summary_en;
}

export default function TrendCard({ book, country, lang }) {
  if (!book) return null;

  return (
    <div className="trend-card">
      <div className="trend-card-image">
        {book.image ? (
          <img src={book.image} alt={`${getTitle(book, lang)} kapak görseli`} loading="lazy" />
        ) : (
          <div className="trend-card-image-placeholder">
            {lang === "tr" ? "Kapak bulunamadı" : "Cover not found"}
          </div>
        )}
      </div>

      <div className="trend-card-details">
        <h3>{getTitle(book, lang)}</h3>
        <p className="trend-card-author">{book.author}</p>
        <p className="trend-card-summary">{getSummary(book, lang)}</p>
        
        {/* Fiyat karşılaştırma butonu - Summary altında */}
        <PriceCompare book={book} />
      </div>
    </div>
  );
}


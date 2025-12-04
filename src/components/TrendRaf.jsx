import React, { useState, useEffect } from "react";
import TrendCard from "./TrendCard";
import AdsSlot from "./AdsSlot";
import "./trendRaf.css";
import booksData from "../data/booksGlobal.json";

export default function TrendRaf({ country, lang }) {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    // JSON'dan kitapları yükle
    setBooks(booksData);
  }, []);

  return (
    <div className="trend-raf">
      <div className="trend-raf-header">
        <h2>{lang === "tr" ? "Trend Raf" : "Trending Shelf"}</h2>
        <p>{lang === "tr" ? "En popüler kitaplar" : "Most popular books"}</p>
      </div>

      <div className="trend-raf-grid">
        {books.map((book, index) => (
          <React.Fragment key={book.id}>
            <TrendCard book={book} country={country} lang={lang} />
            {/* Her 6 kitapta bir reklam göster */}
            {(index + 1) % 6 === 0 && (
              <div className="trend-raf-ad">
                <AdsSlot slot={`ad-slot-${Math.floor((index + 1) / 6)}`} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}


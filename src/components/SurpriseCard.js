import React from 'react';
import '../styles/surprise.css';
import PriceCompare from './PriceCompare.jsx';

const SurpriseCard = ({ book, onClose, onNext }) => {
  if (!book) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="surprise-overlay" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <article className="surprise-card" role="document">
        <button className="surprise-close" aria-label={'Karti kapat'} onClick={onClose}>
          &times;
        </button>

        <div className="surprise-image">
          {book.image ? (
            <img src={book.image} alt={`${book.title} kapak g\u00f6rseli`} loading="lazy" />
          ) : (
            <div className="surprise-image--placeholder">Kapak bulunamadi</div>
          )}
        </div>

        <div className="surprise-details">
          <span className="surprise-category-chip">{book.category}</span>
          <h2>{book.title}</h2>
          <p className="surprise-author">{book.author}</p>
          <p className="surprise-description">{book.description}</p>
          
          {/* Fiyat karşılaştırma butonu */}
          <PriceCompare book={book} />
        </div>

        <div className="surprise-card-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Kapat
          </button>
          <button type="button" className="primary" onClick={onNext}>
            Yeni Kitap Getir
          </button>
        </div>
      </article>
    </div>
  );
};

export default SurpriseCard;

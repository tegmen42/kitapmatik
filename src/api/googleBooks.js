/**
 * Google Books API - Rastgele Kitap Çekme Modülü
 * Optimize edilmiş ve hata yönetimi ile güçlendirilmiş versiyon
 */

let lastBookId = null;

const randomKeywords = [
  "novel", "story", "book", "science", "history",
  "education", "culture", "classic", "philosophy", "psychology"
];

/**
 * Google Books API'den rastgele bir kitap çeker
 * @returns {Promise<Object|null>} Kitap bilgisi veya null (hata durumunda)
 */
export async function fetchRandomBook() {
  try {
    // Rastgele bir keyword seç
    const keyword = randomKeywords[Math.floor(Math.random() * randomKeywords.length)];

    // API'den 40 sonuç çek
    const response = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(keyword)}&maxResults=40`
    );

    if (!response.ok) {
      console.warn(`Google Books API hatası: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.warn('Google Books: Sonuç bulunamadı');
      return null;
    }

    // Son seçilen kitaptan farklı bir kitap seç
    let selected;
    let attempts = 0;
    const maxAttempts = 10; // Sonsuz döngüyü önlemek için

    do {
      selected = data.items[Math.floor(Math.random() * data.items.length)];
      attempts++;
      
      // Eğer sadece 1 kitap varsa veya max deneme sayısına ulaşıldıysa çık
      if (data.items.length === 1 || attempts >= maxAttempts) {
        break;
      }
    } while (selected.id === lastBookId && data.items.length > 1);

    // Son seçilen kitabı kaydet
    lastBookId = selected.id;

    const info = selected.volumeInfo;

    // Standart format ile dön
    return {
      id: selected.id,
      title: info.title ?? "Bilinmeyen Kitap",
      subtitle: info.subtitle || "",
      author: info.authors ? info.authors.join(", ") : "Bilinmeyen Yazar",
      authors: info.authors || [],
      description: info.description || "",
      reason: info.description
        ? info.description.substring(0, 150) + "..."
        : "Google Books açıklaması bulunamadı.",
      categories: info.categories || [],
      publisher: info.publisher || "",
      source: "Google Books",
      thumbnail: info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null,
      year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
      isbn: info.industryIdentifiers?.[0]?.identifier || null
    };

  } catch (error) {
    console.error('Google Books API hatası:', error);
    return null;
  }
}

/**
 * Son seçilen kitap ID'sini sıfırlar (test/debug için)
 */
export function resetLastBookId() {
  lastBookId = null;
}


/**
 * Open Library API - Rastgele Kitap Çekme Modülü
 * Open Library API'den rastgele kitaplar çeker
 */

let lastOpenLibId = null;

const subjects = [
  "love", "science", "fantasy", "history", "adventure",
  "philosophy", "psychology", "art", "fiction"
];

/**
 * Open Library API'den rastgele bir kitap çeker
 * @returns {Promise<Object|null>} Kitap bilgisi veya null (hata durumunda)
 */
export async function fetchRandomBook() {
  try {
    const subject = subjects[Math.floor(Math.random() * subjects.length)];

    const response = await fetch(
      `https://openlibrary.org/subjects/${subject}.json?limit=50`
    );

    if (!response.ok) {
      console.warn(`Open Library API hatası: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.works || data.works.length === 0) {
      return null;
    }

    let selected;

    do {
      selected = data.works[Math.floor(Math.random() * data.works.length)];
    } while (selected.key === lastOpenLibId && data.works.length > 1);

    lastOpenLibId = selected.key;

    // Yazar bilgisini al (basit versiyon)
    let authorName = "Bilinmeyen Yazar";
    if (selected.authors && selected.authors.length > 0) {
      // Eğer author objesi içinde name varsa kullan
      if (selected.authors[0].author?.key) {
        try {
          const authorKey = selected.authors[0].author.key;
          const authorResponse = await fetch(`https://openlibrary.org${authorKey}.json`);
          if (authorResponse.ok) {
            const authorData = await authorResponse.json();
            authorName = authorData.name || authorName;
          }
        } catch (error) {
          // Yazar bilgisi alınamazsa varsayılan değeri kullan
        }
      }
    }

    // Kapak resmi URL'i oluştur
    let thumbnail = null;
    if (selected.cover_id) {
      thumbnail = `https://covers.openlibrary.org/b/id/${selected.cover_id}-L.jpg`;
    } else if (selected.cover_edition_key) {
      thumbnail = `https://covers.openlibrary.org/b/olid/${selected.cover_edition_key}-L.jpg`;
    }

    // Authors array'ini oluştur (filtreleme için)
    const authorsArray = authorName !== "Bilinmeyen Yazar" ? [authorName] : [];

    return {
      id: selected.key,
      title: selected.title ?? "Bilinmeyen Kitap",
      subtitle: bookDetails?.subtitle || "",
      author: authorName,
      authors: authorsArray,
      description: bookDetails?.description 
        ? (typeof bookDetails.description === 'string' 
            ? bookDetails.description
            : bookDetails.description.value || "")
        : "",
      reason: selected.subject
        ? selected.subject.join(", ").substring(0, 150)
        : "Open Library konularından rastgele seçildi.",
      categories: selected.subject || [],
      publisher: bookDetails?.publishers?.[0] || "",
      source: "Open Library",
      thumbnail: thumbnail,
      year: selected.first_publish_year || null
    };

  } catch (error) {
    console.error('Open Library API hatası:', error);
    return null;
  }
}

/**
 * fetchRandomFromOpenLibrary - Alternatif fonksiyon adı (geriye uyumluluk için)
 * @returns {Promise<Object|null>} Kitap bilgisi veya null
 */
export async function fetchRandomFromOpenLibrary() {
  return fetchRandomBook();
}

/**
 * Son seçilen kitap ID'sini sıfırlar (test/debug için)
 */
export function resetLastBookKey() {
  lastOpenLibId = null;
}


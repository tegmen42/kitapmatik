// Fiyat API servisleri
// Gerçek fiyatları çekmek için API entegrasyonları

/**
 * Trendyol fiyat çekme (mock - gerçek API için backend gerekli)
 */
export async function fetchTrendyolPrice(bookTitle, author) {
  try {
    // Not: Trendyol'un resmi API'si yok
    // Gerçek implementasyon için backend proxy gerekli
    // Şimdilik mock data döndürüyoruz
    
    // Gerçek implementasyon örneği:
    // const response = await fetch(`/api/trendyol?q=${encodeURIComponent(bookTitle + ' ' + author)}`);
    // const data = await response.json();
    // return data.price;
    
    // Mock fiyat (gerçek API entegrasyonu sonrası kaldırılacak)
    const mockPrice = Math.floor(Math.random() * 100) + 50; // 50-150 TL arası
    return {
      price: `${mockPrice} TL`,
      currency: 'TL',
      available: true,
      link: `https://www.trendyol.com/search?q=${encodeURIComponent(bookTitle + ' ' + author)}`
    };
  } catch (error) {
    console.error('Trendyol price fetch error:', error);
    return null;
  }
}

/**
 * D&R fiyat çekme (mock - gerçek API için backend gerekli)
 */
export async function fetchDRPrice(bookTitle, author) {
  try {
    // Not: D&R'ın resmi API'si yok
    // Gerçek implementasyon için backend proxy gerekli
    
    const mockPrice = Math.floor(Math.random() * 100) + 45; // 45-145 TL arası
    return {
      price: `${mockPrice} TL`,
      currency: 'TL',
      available: true,
      link: `https://www.dr.com.tr/search?q=${encodeURIComponent(bookTitle + ' ' + author)}`
    };
  } catch (error) {
    console.error('D&R price fetch error:', error);
    return null;
  }
}

/**
 * Amazon fiyat çekme (Amazon Product Advertising API)
 */
export async function fetchAmazonPrice(bookTitle, author, country = 'TR') {
  try {
    // Not: Amazon Product Advertising API için API key gerekli
    // Gerçek implementasyon için backend proxy gerekli (CORS sorunu)
    
    const mockPrice = country === 'TR' 
      ? Math.floor(Math.random() * 120) + 40 // 40-160 TL
      : Math.floor(Math.random() * 30) + 10; // 10-40 USD
    
    const currency = country === 'TR' ? 'TL' : 'USD';
    
    return {
      price: `${mockPrice} ${currency}`,
      currency: currency,
      available: true,
      link: country === 'TR' 
        ? `https://www.amazon.com.tr/s?k=${encodeURIComponent(bookTitle + ' ' + author)}`
        : `https://www.amazon.com/s?k=${encodeURIComponent(bookTitle + ' ' + author)}`
    };
  } catch (error) {
    console.error('Amazon price fetch error:', error);
    return null;
  }
}

/**
 * Tüm mağazalardan fiyatları çek
 */
export async function fetchAllPrices(book, country) {
  const prices = book.prices?.[country] || book.prices?.DEFAULT || {};
  const bookTitle = country === 'TR' ? book.title_tr : book.title_en;
  const author = book.author;
  
  const pricePromises = [];
  
  for (const [store, link] of Object.entries(prices)) {
    let pricePromise;
    
    switch (store.toLowerCase()) {
      case 'trendyol':
        pricePromise = fetchTrendyolPrice(bookTitle, author);
        break;
      case 'dr':
        pricePromise = fetchDRPrice(bookTitle, author);
        break;
      case 'amazon':
      case 'amazon_tr':
      case 'amazon_us':
      case 'amazon_de':
        pricePromise = fetchAmazonPrice(bookTitle, author, country);
        break;
      default:
        pricePromise = Promise.resolve({
          price: null,
          currency: null,
          available: false,
          link: link
        });
    }
    
    pricePromise = pricePromise.then(priceData => ({
      store: store,
      link: link,
      price: priceData?.price || null,
      currency: priceData?.currency || null,
      available: priceData?.available !== false
    }));
    
    pricePromises.push(pricePromise);
  }
  
  try {
    const results = await Promise.all(pricePromises);
    return results;
  } catch (error) {
    console.error('Error fetching all prices:', error);
    return [];
  }
}


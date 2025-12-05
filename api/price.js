import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

// Browser cache - tek browser instance
let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage"
            ]
        });
    }
    return browser;
}

// Fiyat temizleme fonksiyonu
function cleanPrice(priceText) {
    if (!priceText) return null;
    
    let cleaned = priceText.replace(/[^\d,.]/g, '').trim();
    
    if (!cleaned) return null;
    
    // Türkçe fiyat formatını parse et
    if (cleaned.includes('.') && cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',');
        if (parts[1] && parts[1].length <= 2) {
            cleaned = cleaned.replace(',', '.');
        } else {
            cleaned = cleaned.replace(',', '');
        }
    }
    
    const priceNum = parseFloat(cleaned);
    
    if (priceNum >= 5 && priceNum <= 10000 && !isNaN(priceNum)) {
        return priceNum.toFixed(2).replace(/\.00$/, '');
    }
    
    return null;
}

// Axios ile ürün linki bulma (hızlı)
async function axGetProductLink(url, linkSelector) {
    try {
        const res = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
            },
            timeout: 10000
        });
        const $ = cheerio.load(res.data);
        const link = $(linkSelector).first().attr('href');
        if (link) {
            if (!link.startsWith('http')) {
                const baseUrl = new URL(url).origin;
                return new URL(link, baseUrl).href;
            }
            return link;
        }
        return null;
    } catch (e) {
        return null;
    }
}

// Axios scraper - hızlı (çalışan 3 mağaza için)
async function axPrice(url, selectors, storeName, productLinkSelector = null) {
    try {
        const res = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
                "Referer": "https://www.google.com/"
            },
            timeout: 15000
        });
        
        const $ = cheerio.load(res.data);
        
        // Eğer arama sayfasıysa, ilk ürün linkini bul ve git
        if (productLinkSelector) {
            const firstProductLink = $(productLinkSelector).first().attr('href');
            if (firstProductLink) {
                let productUrl = firstProductLink;
                if (!productUrl.startsWith('http')) {
                    const baseUrl = new URL(url).origin;
                    productUrl = new URL(productUrl, baseUrl).href;
                }
                
                try {
                    const productRes = await axios.get(productUrl, {
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            "Accept-Language": "tr-TR,tr;q=0.9"
                        },
                        timeout: 10000
                    });
                    const $product = cheerio.load(productRes.data);
                    const selectorList = Array.isArray(selectors) ? selectors : [selectors];
                    
                    for (const selector of selectorList) {
                        const priceText = $product(selector).first().text().trim();
                        if (priceText) {
                            const cleaned = cleanPrice(priceText);
                            if (cleaned && cleaned !== "-") return cleaned;
                        }
                    }
                } catch (e) {
                    // Ürün sayfası hatası, arama sayfasından devam et
                }
            }
        }
        
        // Arama sayfasından direkt fiyat ara
        const selectorList = Array.isArray(selectors) ? selectors : [selectors];
        
        for (const selector of selectorList) {
            let priceText = $(selector).first().text().trim();
            
            if (!priceText) {
                priceText = $(selector).first().attr('data-price') || 
                           $(selector).first().attr('content') ||
                           $(selector).first().find('[data-price]').first().attr('data-price');
            }
            
            if (priceText) {
                const cleaned = cleanPrice(priceText);
                if (cleaned && cleaned !== "-") return cleaned;
            }
        }
        
        return null;
    } catch (error) {
        return null;
    }
}

// Infinite scroll helper
async function autoScroll(p) {
    await p.evaluate(async () => {
        await new Promise(resolve => {
            let total = 0, distance = 350;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                total += distance;
                if (total >= 3500) {
                    clearInterval(timer);
                    resolve();
                }
            }, 350);
        });
    });
}

// Ürün linki getiren fonksiyon - arama sayfasından (Puppeteer ile JavaScript yükleme)
async function getFirstProductLink(url, linkSelectors, storeName) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 60000
        });
        
        await page.waitForTimeout(5000);
        
        // Popup kapatma
        const popupSelectors = [
            "button[id*='onetrust']",
            "button[class*='accept']",
            "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
            "button[id*='cookie']",
            "button[class*='cookie']",
            "[id*='accept']",
            "[class*='accept-all']"
        ];
        
        for (const selector of popupSelectors) {
            try {
                await page.click(selector, { timeout: 2000 });
                await page.waitForTimeout(1000);
                break;
            } catch (e) {}
        }
        
        // Lazy load tetikleme
        await page.evaluate(async () => {
            const delay = ms => new Promise(res => setTimeout(res, ms));
            for (let i = 0; i < 3; i++) {
                for (let y = 200; y < 5000; y += 300) {
                    window.scrollTo(0, y);
                    await delay(400);
                }
                for (let y = 5000; y > 0; y -= 300) {
                    window.scrollTo(0, y);
                    await delay(300);
                }
                window.scrollTo(0, 0);
                await delay(500);
            }
        });
        
        await page.waitForTimeout(3000);
        await autoScroll(page);
        await page.waitForTimeout(2000);
        
        // Selector'larla link ara
        for (let sel of linkSelectors) {
            try {
                const link = await page.evaluate((selector) => {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.href || element.getAttribute('href');
                    }
                    return null;
                }, sel);
                
                if (link && link.length > 10) {
                    let fullLink = link;
                    if (!link.startsWith("http")) {
                        const baseUrl = url.split("/").slice(0, 3).join("/");
                        fullLink = link.startsWith("/") ? baseUrl + link : baseUrl + "/" + link;
                    }
                    await page.close();
                    return fullLink;
                }
            } catch (e) {}
        }
        
        // Geniş arama
        const allLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href]'));
            return links.slice(0, 100).map(link => ({
                href: link.href || link.getAttribute('href'),
                text: link.textContent ? link.textContent.trim().substring(0, 50) : ''
            }));
        });
        
        // Mağaza bazlı kontrol
        if (url.includes("trendyol.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                if (href && (href.includes("/urun/") || href.includes("/p-"))) {
                    if (!href.includes("/kampanya/") && !href.includes("/kategori/")) {
                        await page.close();
                        return href.startsWith("http") ? href : new URL(href, url).href;
                    }
                }
            }
        }
        
        if (url.includes("hepsiburada.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                if (href && href.includes("-p-")) {
                    if (!href.includes("/kampanya/") && !href.includes("/kategori/")) {
                        await page.close();
                        return href.startsWith("http") ? href : new URL(href, url).href;
                    }
                }
            }
        }
        
        if (url.includes("bkmkitap.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                if (href && (href.includes("/urun/") || href.includes("/kitap/"))) {
                    await page.close();
                    return href.startsWith("http") ? href : new URL(href, url).href;
                }
            }
        }
        
        await page.close();
        return null;
    } catch (error) {
        if (page) {
            try {
                await page.close();
            } catch (e) {}
        }
        return null;
    }
}

// Ürün sayfasından fiyat alan fonksiyon
async function productPrice(url, selectors, storeName) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000
        });
        
        await page.waitForTimeout(2500);
        
        for (let sel of selectors) {
            try {
                const el = await page.$(sel);
                if (el) {
                    const price = await page.evaluate(el => el.innerText.trim(), el);
                    if (price && price.length > 1) {
                        const cleaned = cleanPrice(price);
                        if (cleaned) {
                            await page.close();
                            return cleaned;
                        }
                    }
                }
            } catch (e) {}
        }
        
        await page.close();
        return "-";
    } catch (error) {
        if (page) {
            try {
                await page.close();
            } catch (e) {}
        }
        return "-";
    }
}

// Sepete ekleme URL'i oluşturma fonksiyonu
function createCartLink(url, store) {
    if (!url) return null;
    return url; // Şimdilik ürün sayfasına yönlendir
}

// Deeplink oluşturma fonksiyonu
function createDeepLink(url, store) {
    if (!url) return null;
    
    if (store === "Trendyol") {
        const idMatch = url.match(/p-(\d+)/);
        if (idMatch) {
            return `trendyol://product-detail/${idMatch[1]}`;
        }
        return url;
    }
    
    if (store === "Hepsiburada") {
        const idMatch = url.match(/-p-([^/?]+)/);
        if (idMatch) {
            return `hepsiburada://product/${idMatch[1]}`;
        }
        return url;
    }
    
    return url;
}

// Mağaza fiyatı - tam scraping süreci
async function fullScrape(query, store) {
    const searchUrl = store.search(query);
    
    const product = await getFirstProductLink(searchUrl, store.links, store.name);
    if (!product) {
        return { price: "-", link: null, deeplink: null, cartLink: null };
    }
    
    const price = await productPrice(product, store.prices, store.name);
    
    return {
        price: price || "-",
        link: product,
        deeplink: createDeepLink(product, store.name),
        cartLink: createCartLink(product, store.name)
    };
}

// IP'den ülke kodu belirleme
async function detectCountryFromIP(req) {
    try {
        // Client IP'yi al
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.headers['x-real-ip'] || 
                        req.connection?.remoteAddress ||
                        req.socket?.remoteAddress;
        
        if (clientIP && clientIP !== '::1' && !clientIP.startsWith('127.')) {
            const response = await axios.get(`https://ipapi.co/${clientIP}/json/`, {
                timeout: 5000
            });
            return response.data?.country_code?.toUpperCase() || 'TR';
        }
        
        // Fallback - ipapi.co/json kullan
        const response = await axios.get('https://ipapi.co/json/', {
            timeout: 5000
        });
        return response.data?.country_code?.toUpperCase() || 'TR';
    } catch (error) {
        console.error('IP detection error:', error.message);
        return 'TR'; // Default Türkiye
    }
}

// Mağaza yapılandırması - Ülke bazlı gruplar
const STORES_BY_COUNTRY = {
    TR: [
        {
            name: "Trendyol",
            search: q => `https://www.trendyol.com/sr?q=${q}`,
            links: ["div.p-card-wrppr a[href*='/urun/']", "div.p-card-chldrn a[href*='/urun/']", "a[href*='/urun/']"],
            prices: [".prc-dscntd", ".pr-new-br", ".prc-box-dscntd", ".product-price"],
            method: "puppeteer"
        },
        {
            name: "Hepsiburada",
            search: q => `https://www.hepsiburada.com/ara?q=${q}`,
            links: ["li[data-test-id='product-item'] a[href*='-p-']", "a[href*='-p-']"],
            prices: ["[data-test-id='price-current-price']", ".price-value", "[itemprop='price']"],
            method: "puppeteer"
        },
        {
            name: "D&R",
            search: q => `https://www.dr.com.tr/search?q=${q}`,
            links: ["a.prd-link"],
            prices: [".prd-prc", ".price"],
            method: "axios"
        },
        {
            name: "BKM",
            search: q => `https://www.bkmkitap.com/index.php?p=search&search=${q}`,
            links: ["a[href*='/urun/']", "a[href*='/kitap/']"],
            prices: [".new-price", ".sale-price", ".price"],
            method: "puppeteer"
        },
        {
            name: "Kitapyurdu",
            search: q => `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${q}`,
            links: ["a.product-link"],
            prices: [".price-new", ".price .price-new"],
            method: "axios"
        },
        {
            name: "Kidega",
            search: q => `https://www.kidega.com/arama?q=${q}`,
            links: ["a.product-item-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    US: [
        {
            name: "Amazon US",
            search: q => `https://www.amazon.com/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "Barnes&Noble",
            search: q => `https://www.barnesandnoble.com/s/${q}`,
            links: ["a.prouct-info-title-link"],
            prices: [".price-current", ".price"],
            method: "axios"
        },
        {
            name: "Books-A-Million",
            search: q => `https://www.booksamillion.com/search?query=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Walmart Books",
            search: q => `https://www.walmart.com/search?q=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", "[itemprop='price']"],
            method: "axios"
        }
    ],
    UK: [
        {
            name: "Amazon UK",
            search: q => `https://www.amazon.co.uk/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "Waterstones",
            search: q => `https://www.waterstones.com/books/search/term/${q}`,
            links: ["a.book-title-link"],
            prices: [".price", ".book-price"],
            method: "axios"
        },
        {
            name: "Blackwell's",
            search: q => `https://blackwells.co.uk/bookshop/search/${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "WHSmith",
            search: q => `https://www.whsmith.co.uk/search/go?w=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    DE: [
        {
            name: "Amazon DE",
            search: q => `https://www.amazon.de/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "Thalia",
            search: q => `https://www.thalia.de/suche?sq=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Hugendubel",
            search: q => `https://www.hugendubel.de/de/suche/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Weltbild",
            search: q => `https://www.weltbild.de/suche/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    FR: [
        {
            name: "Amazon FR",
            search: q => `https://www.amazon.fr/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "FNAC",
            search: q => `https://www.fnac.com/SearchResult/ResultList.aspx?SCat=0&Search=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Decitre",
            search: q => `https://www.decitre.fr/recherche/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Cultura",
            search: q => `https://www.cultura.com/recherche/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    ES: [
        {
            name: "Amazon ES",
            search: q => `https://www.amazon.es/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "CasaDelLibro",
            search: q => `https://www.casadellibro.com/busqueda/libros/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "El Corte Inglés",
            search: q => `https://www.elcorteingles.es/libros/buscar/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "FNAC ES",
            search: q => `https://www.fnac.es/SearchResult/ResultList.aspx?SCat=0&Search=${q}`,
            links: ["a.product-title-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    IT: [
        {
            name: "Amazon IT",
            search: q => `https://www.amazon.it/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "IBS",
            search: q => `https://www.ibs.it/cerca/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Feltrinelli",
            search: q => `https://www.lafeltrinelli.it/cerca?q=${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        },
        {
            name: "Mondadori",
            search: q => `https://www.mondadoristore.it/cerca/${q}`,
            links: ["a.product-link"],
            prices: [".price", ".product-price"],
            method: "axios"
        }
    ],
    IN: [
        {
            name: "Amazon IN",
            search: q => `https://www.amazon.in/s?k=${q}`,
            links: ["h2 a.a-link-normal"],
            prices: [".a-price-whole", ".a-price .a-offscreen"],
            method: "axios"
        },
        {
            name: "Flipkart Books",
            search: q => `https://www.flipkart.com/search?q=${q}`,
            links: ["a._2UzuFa"],
            prices: ["._30jeq3", "[class*='price']"],
            method: "axios"
        }
    ],
    GLOBAL: [
        {
            name: "AbeBooks",
            search: q => `https://www.abebooks.com/servlet/SearchResults?kn=${q}`,
            links: ["a.item-link"],
            prices: [".item-price", ".price"],
            method: "axios"
        },
        {
            name: "Google Books",
            search: q => null, // API kullanılacak
            links: [],
            prices: [],
            method: "api"
        }
    ]
};

// Eski STORES yapısı (geriye dönük uyumluluk)
const STORES = {
    Trendyol: {
        name: "Trendyol",
        search: q => `https://www.trendyol.com/sr?q=${q}`,
        links: ["div.p-card-wrppr a[href*='/urun/']", "div.p-card-chldrn a[href*='/urun/']", "a[href*='/urun/']"],
        prices: [".prc-dscntd", ".pr-new-br", ".prc-box-dscntd", ".product-price"]
    },
    Hepsiburada: {
        name: "Hepsiburada",
        search: q => `https://www.hepsiburada.com/ara?q=${q}`,
        links: ["li[data-test-id='product-item'] a[href*='-p-']", "a[href*='-p-']"],
        prices: ["[data-test-id='price-current-price']", ".price-value", "[itemprop='price']"]
    },
    BKM: {
        name: "BKM",
        search: q => `https://www.bkmkitap.com/index.php?p=search&search=${q}`,
        links: ["a[href*='/urun/']", "a[href*='/kitap/']"],
        prices: [".new-price", ".sale-price", ".price"]
    }
};

// Mağaza scraping helper - method'a göre doğru scraper'ı çağır
async function scrapeStore(storeConfig, query) {
    try {
        if (storeConfig.method === "axios") {
            const searchUrl = storeConfig.search(query);
            if (!searchUrl) return { price: "-", link: null, deeplink: null, cartLink: null };
            
            const price = await axPrice(
                searchUrl,
                storeConfig.prices,
                storeConfig.name,
                storeConfig.links?.[0] || null
            );
            
            const link = storeConfig.links?.[0] 
                ? await axGetProductLink(searchUrl, storeConfig.links[0])
                : null;
            
            return {
                price: price || "-",
                link: link,
                deeplink: createDeepLink(link, storeConfig.name),
                cartLink: createCartLink(link, storeConfig.name)
            };
        } else if (storeConfig.method === "puppeteer") {
            const storeObj = {
                name: storeConfig.name,
                search: storeConfig.search,
                links: storeConfig.links,
                prices: storeConfig.prices
            };
            return await fullScrape(query, storeObj);
        } else if (storeConfig.method === "api") {
            // Google Books API (fallback)
            try {
                const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`, {
                    timeout: 5000
                });
                const item = response.data?.items?.[0];
                if (item?.saleInfo?.listPrice) {
                    return {
                        price: item.saleInfo.listPrice.amount?.toString() || "-",
                        link: item.volumeInfo.infoLink || null,
                        deeplink: null,
                        cartLink: item.volumeInfo.infoLink || null
                    };
                }
            } catch (e) {}
            return { price: "-", link: null, deeplink: null, cartLink: null };
        }
    } catch (error) {
        console.error(`Error scraping ${storeConfig.name}:`, error.message);
        return { price: "-", link: null, deeplink: null, cartLink: null };
    }
    
    return { price: "-", link: null, deeplink: null, cartLink: null };
}

// Vercel serverless function handler
export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const name = req.query.name;
    
    if (!name) {
        return res.status(400).json({ error: "Kitap adı gerekli" });
    }

    const q = encodeURIComponent(name);
    
    // IP'den ülke kodu belirle
    let countryCode = 'TR'; // Default
    try {
        countryCode = await detectCountryFromIP(req);
    } catch (error) {
        console.error('Country detection failed, using default TR:', error.message);
    }
    
    // Ülkeye göre mağaza grubunu seç
    let storesToScrape = STORES_BY_COUNTRY[countryCode] || STORES_BY_COUNTRY.TR;
    
    console.log(`🌍 Detected country: ${countryCode}, Using ${storesToScrape.length} stores`);
    
    // Tüm mağazaları paralel scrape et
    const storePromises = storesToScrape.map(store => scrapeStore(store, q));
    const results = await Promise.allSettled(storePromises);
    
    // Sonuçları formatla
    const prices = {};
    storesToScrape.forEach((store, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
            prices[store.name] = result.value || { price: "-", link: null, deeplink: null, cartLink: null };
        } else {
            prices[store.name] = { price: "-", link: null, deeplink: null, cartLink: null };
        }
    });
    
    // Eğer ülke mağazalarından yeterli sonuç yoksa, global fallback mağazaları dene
    const validResults = Object.values(prices).filter(p => p.price !== "-" && p.price !== null).length;
    if (validResults < 2 && STORES_BY_COUNTRY.GLOBAL) {
        console.log(`📦 Only ${validResults} valid results, trying global fallback stores...`);
        const globalPromises = STORES_BY_COUNTRY.GLOBAL.map(store => scrapeStore(store, q));
        const globalResults = await Promise.allSettled(globalPromises);
        
        STORES_BY_COUNTRY.GLOBAL.forEach((store, index) => {
            const result = globalResults[index];
            if (result.status === 'fulfilled' && result.value && result.value.price !== "-") {
                prices[store.name] = result.value;
            }
        });
    }
    
    // İstatistikleri logla
    const activeStores = Object.values(prices).filter(p => p.price !== "-" && p.price !== null).length;
    const storeDistribution = {};
    Object.keys(prices).forEach(storeName => {
        const country = Object.keys(STORES_BY_COUNTRY).find(c => 
            STORES_BY_COUNTRY[c].some(s => s.name === storeName)
        ) || 'GLOBAL';
        if (!storeDistribution[country]) storeDistribution[country] = 0;
        if (prices[storeName].price !== "-") storeDistribution[country]++;
    });
    
    console.log(`✅ Active stores: ${activeStores}`);
    console.log(`📊 Store distribution:`, storeDistribution);
    
    return res.status(200).json(prices);
}


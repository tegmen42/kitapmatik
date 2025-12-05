import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3003;

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Browser cache - tek browser instance
let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage"
            ]
        });
        console.log("✅ Browser instance oluşturuldu (cache'lenmiş)");
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
        
        // Genel fiyat arama - sayfada fiyat pattern'i ara
        const pageText = $.text();
        const pricePatterns = [
            /(\d{1,4}[.,]\d{2})\s*(?:TL|₺)/gi,
            /(?:₺|TL)\s*(\d{1,4}[.,]?\d{0,2})/gi,
            /(\d{1,3}(?:[.,]\d{3})*[.,]?\d{0,2})\s*(?:TL|₺)/gi
        ];
        
        for (const pattern of pricePatterns) {
            const matches = pageText.match(pattern);
            if (matches) {
                for (const match of matches.slice(0, 5)) {
                    const cleaned = cleanPrice(match);
                    if (cleaned && cleaned !== "-") return cleaned;
                }
            }
        }
        
        return null;
    } catch (error) {
        console.log(`Axios error (${storeName}): ${error.message.substring(0, 50)}`);
        return null;
    }
}

// Puppeteer fallback scraper - yedek plan
async function puPrice(url, selectors) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36");
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 25000
        });
        
        await new Promise(r => setTimeout(r, 1000));
        
        // Fallback selector'lar
        const fallbackSelectors = [
            ".prc-box-price", ".prc-box", ".product-price", 
            "[itemprop='price']", ".value", ".price", ".sale-price"
        ];
        
        const allSelectors = Array.isArray(selectors) ? [...selectors, ...fallbackSelectors] : [selectors, ...fallbackSelectors];
        
        let price = null;
        for (let s of allSelectors) {
            try {
                const el = await page.$(s);
                if (el) {
                    price = await page.evaluate(el => el.innerText.trim(), el);
                    if (price && price.length > 1) {
                        const cleaned = cleanPrice(price);
                        if (cleaned) {
                            await page.close();
                            return cleaned;
                        }
                    }
                }
            } catch (e) {
                // Selector bulunamadı, devam et
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

// Infinite scroll helper - daha stabil scroll
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


// Sepete ekleme URL'i oluşturma fonksiyonu
function createCartLink(url, store) {
    if (!url) return null;
    // Basit yaklaşım: URL'e sepete ekleme parametresi ekle
    return url + (url.includes('?') ? '&' : '?') + 'add-to-cart=1';
}

// Deeplink oluşturma fonksiyonu
function createDeepLink(url, store) {
    if (!url) return null;
    
    if (store === "Trendyol") {
        const idMatch = url.match(/p-(\d+)/);
        if (idMatch) {
            return `trendyol://product-detail/${idMatch[1]}`;
        }
        return url; // deep link bulunamazsa web linke düşsün
    }
    
    if (store === "Hepsiburada") {
        const idMatch = url.match(/-p-([^/?]+)/);
        if (idMatch) {
            return `hepsiburada://product/${idMatch[1]}`;
        }
        return url;
    }
    
    if (store === "BKM") {
        return url; // şu an app deeplink yok, web yönlendirme
    }
    
    return url;
}

// Generic: İlk ürün linkini bul
async function getFirstProductLink(page, selectors, domain, query) {
    const queryLower = query.toLowerCase();
    
    // 1) selector bazlı arama
    for (const selector of selectors) {
        try {
            await page.waitForSelector(selector, { timeout: 4000 });
            let links = await page.$$eval(selector, els => els.map(a => a.href || a.getAttribute("href")));

            // Önce query içeren linkleri filtrele (öncelik)
            let queryLinks = links.filter(l => l && l.toLowerCase().includes(queryLower));
            
            // Query içeren link varsa onu kullan
            if (queryLinks.length > 0) {
                let link = queryLinks[0];
                if (link.startsWith("/")) link = domain + link;
                return link;
            }
            
            // Query yoksa "kitap", "emp", "oz" içeren linklere bak (ama "cocuk", "boya", "duvar" içermesin)
            let fallbackLinks = links.filter(l => {
                if (!l) return false;
                const lLower = l.toLowerCase();
                const hasKitap = lLower.includes("kitap") || lLower.includes("emp") || lLower.includes("oz");
                const hasExcluded = lLower.includes("cocuk") || lLower.includes("boya") || lLower.includes("duvar") || lLower.includes("klasik");
                return hasKitap && !hasExcluded;
            });
            
            if (fallbackLinks.length > 0) {
                let link = fallbackLinks[0];
                if (link.startsWith("/")) link = domain + link;
                return link;
            }
        } catch {}
    }

    // 2) fallback → tüm linkleri tara, önce query içerenleri
    const fallback = await page.evaluate((q) => {
        const allLinks = [...document.querySelectorAll("a")]
            .map(a => a.href)
            .filter(h => h);
        
        // Önce query içeren linkleri bul
        const queryLinks = allLinks.filter(h => h.toLowerCase().includes(q.toLowerCase()));
        if (queryLinks.length > 0) return queryLinks;
        
        // Query yoksa "kitap" içeren linklere bak (ama "cocuk", "boya", "duvar" içermesin)
        const kitapLinks = allLinks.filter(h => {
            const hLower = h.toLowerCase();
            return hLower.includes("kitap") && 
                   !hLower.includes("cocuk") && 
                   !hLower.includes("boya") && 
                   !hLower.includes("duvar") && 
                   !hLower.includes("klasik");
        });
        return kitapLinks;
    }, query);

    if (fallback[0]) {
        let link = fallback[0];
        if (link.startsWith("/")) link = domain + link;
        return link;
    }

                return null;
}

// Generic: Fiyat çek
async function getPrice(page, selectors, bookName = null) {
    // H1/title kontrolü (eğer bookName verilmişse)
    if (bookName) {
        const productTitle = await page.$eval("h1", el => el.innerText.toLowerCase()).catch(() => "");
        if (productTitle && !productTitle.includes(bookName.toLowerCase())) {
            console.log("❌ Başlık eşleşmedi → yanlış ürün");
                return null;
        }
    }
    
    const priceSelectors = [
        ".prc-box-dscntd",
        ".prc-box",
        ".sale-price",
        ".price",
        ".product-price",
        ".value",
        "[data-testid='price-current-price']",
        "span[class*='Price_']",
        "[itemprop='price']",
        ".discount-price",
        ".selling-price",
        ".urunFiyat"
    ];
    
    const allSelectors = selectors && selectors.length > 0 ? [...selectors, ...priceSelectors] : priceSelectors;
    
    // 2 saniyelik bekleme
    await new Promise(r => setTimeout(r, 2000));
    
    for (const sel of allSelectors) {
        try {
            const priceText = await page.$eval(sel, el => {
                const txt = el.innerText || el.textContent || '';
                return txt.replace(/[^0-9.,]/g,"").trim();
            });
            if (priceText && priceText.length > 1) {
                const cleaned = cleanPrice(priceText);
                if (cleaned) {
                    return cleaned;
                }
            }
        } catch (e) {
            // Selector bulunamadı, devam et
        }
    }
    
    // Fallback 1: querySelectorAll ile tüm DOM'u tara
    try {
        const allElements = await page.$$eval('*', elements => {
            return elements.map(el => {
                const txt = el.innerText || el.textContent || '';
                if (txt && (txt.includes('₺') || txt.includes('TL'))) {
                    return txt.replace(/[^0-9.,]/g,"").trim();
                }
                return null;
            }).filter(t => t && t.length > 1);
        });
        
        if (allElements && allElements.length > 0) {
            for (const priceText of allElements) {
                const cleaned = cleanPrice(priceText);
                if (cleaned) {
                    return cleaned;
                }
            }
        }
    } catch (e) {
        // Fallback 1 başarısız, devam et
    }
    
    // Fallback 2: TL veya ₺ içeren textNode bul
    try {
        const fallbackPrice = await page.evaluate(() => {
            const txt = [...document.body.querySelectorAll("*")]
                .map(e => e.innerText || e.textContent || '')
                .find(t => t && (t.includes("TL") || t.includes("₺")));
            return txt ? txt.replace(/[^0-9.,]/g,"") : null;
        });
        
        if (fallbackPrice && fallbackPrice.length > 1) {
            const cleaned = cleanPrice(fallbackPrice);
            if (cleaned) {
                return cleaned;
            }
        }
    } catch (e) {
        // Fallback 2 başarısız
    }
    
        return null;
}

// Mağaza fiyatı (yeni) - basit ve etkili scraping
async function fullScrape(query, store) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36");
        await page.setViewport({ width: 1920, height: 1080 });
        
        const searchUrl = store.search(query);
        const domain = new URL(searchUrl).origin;
        console.log(`🔍 ${store.name} - Arama: ${searchUrl.substring(0, 60)}...`);
        
        // 1) Arama sayfasına git
        await page.goto(searchUrl, {
            waitUntil: "domcontentloaded",
            timeout: 25000
        });
        await new Promise(r => setTimeout(r, 2000));
        
        // 2) Cookie popup bypass - text içeren butonları da dene
        const cookieSelectors = [
            "button#onetrust-accept-btn-handler",
            "button[aria-label='Kabul et']",
            ".cookie-policy-accept",
            "button[class*='accept']"
        ];
        
        for (const sel of cookieSelectors) {
            try {
                const btn = await page.$(sel);
                if (btn) {
                    await page.click(sel).catch(() => {});
                    console.log(`✅ ${store.name} - Cookie popup kapatıldı (${sel})`);
                    await new Promise(r => setTimeout(r, 500));
                    break;
                }
            } catch (e) {
                // Cookie butonu bulunamadı, devam et
            }
        }
        
        // Text içeren butonları da dene
        try {
            const textButtons = await page.$$eval('button', buttons => 
                buttons
                    .filter(btn => {
                        const text = (btn.innerText || btn.textContent || '').toLowerCase();
                        return text.includes('kabul') || text.includes('accept');
                    })
                    .map(btn => {
                        const id = btn.id;
                        const classes = btn.className;
                        return id ? `button#${id}` : classes ? `button.${classes.split(' ')[0]}` : null;
                    })
                    .filter(Boolean)
            );
            
            for (const btnSel of textButtons.slice(0, 3)) {
                try {
                    await page.click(btnSel).catch(() => {});
                    console.log(`✅ ${store.name} - Cookie popup kapatıldı (text match)`);
                    await new Promise(r => setTimeout(r, 500));
                    break;
            } catch (e) {}
        }
        } catch (e) {
            // Text match başarısız, devam et
        }
        
        // 3) Ürün grid'i için bekle
        await page.waitForSelector("a[href*='/p-'], a[href*='/urun'], .product-card, .p-card-chldrn-cntnr", {timeout: 8000}).catch(() => null);
        
        // 4) Anti-bot delay - her mağaza için 2-2.5 sn rastgele bekleme
        const delay = 2000 + Math.random() * 500; // 2000-2500ms arası
        await new Promise(r => setTimeout(r, delay));
        
        // 5) İlk ürün linkini bul
        const link = await getFirstProductLink(page, store.links, domain, query);
        if (!link) {
            console.log(`⚠️  ${store.name} - Ürün linki bulunamadı`);
            await page.close();
            return { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
        }
        
        // Link encoding temizle (özellikle Trendyol için)
        if (link) {
            try {
                // Boşlukları ve encoding sorunlarını temizle
                link = encodeURI(decodeURIComponent(link.trim().replace(/\s+/g, ' ')));
            } catch (e) {
                // Encoding hatası varsa orijinal link'i kullan
            }
        }
        
        console.log(`✅ ${store.name} - Link bulundu: ${link ? link.substring(0, 70) : 'null'}...`);
        
        // 6) Ürün sayfasına git
        await page.goto(link, {
            waitUntil: "networkidle2",
            timeout: 25000
        });
        await new Promise(r => setTimeout(r, 2000));
        
        // 6.5) H1/title kontrolü - yanlış ürün kontrolü
        const productTitle = await page.$eval("h1", el => el.innerText.toLowerCase()).catch(() => "");
        if (productTitle && !productTitle.includes(query.toLowerCase())) {
            console.log("❌ Başlık eşleşmedi → yanlış ürün");
            await page.close();
            return { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
        }
        
        // 7) Fiyatı çek
        const price = await getPrice(page, store.prices, query);
        
        // 📌 HEADLINE & BOOK VALIDATION EKLE
        // Ürün başlığı kontrolü
        const pageTitle = await page.title();
        const lowered = pageTitle.toLowerCase();
        const q = query.toLowerCase();

        if (!lowered.includes(q) && !lowered.match(new RegExp(q.split(" ")[0], "i"))) {
            console.log("❌ Ürün yanlış eşleşti → " + pageTitle);
            await page.close();
            return { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
        }

        // Kategori filtrele (yanlış sonuç elemeleri)
        if (lowered.includes("boya") || lowered.includes("duvar") || lowered.includes("klasik") || lowered.includes("çocuk")) {
            console.log("⚠ Uygun olmayan kategori → " + pageTitle);
            await page.close();
            return { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
        }

        // Fiyat yoksa Google Books API fallback
        if (!price || price === "-" || price === null) {
            console.log("⚠ Fiyat yok → Google Books API'ye fallback yapılıyor");
            await page.close();
            
            try {
                const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
                const data = await googleRes.json();
                const googleLink = data.items?.[0]?.volumeInfo?.infoLink ?? null;
                const result = {
                    store: "Google Books",
                    price: data.items?.[0]?.saleInfo?.listPrice?.amount ?? "-",
                    link: googleLink,
                    deeplink: null,
                    cartLink: createCartLink(googleLink, "Google Books")
                };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            } catch (googleError) {
                console.log(`⚠ Google Books API hatası: ${googleError.message}`);
                const result = { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            }
        }
        
        await page.close();
        
        // Link tamamlayıcı: NULL ise arama linkini kullan (özellikle D&R için)
        let finalLink = link;
        if (!finalLink && store.name === "D&R") {
            finalLink = store.search(query);
            console.log(`⚠️ ${store.name} - Ürün linki yok, arama linki kullanılıyor`);
        }
        
        // Deeplink oluştur
        const deeplink = finalLink ? createDeepLink(finalLink, store.name) : null;
        
        // CartLink oluştur - standardize edilmiş mantık
        const cartLink = createCartLink(finalLink, store.name);
        
        // Sonuç objesi oluştur
        const result = {
            store: store.name,
            price: price || "-",
            link: finalLink,
            deeplink: deeplink,
            cartLink: cartLink
        };
        
        console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        if (page) {
            try {
                await page.close();
            } catch (e) {}
        }
        // Kidega 404 veya diğer hatalar için
        if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
            // Google Books API fallback
            try {
                const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
                const data = await googleRes.json();
                const googleLink = data.items?.[0]?.volumeInfo?.infoLink ?? null;
                const result = {
                    store: "Google Books",
                    price: data.items?.[0]?.saleInfo?.listPrice?.amount ?? "-",
                    link: googleLink,
                    deeplink: null,
                    cartLink: createCartLink(googleLink, "Google Books")
                };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            } catch (googleError) {
                const result = { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            }
        }
        console.log(`❌ ${store.name} - fullScrape hatası: ${error.message.substring(0, 50)}`);
        
        // Google Books API fallback
        try {
            const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}`);
            const data = await googleRes.json();
            const googleLink = data.items?.[0]?.volumeInfo?.infoLink ?? null;
            const result = {
                store: "Google Books",
                price: data.items?.[0]?.saleInfo?.listPrice?.amount ?? "-",
                link: googleLink,
                deeplink: null,
                cartLink: createCartLink(googleLink, "Google Books")
            };
            console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
            return result;
        } catch (googleError) {
            const result = { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
            console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
            return result;
        }
    }
}

// IP'den ülke kodu belirleme (Express için)
async function detectCountryFromIP(req) {
    try {
        const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || 
                        req.headers['x-real-ip'] || 
                        req.connection?.remoteAddress ||
                        req.socket?.remoteAddress ||
                        req.ip;
        
        if (clientIP && clientIP !== '::1' && !clientIP.startsWith('127.')) {
            const response = await axios.get(`https://ipapi.co/${clientIP}/json/`, {
                timeout: 5000
            });
            return response.data?.country_code?.toUpperCase() || 'TR';
        }
        
        const response = await axios.get('https://ipapi.co/json/', {
            timeout: 5000
        });
        return response.data?.country_code?.toUpperCase() || 'TR';
    } catch (error) {
        console.error('IP detection error:', error.message);
        return 'TR';
    }
}

// Mağaza yapılandırması - Ülke bazlı gruplar (api/price.js ile aynı)
const STORES_BY_COUNTRY = {
    TR: [
        { name: "Trendyol", search: q => `https://www.trendyol.com/sr?q=${q}`, links: ["a[href*='/p-']", "a[href*='sr?']", "a[href*='urun']", ".p-card-chldrn-cntnr a", "a[class*='product']", "a[href*='kitap']"], prices: [".prc-box-dscntd", ".prc-box-sllng", ".pr-bx-price", "[data-testid='price-current-price']", "[class*='price']", "span[class*='prc']", "div[class*='price']"], method: "puppeteer" },
        { name: "Hepsiburada", search: q => `https://www.hepsiburada.com/ara?q=${q}`, links: ["a[href*='/p-']", "a[href*='/urun']", "a[class*='product']", "a[href*='kitap']"], prices: ["[itemprop='price']", ".product-price", ".extra-discount-price", "span[class*='Price_']", "span[class*='price']", ".price", ".price-tag"], method: "puppeteer" },
        { name: "D&R", search: q => `https://www.dr.com.tr/search?q=${q}`, links: ["a.prd-link"], prices: [".prd-prc", ".price"], method: "axios" },
        { name: "BKM", search: q => `https://www.bkmkitap.com/index.php?p=search&search=${q}`, links: ["a[href*='/kitap']", ".productItem a", "a[href*='emp']"], prices: [".discount-price", ".selling-price", ".price", ".urunFiyat", "[itemprop='price']"], method: "puppeteer" },
        { name: "Kitapyurdu", search: q => `https://www.kitapyurdu.com/index.php?route=product/search?filter_name=${q}`, links: ["a[href*='/kitap']", ".product-item a", "a[href*='empati']"], prices: [".price-new", ".price .price-new"], method: "axios" },
        { name: "Kidega", search: q => `https://www.kidega.com/arama?q=${q}`, links: ["a.product-item-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    US: [
        { name: "Amazon US", search: q => `https://www.amazon.com/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "Barnes&Noble", search: q => `https://www.barnesandnoble.com/s/${q}`, links: ["a.prouct-info-title-link"], prices: [".price-current", ".price"], method: "axios" },
        { name: "Books-A-Million", search: q => `https://www.booksamillion.com/search?query=${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Walmart Books", search: q => `https://www.walmart.com/search?q=${q}`, links: ["a.product-title-link"], prices: [".price", "[itemprop='price']"], method: "axios" }
    ],
    UK: [
        { name: "Amazon UK", search: q => `https://www.amazon.co.uk/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "Waterstones", search: q => `https://www.waterstones.com/books/search/term/${q}`, links: ["a.book-title-link"], prices: [".price", ".book-price"], method: "axios" },
        { name: "Blackwell's", search: q => `https://blackwells.co.uk/bookshop/search/${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "WHSmith", search: q => `https://www.whsmith.co.uk/search/go?w=${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    DE: [
        { name: "Amazon DE", search: q => `https://www.amazon.de/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "Thalia", search: q => `https://www.thalia.de/suche?sq=${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Hugendubel", search: q => `https://www.hugendubel.de/de/suche/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Weltbild", search: q => `https://www.weltbild.de/suche/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    FR: [
        { name: "Amazon FR", search: q => `https://www.amazon.fr/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "FNAC", search: q => `https://www.fnac.com/SearchResult/ResultList.aspx?SCat=0&Search=${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Decitre", search: q => `https://www.decitre.fr/recherche/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Cultura", search: q => `https://www.cultura.com/recherche/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    ES: [
        { name: "Amazon ES", search: q => `https://www.amazon.es/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "CasaDelLibro", search: q => `https://www.casadellibro.com/busqueda/libros/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "El Corte Inglés", search: q => `https://www.elcorteingles.es/libros/buscar/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "FNAC ES", search: q => `https://www.fnac.es/SearchResult/ResultList.aspx?SCat=0&Search=${q}`, links: ["a.product-title-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    IT: [
        { name: "Amazon IT", search: q => `https://www.amazon.it/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "IBS", search: q => `https://www.ibs.it/cerca/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Feltrinelli", search: q => `https://www.lafeltrinelli.it/cerca?q=${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" },
        { name: "Mondadori", search: q => `https://www.mondadoristore.it/cerca/${q}`, links: ["a.product-link"], prices: [".price", ".product-price"], method: "axios" }
    ],
    IN: [
        { name: "Amazon IN", search: q => `https://www.amazon.in/s?k=${q}`, links: ["h2 a.a-link-normal"], prices: [".a-price-whole", ".a-price .a-offscreen"], method: "axios" },
        { name: "Flipkart Books", search: q => `https://www.flipkart.com/search?q=${q}`, links: ["a._2UzuFa"], prices: ["._30jeq3", "[class*='price']"], method: "axios" }
    ],
    GLOBAL: [
        { name: "AbeBooks", search: q => `https://www.abebooks.com/servlet/SearchResults?kn=${q}`, links: ["a.item-link"], prices: [".item-price", ".price"], method: "axios" },
        { name: "Google Books", search: q => null, links: [], prices: [], method: "api" }
    ]
};

// Mağaza scraping helper - method'a göre doğru scraper'ı çağır
async function scrapeStore(storeConfig, query) {
    try {
        // Kidega için özel 404 catch
        if (storeConfig.name === "Kidega") {
    try {
        if (storeConfig.method === "axios") {
            const searchUrl = storeConfig.search(query);
            if (!searchUrl) {
                const result = { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            }
            const price = await axPrice(searchUrl, storeConfig.prices, storeConfig.name, storeConfig.links?.[0] || null);
            let link = storeConfig.links?.[0] ? await axGetProductLink(searchUrl, storeConfig.links[0]) : null;
            
            // D&R için link yoksa arama linki fallback
            if (!link && storeConfig.name === "D&R") {
                link = searchUrl;
                console.log(`⚠️ ${storeConfig.name} - Ürün linki yok, arama linki kullanılıyor`);
            }
            
            // Link encoding temizle
            if (link) {
                try {
                    link = encodeURI(decodeURIComponent(link.trim().replace(/\s+/g, ' ')));
                } catch (e) {}
            }
            
            const result = { 
                store: storeConfig.name, 
                price: price || "-", 
                link: link, 
                deeplink: createDeepLink(link, storeConfig.name), 
                cartLink: createCartLink(link, storeConfig.name) 
            };
            console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
            return result;
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    return { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
                }
                throw error;
            }
        }
        
        if (storeConfig.method === "axios") {
            const searchUrl = storeConfig.search(query);
            if (!searchUrl) {
                const result = { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
                console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
                return result;
            }
            const price = await axPrice(searchUrl, storeConfig.prices, storeConfig.name, storeConfig.links?.[0] || null);
            let link = storeConfig.links?.[0] ? await axGetProductLink(searchUrl, storeConfig.links[0]) : null;
            
            // D&R için link yoksa arama linki fallback
            if (!link && storeConfig.name === "D&R") {
                link = searchUrl;
                console.log(`⚠️ ${storeConfig.name} - Ürün linki yok, arama linki kullanılıyor`);
            }
            
            // Link encoding temizle
            if (link) {
                try {
                    link = encodeURI(decodeURIComponent(link.trim().replace(/\s+/g, ' ')));
                } catch (e) {}
            }
            
            const result = { 
                store: storeConfig.name, 
                price: price || "-", 
                link: link, 
                deeplink: createDeepLink(link, storeConfig.name), 
                cartLink: createCartLink(link, storeConfig.name) 
            };
            console.log("🔗 Link fix result:", JSON.stringify(result, null, 2));
            return result;
        } else if (storeConfig.method === "puppeteer") {
            const storeObj = { name: storeConfig.name, search: storeConfig.search, links: storeConfig.links, prices: storeConfig.prices };
            return await fullScrape(query, storeObj);
        } else if (storeConfig.method === "api") {
            try {
                const response = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=1`, { timeout: 5000 });
                const item = response.data?.items?.[0];
                if (item?.saleInfo?.listPrice) {
                    return { store: storeConfig.name, price: item.saleInfo.listPrice.amount?.toString() || "-", link: item.volumeInfo.infoLink || null, deeplink: null, cartLink: item.volumeInfo.infoLink || null };
                }
            } catch (e) {}
            return { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
        }
    } catch (error) {
        console.error(`Error scraping ${storeConfig.name}:`, error.message);
        return { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
    }
    return { store: storeConfig.name, price: "-", link: null, deeplink: null, cartLink: null };
}

// Mağaza yapılandırması - Güncel ve genişletilmiş selector'lar (geriye dönük uyumluluk)
const STORES = {
    Trendyol: {
        name: "Trendyol",
        search: q => `https://www.trendyol.com/sr?q=${q}`,
        links: [
            // Güncel Trendyol selector'ları
            "div.p-card-wrppr a[href*='/urun/']",
            "div.p-card-chldrn a[href*='/urun/']",
            "a[href*='/urun/'][href*='trendyol.com']",
            "div[class*='p-card-chldrn-cntnr'] a",
            "a[href*='/p-']",
            "div.product-item a",
            "[data-id] a[href*='/urun/']",
            "a[href*='trendyol.com'][href*='urun']",
            "[class*='product-card'] a",
            "[class*='p-card'] a",
            "a[href*='/urun/']"
        ],
        prices: [
            ".prc-dscntd",
            ".pr-new-br",
            ".prc-box-dscntd",
            ".prc-box-orgnl",
            ".product-price",
            "[class*='prc-dscntd']",
            "[class*='price']",
            "[data-price]"
        ]
    },
    Hepsiburada: {
        name: "Hepsiburada",
        search: q => `https://www.hepsiburada.com/ara?q=${q}`,
        links: [
            // Güncel Hepsiburada selector'ları
            "li[data-test-id='product-item'] a[href*='-p-']",
            "a[data-test-id='product-image-link']",
            "a[href*='-p-'][href*='hepsiburada.com']",
            "div[class*='product-item'] a",
            "[class*='product-list-item'] a",
            "a.product-detail[href*='-p-']",
            "a[href*='-p-']",
            "[data-test-id*='product'] a"
        ],
        prices: [
            "[data-test-id='price-current-price']",
            ".price-value",
            ".product-price",
            "[class*='price-current']",
            "[itemprop='price']",
            "[data-bind*='price']",
            ".price"
        ]
    },
    BKM: {
        name: "BKM",
        search: q => `https://www.bkmkitap.com/index.php?p=search&search=${q}`,
        links: [
            // Güncel BKM selector'ları
            "a[href*='/urun/']",
            "a[href*='/kitap/']",
            "div.product-item a",
            "a.prd-lnk",
            "[class*='product-item'] a",
            "a[href*='bkmkitap.com'][href*='urun']",
            "a[href*='bkmkitap.com'][href*='kitap']",
            "[class*='product'] a[href*='urun']"
        ],
        prices: [
            ".new-price",
            ".sale-price",
            ".price",
            "[class*='new-price']",
            "[class*='sale-price']",
            "[class*='price']",
            "[class*='fiyat']"
        ]
    }
};

// API endpoint - Ülke bazlı global fiyat motoru
app.get("/api/price", async (req, res) => {
    const name = req.query.name;
    
    if (!name) {
        return res.json({ error: "Kitap adı gerekli" });
    }

    console.log(`\n📚 Fiyat sorgusu başlatıldı: "${name}"`);
    const startTime = Date.now();

    const q = encodeURIComponent(name);
    
    // IP'den ülke kodu belirle
    let countryCode = 'TR'; // Default
    try {
        countryCode = await detectCountryFromIP(req);
        console.log(`🌍 Country detected: ${countryCode}`);
    } catch (error) {
        console.error('Country detection failed, using default TR:', error.message);
    }
    
    // Ülkeye göre mağaza grubunu seç
    let storesToScrape = STORES_BY_COUNTRY[countryCode] || STORES_BY_COUNTRY.TR;
    
    console.log(`🔍 Query: ${name}`);
    console.log(`🏪 Using ${storesToScrape.length} stores for ${countryCode}`);
    
    // Tüm mağazaları paralel scrape et
    const storePromises = storesToScrape.map(store => scrapeStore(store, q));
    const results = await Promise.allSettled(storePromises);
    
    // Sonuçları formatla
    const prices = {};
    storesToScrape.forEach((store, index) => {
        const result = results[index];
        if (result.status === 'fulfilled') {
            prices[store.name] = result.value || { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
            if (prices[store.name].price && prices[store.name].price !== "-" && prices[store.name].price !== null) {
                console.log(`🛒 ${store.name} → Price scraped: ${prices[store.name].price} TL`);
            }
        } else {
            prices[store.name] = { store: store.name, price: "-", link: null, deeplink: null, cartLink: null };
        }
    });
    
    // Eğer ülke mağazalarından yeterli sonuç yoksa, global fallback mağazaları dene
    const validResults = Object.values(prices).filter(p => p.price && p.price !== "-" && p.price !== null).length;
    if (validResults < 2 && STORES_BY_COUNTRY.GLOBAL) {
        console.log(`📦 Only ${validResults} valid results, trying global fallback stores...`);
        const globalPromises = STORES_BY_COUNTRY.GLOBAL.map(store => scrapeStore(store, q));
        const globalResults = await Promise.allSettled(globalPromises);
        
        STORES_BY_COUNTRY.GLOBAL.forEach((store, index) => {
            const result = globalResults[index];
            if (result.status === 'fulfilled' && result.value && result.value.price && result.value.price !== "-") {
                prices[store.name] = result.value;
                console.log(`🌍 ${store.name} → Price scraped: ${result.value.price} TL`);
            }
        });
    }
    
    // İstatistikleri logla
    const activeStores = Object.values(prices).filter(p => p.price && p.price !== "-" && p.price !== null).length;
    const storeDistribution = {};
    Object.keys(prices).forEach(storeName => {
        const country = Object.keys(STORES_BY_COUNTRY).find(c => 
            STORES_BY_COUNTRY[c].some(s => s.name === storeName)
        ) || 'GLOBAL';
        if (!storeDistribution[country]) storeDistribution[country] = 0;
        if (prices[storeName].price && prices[storeName].price !== "-" && prices[storeName].price !== null) storeDistribution[country]++;
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Toplam süre: ${duration} saniye`);
    console.log(`✅ Active stores: ${activeStores}`);
    console.log(`📊 Store distribution:`, JSON.stringify(storeDistribution));
    console.log(`🔥 Global fiyat motoru aktif\n`);

    res.json(prices);
});

app.listen(PORT, () => {
    console.log("🌍 Global Price Server running on port 3003");
    console.log("🔥 Global fiyat motoru aktif!");
});

// Graceful shutdown - browser'ı kapat
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
        console.log("Browser kapatıldı");
    }
    process.exit();
});

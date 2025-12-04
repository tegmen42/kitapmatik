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

// Mağaza yapılandırması
const STORES = {
    Trendyol: {
        name: "Trendyol",
        search: q => `https://www.trendyol.com/sr?q=${q}`,
        links: [
            "div.p-card-wrppr a[href*='/urun/']",
            "div.p-card-chldrn a[href*='/urun/']",
            "a[href*='/urun/'][href*='trendyol.com']",
            "a[href*='/p-']",
            "div.product-item a",
            "a[href*='/urun/']"
        ],
        prices: [
            ".prc-dscntd",
            ".pr-new-br",
            ".prc-box-dscntd",
            ".product-price",
            "[class*='prc-dscntd']",
            "[data-price]"
        ]
    },
    Hepsiburada: {
        name: "Hepsiburada",
        search: q => `https://www.hepsiburada.com/ara?q=${q}`,
        links: [
            "li[data-test-id='product-item'] a[href*='-p-']",
            "a[data-test-id='product-image-link']",
            "a[href*='-p-'][href*='hepsiburada.com']",
            "a[href*='-p-']"
        ],
        prices: [
            "[data-test-id='price-current-price']",
            ".price-value",
            ".product-price",
            "[class*='price-current']",
            "[itemprop='price']"
        ]
    },
    BKM: {
        name: "BKM",
        search: q => `https://www.bkmkitap.com/index.php?p=search&search=${q}`,
        links: [
            "a[href*='/urun/']",
            "a[href*='/kitap/']",
            "div.product-item a",
            "a[href*='bkmkitap.com'][href*='urun']"
        ],
        prices: [
            ".new-price",
            ".sale-price",
            ".price",
            "[class*='new-price']"
        ]
    }
};

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

    // Hızlı mağazalar - Axios ile
    const [amazonPrice, kitapyurduPrice, drPrice] = await Promise.all([
        axPrice(
            `https://www.amazon.com.tr/s?k=${q}`,
            [".a-price-whole", ".a-price .a-offscreen", "[data-a-color='price'] .a-offscreen"],
            "Amazon",
            "h2 a.a-link-normal"
        ),
        axPrice(
            `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${q}`,
            [".price-new", ".price .price-new", "[class*='price']"],
            "Kitapyurdu"
        ),
        axPrice(
            `https://www.dr.com.tr/search?q=${q}`,
            [".prd-prc", ".price", "[class*='price']"],
            "D&R",
            "a.prd-link"
        )
    ]);
    
    // Puppeteer mağazalar
    const [trendyolResult, hepsiburadaResult, bkmResult] = await Promise.all([
        fullScrape(q, STORES.Trendyol),
        fullScrape(q, STORES.Hepsiburada),
        fullScrape(q, STORES.BKM)
    ]);

    // Link'leri al
    const [amazonLink, drLink] = await Promise.all([
        axGetProductLink(`https://www.amazon.com.tr/s?k=${q}`, "h2 a.a-link-normal"),
        axGetProductLink(`https://www.dr.com.tr/search?q=${q}`, "a.prd-link")
    ]);
    
    // Response formatı
    const prices = {
        Amazon: {
            price: amazonPrice || "-",
            link: amazonLink || null,
            deeplink: amazonLink || null,
            cartLink: createCartLink(amazonLink, "Amazon")
        },
        Kitapyurdu: {
            price: kitapyurduPrice || "-",
            link: null,
            deeplink: null,
            cartLink: null
        },
        DR: {
            price: drPrice || "-",
            link: drLink || null,
            deeplink: drLink || null,
            cartLink: createCartLink(drLink, "DR")
        },
        Trendyol: trendyolResult || { price: "-", link: null, deeplink: null, cartLink: null },
        Hepsiburada: hepsiburadaResult || { price: "-", link: null, deeplink: null, cartLink: null },
        BKM: bkmResult || { price: "-", link: null, deeplink: null, cartLink: null }
    };

    return res.status(200).json(prices);
}


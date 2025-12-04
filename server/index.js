import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

const app = express();
const PORT = 3002;

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
            headless: true,
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
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 40000
        });
        
        await page.waitForTimeout(2500);
        
        for (let s of selectors) {
            try {
                const el = await page.$(s);
                if (el) {
                    const p = await page.evaluate(el => el.innerText.trim(), el);
                    if (p && p.length > 1) {
                        const cleaned = cleanPrice(p);
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

// Ürün linki getiren fonksiyon - arama sayfasından (Puppeteer ile JavaScript yükleme)
async function getFirstProductLink(url, linkSelectors, storeName) {
    let page = null;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1920, height: 1080 });
        
        console.log(`🔍 ${storeName} - Arama sayfası açılıyor: ${url.substring(0, 60)}...`);
        
        await page.goto(url, {
            waitUntil: "networkidle0",
            timeout: 60000
        });
        
        // JavaScript içeriğinin tam yüklenmesini bekle - daha uzun süre
        await page.waitForTimeout(5000);
        
        // Popup kapatma ve cookie izin atlama - daha fazla selector
        const popupSelectors = [
            "button[id*='onetrust']",
            "button[class*='accept']",
            "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll",
            "button[id*='cookie']",
            "button[class*='cookie']",
            "[id*='accept']",
            "[class*='accept-all']",
            "[id*='cookie-accept']",
            "[class*='cookie-accept']",
            ".cookie-accept",
            "#accept-cookies",
            "[onclick*='accept']",
            "[onclick*='cookie']"
        ];
        
        for (const selector of popupSelectors) {
            try {
                await page.click(selector, { timeout: 2000 });
                console.log(`✅ ${storeName} - Popup kapatıldı (${selector})`);
                await page.waitForTimeout(1000);
                break;
            } catch (e) {
                // Bu selector çalışmadı, diğerini dene
            }
        }
        
        // Lazy load tetikleme → ürünlerin DOM'a düşmesi için agresif scroll
        console.log(`🔄 ${storeName} - Lazy load tetikleniyor (scroll)...`);
        await page.evaluate(async () => {
            const delay = ms => new Promise(res => setTimeout(res, ms));
            
            // Daha agresif scroll - daha fazla yukarı aşağı hareket
            for (let i = 0; i < 3; i++) {
                // Aşağı scroll
                for (let y = 200; y < 5000; y += 300) {
                    window.scrollTo(0, y);
                    await delay(400);
                }
                // Yukarı scroll
                for (let y = 5000; y > 0; y -= 300) {
                    window.scrollTo(0, y);
                    await delay(300);
                }
                // Başa dön
                window.scrollTo(0, 0);
                await delay(500);
            }
        });
        
        // Ek bekleme - sayfanın tam yüklenmesi için
        await page.waitForTimeout(3000);
        
        // Ürünlerin gerçekten yüklenip yüklenmediğini kontrol logu
        const domCheck = await page.evaluate(() => document.body.innerText.slice(0, 400));
        console.log(`🧩 ${storeName} - DOM yüklendi ön izleme: ${domCheck.substring(0, 100)}...`);
        
        // Infinite scroll - daha stabil ürün yükleme (opsiyonel ama güçlü upgrade)
        await autoScroll(page);
        
        // Ek bekleme - ürünlerin tam yüklenmesi için
        await page.waitForTimeout(2000);
        
        // Debug: Sayfa durumu kontrolü - çok detaylı
        const pageInfo = await page.evaluate(() => {
            return {
                title: document.title,
                url: window.location.href,
                bodyText: document.body.innerText.slice(0, 500),
                linkCount: document.querySelectorAll('a[href]').length,
                divCount: document.querySelectorAll('div').length,
                hasContent: document.body.innerText.length > 100,
                allLinks: Array.from(document.querySelectorAll('a[href]')).slice(0, 20).map(a => ({
                    href: a.href || a.getAttribute('href'),
                    text: a.textContent.trim().substring(0, 50),
                    className: a.className
                }))
            };
        });
        
        console.log(`\n📄 ${storeName} - SAYFA BİLGİLERİ:`);
        console.log(`   URL: ${pageInfo.url}`);
        console.log(`   Başlık: ${pageInfo.title}`);
        console.log(`   Link Sayısı: ${pageInfo.linkCount}`);
        console.log(`   Div Sayısı: ${pageInfo.divCount}`);
        console.log(`   İçerik Var mı: ${pageInfo.hasContent ? '✅' : '❌'}`);
        console.log(`   İlk 10 Link Örneği:`);
        pageInfo.allLinks.slice(0, 10).forEach((link, idx) => {
            if (link.href) {
                console.log(`      ${idx + 1}. ${link.href.substring(0, 80)}`);
            }
        });
        
        // Debug: Sayfa screenshot'ı al
        try {
            await page.screenshot({ path: `debug_${storeName.toLowerCase().replace(/\s+/g, '_')}.png`, fullPage: true });
            console.log(`📸 ${storeName} - Screenshot kaydedildi: debug_${storeName.toLowerCase().replace(/\s+/g, '_')}.png`);
        } catch (e) {
            console.log(`⚠️  Screenshot hatası: ${e.message}`);
        }
        
        // Eğer sayfada hiç link yoksa veya içerik yoksa uyar
        if (pageInfo.linkCount === 0) {
            console.log(`⚠️  ${storeName} - SAYFADA HİÇ LİNK YOK! Muhtemelen bot algılandı veya sayfa yüklenmedi.`);
            console.log(`   Sayfa içeriği: ${pageInfo.bodyText.substring(0, 200)}...`);
        }
        
        // Selector'larla link ara - daha agresif strateji
        for (let sel of linkSelectors) {
            try {
                // Önce ilk elementi bul
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
                    console.log(`✅ ${storeName} - Ürün linki bulundu (${sel}): ${fullLink.substring(0, 70)}...`);
                    await page.close();
                    return fullLink;
                }
            } catch (e) {
                // Selector bulunamadı, devam et
            }
        }
        
        // Eğer selector'lar çalışmadıysa, daha geniş arama yap
        console.log(`⚠️  ${storeName} - Selector'lar çalışmadı, geniş arama yapılıyor...`);
        
        // Trendyol için özel geniş arama
        if (url.includes("trendyol.com")) {
            const trendyolLink = await page.evaluate(() => {
                // Tüm linkleri al
                const links = Array.from(document.querySelectorAll('a[href]'));
                for (const link of links) {
                    const href = link.href || link.getAttribute('href');
                    if (href && (
                        href.includes('/urun/') ||
                        href.includes('/p-') ||
                        (href.includes('trendyol.com') && (href.match(/\/(urun|p-)/)))
                    )) {
                        return href;
                    }
                }
                return null;
            });
            
            if (trendyolLink) {
                console.log(`✅ ${storeName} - Trendyol geniş arama ile link bulundu: ${trendyolLink.substring(0, 70)}...`);
                await page.close();
                return trendyolLink;
            }
        }
        
        // Hepsiburada için özel geniş arama
        if (url.includes("hepsiburada.com")) {
            const hepsiburadaLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                for (const link of links) {
                    const href = link.href || link.getAttribute('href');
                    if (href && (
                        href.includes('-p-') ||
                        href.includes('/urun/') ||
                        (href.includes('hepsiburada.com') && href.includes('/p'))
                    )) {
                        return href;
                    }
                }
                return null;
            });
            
            if (hepsiburadaLink) {
                console.log(`✅ ${storeName} - Hepsiburada geniş arama ile link bulundu: ${hepsiburadaLink.substring(0, 70)}...`);
                await page.close();
                return hepsiburadaLink;
            }
        }
        
        // BKM için özel geniş arama
        if (url.includes("bkmkitap.com")) {
            const bkmLink = await page.evaluate(() => {
                const links = Array.from(document.querySelectorAll('a[href]'));
                for (const link of links) {
                    const href = link.href || link.getAttribute('href');
                    if (href && (
                        href.includes('urun') ||
                        href.includes('product') ||
                        href.includes('kitap') ||
                        (href.includes('bkmkitap.com') && (href.includes('/urun/') || href.includes('/kitap/')))
                    )) {
                        return href;
                    }
                }
                return null;
            });
            
            if (bkmLink) {
                console.log(`✅ ${storeName} - BKM geniş arama ile link bulundu: ${bkmLink.substring(0, 70)}...`);
                await page.close();
                return bkmLink;
            }
        }
        
        // Link bulunamazsa sayfadaki tüm linkleri daha agresif tara - Geliştirilmiş versiyon
        const allLinks = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('a[href], div[onclick], [data-href], [href], link'));
            const result = [];
            
            // İlk 100 linki al (daha fazla kapsama için)
            links.slice(0, 100).forEach(link => {
                let href = link.href || link.getAttribute('href') || link.getAttribute('data-href');
                
                // Data attribute'lerden link çek
                if (!href) {
                    href = link.getAttribute('data-url') || 
                           link.getAttribute('data-link') ||
                           link.getAttribute('data-href');
                }
                
                // Onclick handler'dan link çek
                if (!href && link.onclick) {
                    const onclick = link.getAttribute('onclick') || '';
                    const match = onclick.match(/(?:href|url|link)["']?[:=]\s*["']?([^"'\s]+)/i);
                    if (match) href = match[1];
                }
                
                if (href && href.length > 5) {
                    result.push({
                        href: href,
                        text: link.textContent ? link.textContent.trim().substring(0, 50) : '',
                        className: link.className || '',
                        id: link.id || '',
                        parentClass: link.parentElement ? (link.parentElement.className || '') : ''
                    });
                }
            });
            
            return result;
        });
        
        console.log(`🔍 ${storeName} - ${allLinks.length} link bulundu, taranıyor...`);
        
        // Gelişmiş link arama - mağaza bazlı özel kontroller
        console.log(`🔍 ${storeName} - ${allLinks.length} link bulundu, analiz ediliyor...`);
        
        // Trendyol için gelişmiş kontrol
        if (url.includes("trendyol.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                const text = (linkItem.text || '').toLowerCase();
                const className = (linkItem.className || '').toLowerCase();
                
                // Trendyol ürün linki pattern'leri
                if (href && (
                    href.includes("/urun/") || 
                    href.includes("/p-") ||
                    href.includes("/brand/") && href.includes("/urun/") ||
                    (href.includes("trendyol.com") && (href.match(/\/p-|\/urun\//)))
                )) {
                    // Ürün linki olmayan linkleri filtrele
                    if (href.includes("/kampanya/") || href.includes("/kategori/") || href.includes("/marka/")) {
                        continue;
                    }
                    
                    let fullLink = href;
                    if (!href.startsWith("http")) {
                        const baseUrl = url.split("/").slice(0, 3).join("/");
                        fullLink = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
                    }
                    console.log(`✅ ${storeName} - Trendyol link bulundu: ${fullLink.substring(0, 70)}...`);
                    await page.close();
                    return fullLink;
                }
            }
        }
        
        // Hepsiburada için gelişmiş kontrol
        if (url.includes("hepsiburada.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                const text = (linkItem.text || '').toLowerCase();
                
                // Hepsiburada ürün linki pattern'leri
                if (href && (
                    href.includes("-p-") ||
                    href.includes("/urun/") ||
                    (href.includes("hepsiburada.com") && href.match(/-p-|\/p\/|\/urun\//)) ||
                    (href.includes("hepsiburada.com") && !href.includes("/ara") && !href.includes("/kampanya"))
                )) {
                    // Ürün linki olmayan linkleri filtrele
                    if (href.includes("/kampanya/") || href.includes("/kategori/") || href.includes("/marka/")) {
                        continue;
                    }
                    
                    let fullLink = href;
                    if (!href.startsWith("http")) {
                        const baseUrl = url.split("/").slice(0, 3).join("/");
                        fullLink = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
                    }
                    console.log(`✅ ${storeName} - Hepsiburada link bulundu: ${fullLink.substring(0, 70)}...`);
                    await page.close();
                    return fullLink;
                }
            }
        }
        
        // BKM için gelişmiş kontrol
        if (url.includes("bkmkitap.com")) {
            for (const linkItem of allLinks) {
                const href = linkItem.href || '';
                const text = (linkItem.text || '').toLowerCase();
                
                // BKM ürün linki pattern'leri
                if (href && (
                    href.includes("/urun/") ||
                    href.includes("/kitap/") ||
                    (href.includes("bkmkitap.com") && (href.includes("/urun/") || href.includes("/kitap/"))) ||
                    (href.includes("bkmkitap.com") && !href.includes("/arama") && !href.includes("/kategori"))
                )) {
                    let fullLink = href;
                    if (!href.startsWith("http")) {
                        const baseUrl = url.split("/").slice(0, 3).join("/");
                        fullLink = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
                    }
                    console.log(`✅ ${storeName} - BKM link bulundu: ${fullLink.substring(0, 70)}...`);
                    await page.close();
                    return fullLink;
                }
            }
        }
        
        // Genel kontrol - herhangi bir ürün linki pattern'i
        for (const linkItem of allLinks) {
            const href = linkItem.href || '';
            if (href && (
                href.match(/\/urun\/|\/product\/|\/p\//) ||
                href.includes("-p-") ||
                (href.match(/\/p-\d+/))
            )) {
                // Ürün linki olmayan linkleri filtrele
                if (href.includes("/kampanya/") || href.includes("/kategori/") || href.includes("/marka/") || 
                    href.includes("/arama") || href.includes("/search")) {
                    continue;
                }
                
                let fullLink = href;
                if (!href.startsWith("http")) {
                    const baseUrl = url.split("/").slice(0, 3).join("/");
                    fullLink = href.startsWith("/") ? baseUrl + href : baseUrl + "/" + href;
                }
                console.log(`✅ ${storeName} - Genel pattern ile link bulundu: ${fullLink.substring(0, 70)}...`);
                await page.close();
                return fullLink;
            }
        }
        
        // Debug: İlk 10 linki göster (daha detaylı)
        if (allLinks.length > 0) {
            console.log(`🔍 ${storeName} - İlk 10 link örneği:`);
            allLinks.slice(0, 10).forEach((link, idx) => {
                console.log(`   ${idx + 1}. ${link.href.substring(0, 100)} (class: ${link.className.substring(0, 30)})`);
            });
        }
        
        await page.close();
        console.log(`⚠️  ${storeName} - Ürün linki bulunamadı`);
        return null;
    } catch (error) {
        if (page) {
            try {
                await page.close();
            } catch (e) {}
        }
        console.log(`❌ ${storeName} - Ürün linki hatası: ${error.message.substring(0, 50)}`);
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
                            console.log(`✅ ${storeName} - Fiyat bulundu: ${cleaned} TL (selector: ${sel})`);
                            await page.close();
                            return cleaned;
                        }
                    }
                }
            } catch (e) {
                // Selector bulunamadı, devam et
            }
        }
        
        // Selector'larla bulunamazsa sayfadaki tüm metni tara
        const pageText = await page.evaluate(() => document.body.innerText);
        const pricePatterns = [
            /(\d{1,4}[.,]\d{2})\s*(?:TL|₺)/gi,
            /(?:₺|TL)\s*(\d{1,4}[.,]?\d{0,2})/gi
        ];
        
        for (const pattern of pricePatterns) {
            const matches = pageText.match(pattern);
            if (matches) {
                for (const match of matches.slice(0, 5)) {
                    const cleaned = cleanPrice(match);
                    if (cleaned) {
                        console.log(`✅ ${storeName} - Fiyat bulundu (pattern): ${cleaned} TL`);
                        await page.close();
                        return cleaned;
                    }
                }
            }
        }
        
        await page.close();
        console.log(`❌ ${storeName} - Ürün sayfasında fiyat bulunamadı`);
        return "-";
    } catch (error) {
        if (page) {
            try {
                await page.close();
            } catch (e) {}
        }
        console.log(`❌ ${storeName} - Ürün sayfası hatası: ${error.message.substring(0, 50)}`);
        return "-";
    }
}

// Sepete ekleme URL'i oluşturma fonksiyonu
function createCartLink(url, store) {
    if (!url) return null;
    
    if (store === "Trendyol") {
        // Trendyol sepete ekleme: Ürün sayfasına yönlendir (sepete ekleme butonu sayfada)
        // Veya direkt sepete ekleme URL'i oluştur
        const idMatch = url.match(/p-(\d+)/);
        if (idMatch) {
            // Sepete ekleme için ürün sayfasına yönlendir
            return url;
        }
        return url;
    }
    
    if (store === "Hepsiburada") {
        // Hepsiburada sepete ekleme: Ürün sayfasına yönlendir
        return url;
    }
    
    if (store === "BKM") {
        // BKM sepete ekleme: Ürün sayfasına yönlendir
        return url;
    }
    
    if (store === "Amazon") {
        // Amazon sepete ekleme: Ürün sayfasına yönlendir
        return url;
    }
    
    if (store === "Kitapyurdu") {
        // Kitapyurdu sepete ekleme: Ürün sayfasına yönlendir
        return url;
    }
    
    if (store === "DR") {
        // D&R sepete ekleme: Ürün sayfasına yönlendir
        return url;
    }
    
    return url;
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

// Mağaza fiyatı (yeni) - tam scraping süreci - link ve deeplink ile
async function fullScrape(query, store) {
    const searchUrl = store.search(query);
    
    // 1) Arama sayfası → ürün linki bul
    const product = await getFirstProductLink(searchUrl, store.links, store.name);
    if (!product) {
        return { price: "-", link: null, deeplink: null, cartLink: null };
    }
    
    // 2) Ürün sayfası → fiyat çek
    const price = await productPrice(product, store.prices, store.name);
    
    return {
        price: price || "-",
        link: product,
        deeplink: createDeepLink(product, store.name),
        cartLink: createCartLink(product, store.name)
    };
}

// Mağaza yapılandırması - Güncel ve genişletilmiş selector'lar
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

// API endpoint
app.get("/api/price", async (req, res) => {
    const name = req.query.name;
    
    if (!name) {
        return res.json({ error: "Kitap adı gerekli" });
    }

    console.log(`\n📚 Fiyat sorgusu başlatıldı: "${name}"`);
    const startTime = Date.now();

    const q = encodeURIComponent(name);

    // Çalışan 3 mağaza (Axios - hızlı) ve yeni 3 mağaza (Puppeteer - yavaş)
    // Önce hızlı olanları çek, sonra Puppeteer ile olanları
    
    // Hızlı mağazalar - Axios ile (çalışan)
    const [amazonPrice, kitapyurduPrice, drPrice] = await Promise.all([
        axPrice(
            `https://www.amazon.com.tr/s?k=${q}`,
            [".a-price-whole", ".a-price .a-offscreen", "[data-a-color='price'] .a-offscreen", ".a-price-range .a-price-whole", "span[data-a-color='price']"],
            "Amazon",
            "h2 a.a-link-normal"
        ),
        axPrice(
            `https://www.kitapyurdu.com/index.php?route=product/search&filter_name=${q}`,
            [".price-new", ".price .price-new", "[class*='price']", ".price-value", ".price"],
            "Kitapyurdu"
        ),
        axPrice(
            `https://www.dr.com.tr/search?q=${q}`,
            [".prd-prc", ".price", "[class*='price']", ".product-price", ".prd-price"],
            "D&R",
            "a.prd-link"
        )
    ]);
    
    // Puppeteer mağazalar - daha yavaş
    const [trendyolPrice, hepsiburadaPrice, bkmPrice] = await Promise.all([
        fullScrape(q, STORES.Trendyol),
        fullScrape(q, STORES.Hepsiburada),
        fullScrape(q, STORES.BKM)
    ]);

    // Çalışan 3 mağaza için link ve deeplink hazırla (Axios ile hızlı)
    const [amazonLink, drLink] = await Promise.all([
        axGetProductLink(`https://www.amazon.com.tr/s?k=${q}`, "h2 a.a-link-normal"),
        axGetProductLink(`https://www.dr.com.tr/search?q=${q}`, "a.prd-link")
    ]);
    
    // Response formatı: { price, link, deeplink, cartLink }
    const prices = {
        Amazon: {
            price: amazonPrice || "-",
            link: amazonLink || null,
            deeplink: amazonLink || null, // Amazon deeplink yok
            cartLink: createCartLink(amazonLink, "Amazon")
        },
        Kitapyurdu: {
            price: kitapyurduPrice || "-",
            link: null, // Kitapyurdu için link eklenebilir
            deeplink: null,
            cartLink: null
        },
        DR: {
            price: drPrice || "-",
            link: drLink || null,
            deeplink: drLink || null, // D&R deeplink yok
            cartLink: createCartLink(drLink, "DR")
        },
        Trendyol: trendyolPrice || { price: "-", link: null, deeplink: null, cartLink: null },
        Hepsiburada: hepsiburadaPrice || { price: "-", link: null, deeplink: null, cartLink: null },
        BKM: bkmPrice || { price: "-", link: null, deeplink: null, cartLink: null }
    };

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Toplam süre: ${duration} saniye`);
    console.log(`📊 Sonuçlar: Trendyol=${trendyolPrice}, Hepsiburada=${hepsiburadaPrice}, BKM=${bkmPrice}\n`);

    res.json(prices);
});

app.listen(PORT, () => console.log(`🚀 Hybrid Scraper Çalışıyor → http://localhost:${PORT}`));

// Graceful shutdown - browser'ı kapat
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
        console.log("Browser kapatıldı");
    }
    process.exit();
});

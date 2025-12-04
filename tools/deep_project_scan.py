import os
import json
import re

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

print(f"\n🔍 PROJE TARAMASI BAŞLIYOR...\nRoot: {PROJECT_ROOT}\n")

# -------------------------------------------------------------------
# 1) ads.js referans tarayıcısı
# -------------------------------------------------------------------

ADS_KEYWORDS = [
    "ads.js",
    'src="ads.js"',
    'src="./ads.js"',
    'src="%PUBLIC_URL%/ads.js"',
    "file:///android_asset/ads.js",
    "webView.loadUrl(\"ads.js\")",
    "admob",
]

ads_matches = []

for root, dirs, files in os.walk(PROJECT_ROOT):
    for file in files:
        if file.endswith((".js", ".jsx", ".html", ".xml", ".java", ".gradle", ".ts")):
            path = os.path.join(root, file)
            try:
                content = open(path, "r", encoding="utf-8", errors="ignore").read()
                for keyword in ADS_KEYWORDS:
                    if keyword in content:
                        ads_matches.append((path, keyword))
            except:
                pass

print("==== 1) ADS.JS TARAMA SONUCU ====\n")

if ads_matches:
    print("❌ Aşağıdaki dosyalarda ads.js referansı bulundu:\n")
    for m in ads_matches:
        print(f" - {m[0]}  (keyword: {m[1]})")
else:
    print("✔ ads.js referansı bulunamadı.\nBu iyi haber.")

# -------------------------------------------------------------------
# 2) Google Books / API çağrısı tarayıcısı
# -------------------------------------------------------------------

API_KEYWORDS = [
    "googleapis.com/books",
    "fetchSurpriseBook",
    "fetch(",
    "axios.get(",
    "OpenLibrary",
    "subject:",
]

api_matches = []

for root, dirs, files in os.walk(PROJECT_ROOT):
    for file in files:
        if file.endswith((".js", ".jsx", ".ts")):
            path = os.path.join(root, file)
            try:
                content = open(path, "r", encoding="utf-8", errors="ignore").read()
                for keyword in API_KEYWORDS:
                    if keyword in content:
                        api_matches.append((path, keyword))
            except:
                pass

print("\n==== 2) API TARAMA SONUCU ====\n")

if api_matches:
    print("❌ Hâlâ API çağrısı yapan dosyalar bulundu:\n")
    for m in api_matches:
        print(f" - {m[0]}  (keyword: {m[1]})")
else:
    print("✔ Hiçbir API çağrısı bulunamadı. Sadece yerel JSON kullanılmalı.")

# -------------------------------------------------------------------
# 3) surpriseBooks.json içinde test kitabı taraması
# -------------------------------------------------------------------

JSON_PATH = os.path.join(PROJECT_ROOT, "src", "data", "surpriseBooks.json")

print("\n==== 3) JSON TEST KİTABI TARAMASI ====\n")

TEST_TERMS = [
    "tyt","ayt","kpss","dgs","ales","yks","lgs",
    "deneme","paragraf","soru","çıkmış","test","practice",
    "exam","workbook","study guide","prep",
]

if not os.path.exists(JSON_PATH):
    print("❌ surpriseBooks.json bulunamadı!")
else:
    content = open(JSON_PATH, "r", encoding="utf-8").read()
    try:
        books = json.loads(content)
        bad_books = []

        for book in books:
            text = (book.get("title","") + " " + book.get("reason","")).lower()
            if any(term in text for term in TEST_TERMS):
                bad_books.append(book)

        if bad_books:
            print("❌ JSON içinde TEST KİTABI bulundu!\n")
            for b in bad_books[:10]:
                print(f" - ID {b.get('id')} | {b.get('title')}")
            print(f"\nToplam: {len(bad_books)} test kitabı bulundu.")
        else:
            print("✔ JSON tamamen temiz. Test kitabı yok.")

    except Exception as e:
        print(f"❌ JSON okunamadı: {e}")

# -------------------------------------------------------------------
# 4) Yanlış JSON dosyası import eden dosya taraması
# -------------------------------------------------------------------

print("\n==== 4) JSON IMPORT TARAMASI ====\n")

IMPORT_KEYWORDS = ["import books", "import", "surpriseBooks.json"]

json_import_matches = []

for root, dirs, files in os.walk(PROJECT_ROOT):
    for file in files:
        if file.endswith((".js", ".jsx")):
            path = os.path.join(root, file)
            content = open(path, "r", encoding="utf-8", errors="ignore").read()
            if "surpriseBooks.json" in content:
                json_import_matches.append(path)

if json_import_matches:
    print("✔ JSON dosyasını import eden dosyalar:\n")
    for p in json_import_matches:
        print(f" - {p}")
else:
    print("❌ JSON hiçbir yerde import edilmiyor! Bu büyük sorundur.")

print("\n\n🎉 TARAYICI RAPORU BİTTİ 🎉\nİşlem tamamlandı.\n")


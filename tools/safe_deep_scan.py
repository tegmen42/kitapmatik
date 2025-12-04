import os
import json

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

print("\n🔍 Güvenli Derin Tarama Başladı")
print(f"Proje dizini: {PROJECT_ROOT}\n")

def scan_for_old_builds():
    print("=== 1) Build / Asset İçindeki Eski JSON ve Build Tespiti ===")
    
    suspicious_dirs = [
        "android/app/src/main/assets",
        "android/app/src/main/assets/www",
        "android/app/src/main/assets/public",
        "build",
        "dist",
        "public/build",
        "public/dist",
    ]
    
    found = False
    for d in suspicious_dirs:
        path = os.path.join(PROJECT_ROOT, d)
        if os.path.exists(path):
            found = True
            print(f"⚠ Eski build/asset klasörü bulunmuş olabilir: {path}")
    
    if not found:
        print("✔ Eski build dosyası görünmüyor.")
    
    print()

def scan_for_surprise_json_copies():
    print("=== 2) surpriseBooks.json'un KOPYA Versiyonlarını Ara ===")
    
    matches = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        for file in files:
            if file.lower().startswith("surprisebooks") and file.endswith(".json"):
                matches.append(os.path.join(root, file))
    
    if matches:
        print("⚠ Birden fazla surpriseBooks.json bulundu (yanlış olanlar olabilir):")
        for m in matches:
            print(" -", m)
    else:
        print("✔ JSON sadece tek yerde görünüyor.")
    
    print()

def scan_for_json_import_mismatches():
    print("=== 3) JSON Import Yolları ===")
    
    imports = []
    for root, dirs, files in os.walk(PROJECT_ROOT):
        for file in files:
            if file.endswith((".js", ".jsx")):
                path = os.path.join(root, file)
                try:
                    text = open(path, "r", encoding="utf-8", errors="ignore").read()
                    if "surpriseBooks.json" in text:
                        imports.append(path)
                except:
                    continue
    
    if imports:
        print("✔ surpriseBooks.json'u import eden dosyalar:")
        for i in imports:
            print(" -", i)
    else:
        print("⚠ JSON hiçbir yerde import edilmiyor!")
    
    print()

def scan_for_duplicate_jsons():
    print("=== 4) JSON İçinde Test Kitabı Tespiti ===")
    
    json_path = os.path.join(PROJECT_ROOT, "src", "data", "surpriseBooks.json")
    
    if not os.path.exists(json_path):
        print("❌ JSON dosyası bulunamadı.")
        return
    
    content = open(json_path, "r", encoding="utf-8").read()
    try:
        books = json.loads(content)
    except:
        print("❌ JSON bozuk.")
        return
    
    TEST_TERMS = [
        "tyt","ayt","kpss","dgs","ales","yks","lgs",
        "deneme","paragraf","çıkmış","soru","test",
        "practice","exam","workbook","guide"
    ]
    
    bad = []
    for b in books:
        text = (b.get("title","") + " " + b.get("reason","")).lower()
        if any(t in text for t in TEST_TERMS):
            bad.append(b)
    
    if bad:
        print(f"⚠ JSON içinde yanlış sınıfa giren {len(bad)} kitap bulundu. (silme işlemi yapılmadı)")
        for b in bad[:5]:
            print(" -", b.get("title"))
    else:
        print("✔ JSON tamamen temiz.")
    
    print()

scan_for_old_builds()
scan_for_surprise_json_copies()
scan_for_json_import_mismatches()
scan_for_duplicate_jsons()

print("\n🔍 Tarama tamamlandı. Dosyalara hiçbir zarar verilmedi.\n")


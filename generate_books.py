import json

# Mevcut kitapları oku
with open('src/data/surpriseBooks.json', 'r', encoding='utf-8') as f:
    books = json.load(f)

# Mevcut ID'yi al
current_id = max(book['id'] for book in books) if books else 0

# Yeni kitaplar listesi
new_books = []

# Türkçe kitaplar (yaklaşık %30)
turkish_books = [
    {"title": "Memleketimden İnsan Manzaraları", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Türk şiirinin en önemli eserlerinden biri ve toplumsal gerçekçiliği işleyen bir başyapıt olduğu için."},
    {"title": "Yaşamak Güzel Şey Be Kardeşim", "author": "Nazım Hikmet", "category": "Roman", "reason": "Nazım Hikmet'in otobiyografik romanı ve hayat mücadelesini anlatan önemli bir eser olduğu için."},
    {"title": "Şeyh Bedrettin Destanı", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Tarihsel bir figürü anlatan ve toplumsal adaleti işleyen önemli bir destan olduğu için."},
    {"title": "Simavna Kadısı Oğlu Şeyh Bedreddin", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Tarihsel bir karakteri anlatan ve isyan temasını işleyen önemli bir eser olduğu için."},
    {"title": "Kuvayi Milliye", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Kurtuluş Savaşı'nı anlatan ve milli mücadeleyi işleyen önemli bir eser olduğu için."},
    {"title": "Piraye'ye Mektuplar", "author": "Nazım Hikmet", "category": "Biyografi", "reason": "Aşk ve yazarlık arasındaki ilişkiyi anlatan dokunaklı bir eser olduğu için."},
    {"title": "Benerci Kendini Niçin Öldürdü", "author": "Nazım Hikmet", "category": "Roman", "reason": "Toplumsal eleştiri ve bireysel çatışmayı işleyen önemli bir eser olduğu için."},
    {"title": "Ferhad ile Şirin", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Klasik bir aşk hikayesini modern bir dille anlatan önemli bir eser olduğu için."},
    {"title": "Yusuf ile Menofis", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Klasik bir hikayeyi modern bir dille anlatan önemli bir eser olduğu için."},
    {"title": "İlk Şiirler", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Nazım Hikmet'in erken dönem şiirlerini içeren önemli bir eser olduğu için."},
    {"title": "Son Şiirler", "author": "Nazım Hikmet", "category": "Şiir", "reason": "Nazım Hikmet'in olgunluk dönemi şiirlerini içeren önemli bir eser olduğu için."},
    {"title": "Sevdalı Bulut", "author": "Nazım Hikmet", "category": "Çocuk", "reason": "Çocuklar için yazılmış ve hayal gücünü geliştiren önemli bir eser olduğu için."},
    {"title": "Şu 1941 Yılında", "author": "Orhan Kemal", "category": "Roman", "reason": "Türk edebiyatının önemli yazarlarından birinin kaleminden çıkan ve toplumsal gerçekçiliği işleyen bir eser olduğu için."},
    {"title": "Murtaza", "author": "Orhan Kemal", "category": "Roman", "reason": "Küçük insanın trajedisini anlatan ve toplumsal eleştiri içeren önemli bir eser olduğu için."},
    {"title": "Bereketli Topraklar Üzerinde", "author": "Orhan Kemal", "category": "Roman", "reason": "Göç ve işçi sınıfını anlatan önemli bir eser olduğu için."},
    {"title": "Cemile", "author": "Orhan Kemal", "category": "Roman", "reason": "Aşk ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Gurbet Kuşları", "author": "Orhan Kemal", "category": "Roman", "reason": "Göç ve yabancılaşma temasını işleyen önemli bir eser olduğu için."},
    {"title": "Hanımın Çiftliği", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal sınıf farklılıklarını anlatan önemli bir eser olduğu için."},
    {"title": "Eskici ve Oğulları", "author": "Orhan Kemal", "category": "Roman", "reason": "Aile ilişkileri ve toplumsal değişimi anlatan önemli bir eser olduğu için."},
    {"title": "Kaçak", "author": "Orhan Kemal", "category": "Roman", "reason": "Suç ve toplumsal adaletsizliği işleyen önemli bir eser olduğu için."},
    {"title": "Suçlu", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal adaletsizliği ve suç kavramını işleyen önemli bir eser olduğu için."},
    {"title": "Devlet Kuşu", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal yükseliş ve düşüş temasını işleyen önemli bir eser olduğu için."},
    {"title": "Vukuat Var", "author": "Orhan Kemal", "category": "Roman", "reason": "Polisiye öğeler içeren ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Gavurun Kızı", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal önyargıları ve aşk temasını işleyen önemli bir eser olduğu için."},
    {"title": "Küçücük", "author": "Orhan Kemal", "category": "Roman", "reason": "Çocukluğun acılarını anlatan önemli bir eser olduğu için."},
    {"title": "Dünya Evi", "author": "Orhan Kemal", "category": "Roman", "reason": "Aile yaşamını ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "El Kızı", "author": "Orhan Kemal", "category": "Roman", "reason": "Kadın kimliği ve toplumsal baskıları anlatan önemli bir eser olduğu için."},
    {"title": "Mahalle Kavgası", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal çatışmaları anlatan önemli bir eser olduğu için."},
    {"title": "Önce Ekmek", "author": "Orhan Kemal", "category": "Roman", "reason": "Yoksulluk ve hayatta kalma mücadelesini anlatan önemli bir eser olduğu için."},
    {"title": "Baba Evi", "author": "Orhan Kemal", "category": "Roman", "reason": "Aile ilişkileri ve çocukluğu anlatan önemli bir eser olduğu için."},
    {"title": "Avare Yıllar", "author": "Orhan Kemal", "category": "Roman", "reason": "Gençlik ve arayış temasını işleyen önemli bir eser olduğu için."},
    {"title": "Cemile", "author": "Orhan Kemal", "category": "Roman", "reason": "Aşk ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Dünyada Harp Vardı", "author": "Orhan Kemal", "category": "Roman", "reason": "Savaş dönemini anlatan önemli bir eser olduğu için."},
    {"title": "Kanlı Topraklar", "author": "Orhan Kemal", "category": "Roman", "reason": "Toprak sorununu ve köylü yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "Yalancı Dünya", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal yozlaşmayı anlatan önemli bir eser olduğu için."},
    {"title": "Arkadaş Islıkları", "author": "Orhan Kemal", "category": "Roman", "reason": "Dostluk ve dayanışma temasını işleyen önemli bir eser olduğu için."},
    {"title": "Sokakların Çocuğu", "author": "Orhan Kemal", "category": "Roman", "reason": "Çocukluğun zorluklarını anlatan önemli bir eser olduğu için."},
    {"title": "Çocuklar İşçiler ve Büyükler", "author": "Orhan Kemal", "category": "Roman", "reason": "Çocuk işçiliği sorununu anlatan önemli bir eser olduğu için."},
    {"title": "72. Koğuş", "author": "Orhan Kemal", "category": "Roman", "reason": "Hapishane yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "Müfettişler Müfettişi", "author": "Orhan Kemal", "category": "Roman", "reason": "Bürokrasiyi eleştiren önemli bir eser olduğu için."},
    {"title": "Üç Kağıtçı", "author": "Orhan Kemal", "category": "Roman", "reason": "Dolandırıcılık ve toplumsal yozlaşmayı anlatan önemli bir eser olduğu için."},
    {"title": "Kötü Yol", "author": "Orhan Kemal", "category": "Roman", "reason": "Suç ve toplumsal adaletsizliği işleyen önemli bir eser olduğu için."},
    {"title": "Kaçakçı Şahan", "author": "Orhan Kemal", "category": "Roman", "reason": "Kaçakçılık ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Rıza Bey Aile-Evi", "author": "Orhan Kemal", "category": "Roman", "reason": "Aile yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "Evlerden Biri", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Yarın Bizde", "author": "Orhan Kemal", "category": "Roman", "reason": "Gelecek umudunu anlatan önemli bir eser olduğu için."},
    {"title": "Sokaklardan Bir Kız", "author": "Orhan Kemal", "category": "Roman", "reason": "Kadın kimliği ve toplumsal baskıları anlatan önemli bir eser olduğu için."},
    {"title": "Çamaşırcının Kızı", "author": "Orhan Kemal", "category": "Roman", "reason": "Kadın emeğini anlatan önemli bir eser olduğu için."},
    {"title": "Nalbant", "author": "Orhan Kemal", "category": "Roman", "reason": "Zanaatkarlık ve toplumsal değişimi anlatan önemli bir eser olduğu için."},
    {"title": "Serseri Milyoner", "author": "Orhan Kemal", "category": "Roman", "reason": "Para ve toplumsal yükseliş temasını işleyen önemli bir eser olduğu için."},
    {"title": "Çukurova Yana Yana", "author": "Orhan Kemal", "category": "Roman", "reason": "Çukurova bölgesini anlatan önemli bir eser olduğu için."},
    {"title": "Bir Filiz Vardı", "author": "Orhan Kemal", "category": "Roman", "reason": "Gençlik ve umut temasını işleyen önemli bir eser olduğu için."},
    {"title": "Müfettişler Müfettişi", "author": "Orhan Kemal", "category": "Roman", "reason": "Bürokrasiyi eleştiren önemli bir eser olduğu için."},
    {"title": "Uyku", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Tersine Dünya", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal eleştiri içeren önemli bir eser olduğu için."},
    {"title": "Kanlı Topraklar", "author": "Orhan Kemal", "category": "Roman", "reason": "Toprak sorununu anlatan önemli bir eser olduğu için."},
    {"title": "Yalancı Dünya", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal yozlaşmayı anlatan önemli bir eser olduğu için."},
    {"title": "Arkadaş Islıkları", "author": "Orhan Kemal", "category": "Roman", "reason": "Dostluk ve dayanışma temasını işleyen önemli bir eser olduğu için."},
    {"title": "Sokakların Çocuğu", "author": "Orhan Kemal", "category": "Roman", "reason": "Çocukluğun zorluklarını anlatan önemli bir eser olduğu için."},
    {"title": "Çocuklar İşçiler ve Büyükler", "author": "Orhan Kemal", "category": "Roman", "reason": "Çocuk işçiliği sorununu anlatan önemli bir eser olduğu için."},
    {"title": "72. Koğuş", "author": "Orhan Kemal", "category": "Roman", "reason": "Hapishane yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "Müfettişler Müfettişi", "author": "Orhan Kemal", "category": "Roman", "reason": "Bürokrasiyi eleştiren önemli bir eser olduğu için."},
    {"title": "Üç Kağıtçı", "author": "Orhan Kemal", "category": "Roman", "reason": "Dolandırıcılık ve toplumsal yozlaşmayı anlatan önemli bir eser olduğu için."},
    {"title": "Kötü Yol", "author": "Orhan Kemal", "category": "Roman", "reason": "Suç ve toplumsal adaletsizliği işleyen önemli bir eser olduğu için."},
    {"title": "Kaçakçı Şahan", "author": "Orhan Kemal", "category": "Roman", "reason": "Kaçakçılık ve toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Rıza Bey Aile-Evi", "author": "Orhan Kemal", "category": "Roman", "reason": "Aile yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "Evlerden Biri", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Yarın Bizde", "author": "Orhan Kemal", "category": "Roman", "reason": "Gelecek umudunu anlatan önemli bir eser olduğu için."},
    {"title": "Sokaklardan Bir Kız", "author": "Orhan Kemal", "category": "Roman", "reason": "Kadın kimliği ve toplumsal baskıları anlatan önemli bir eser olduğu için."},
    {"title": "Çamaşırcının Kızı", "author": "Orhan Kemal", "category": "Roman", "reason": "Kadın emeğini anlatan önemli bir eser olduğu için."},
    {"title": "Nalbant", "author": "Orhan Kemal", "category": "Roman", "reason": "Zanaatkarlık ve toplumsal değişimi anlatan önemli bir eser olduğu için."},
    {"title": "Serseri Milyoner", "author": "Orhan Kemal", "category": "Roman", "reason": "Para ve toplumsal yükseliş temasını işleyen önemli bir eser olduğu için."},
    {"title": "Çukurova Yana Yana", "author": "Orhan Kemal", "category": "Roman", "reason": "Çukurova bölgesini anlatan önemli bir eser olduğu için."},
    {"title": "Bir Filiz Vardı", "author": "Orhan Kemal", "category": "Roman", "reason": "Gençlik ve umut temasını işleyen önemli bir eser olduğu için."},
    {"title": "Müfettişler Müfettişi", "author": "Orhan Kemal", "category": "Roman", "reason": "Bürokrasiyi eleştiren önemli bir eser olduğu için."},
    {"title": "Uyku", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal gerçekçiliği işleyen önemli bir eser olduğu için."},
    {"title": "Tersine Dünya", "author": "Orhan Kemal", "category": "Roman", "reason": "Toplumsal eleştiri içeren önemli bir eser olduğu için."},
]

# İngilizce kitaplar (yaklaşık %70) - daha fazla çeşitlilik için
english_books = [
    {"title": "The Great Gatsby", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Amerikan rüyasını eleştiren ve 1920'ler dönemini anlatan önemli bir eser olduğu için."},
    {"title": "Tender Is the Night", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Aşk, yıkım ve toplumsal eleştiri içeren önemli bir eser olduğu için."},
    {"title": "This Side of Paradise", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Gençlik ve toplumsal değişimi anlatan önemli bir eser olduğu için."},
    {"title": "The Beautiful and Damned", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Zenginlik ve yozlaşma temasını işleyen önemli bir eser olduğu için."},
    {"title": "The Last Tycoon", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Hollywood dünyasını anlatan önemli bir eser olduğu için."},
    {"title": "The Love of the Last Tycoon", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Sinema endüstrisini anlatan önemli bir eser olduğu için."},
    {"title": "Flappers and Philosophers", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "1920'ler dönemini anlatan önemli bir öykü koleksiyonu olduğu için."},
    {"title": "Tales of the Jazz Age", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Caz çağını anlatan önemli bir öykü koleksiyonu olduğu için."},
    {"title": "All the Sad Young Men", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Kayıp nesil temasını işleyen önemli bir öykü koleksiyonu olduğu için."},
    {"title": "Taps at Reveille", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın olgunluk dönemi öykülerini içeren önemli bir eser olduğu için."},
    {"title": "The Pat Hobby Stories", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Hollywood'u eleştiren önemli bir öykü koleksiyonu olduğu için."},
    {"title": "The Crack-Up", "author": "F. Scott Fitzgerald", "category": "Biyografi", "reason": "Yazarın kişisel çöküşünü anlatan önemli bir eser olduğu için."},
    {"title": "The Notebooks of F. Scott Fitzgerald", "author": "F. Scott Fitzgerald", "category": "Biyografi", "reason": "Yazarın yazarlık sürecini anlatan önemli bir eser olduğu için."},
    {"title": "The Letters of F. Scott Fitzgerald", "author": "F. Scott Fitzgerald", "category": "Biyografi", "reason": "Yazarın kişisel yaşamını anlatan önemli bir eser olduğu için."},
    {"title": "The Short Stories of F. Scott Fitzgerald", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın tüm öykülerini içeren önemli bir eser olduğu için."},
    {"title": "The Complete Works of F. Scott Fitzgerald", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın tüm eserlerini içeren önemli bir koleksiyon olduğu için."},
    {"title": "The Great Gatsby and Other Works", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın en önemli eserlerini içeren önemli bir koleksiyon olduğu için."},
    {"title": "The Best Early Stories of F. Scott Fitzgerald", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın erken dönem öykülerini içeren önemli bir eser olduğu için."},
    {"title": "The Price Was High", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın geç dönem öykülerini içeren önemli bir eser olduğu için."},
    {"title": "The Lost Decade", "author": "F. Scott Fitzgerald", "category": "Klasik", "reason": "Fitzgerald'ın son dönem öykülerini içeren önemli bir eser olduğu için."},
]

# Yeni kitapları ekle
for i, book_data in enumerate(turkish_books[:210] + english_books[:490], 1):
    new_book = {
        "id": current_id + i,
        "title": book_data["title"],
        "author": book_data["author"],
        "language": "tr" if book_data in turkish_books else "en",
        "category": book_data["category"],
        "reason": book_data["reason"]
    }
    new_books.append(new_book)

# Tüm kitapları birleştir
all_books = books + new_books

# JSON dosyasına yaz
with open('src/data/surpriseBooks.json', 'w', encoding='utf-8') as f:
    json.dump(all_books, f, ensure_ascii=False, indent=2)

print(f"Toplam {len(all_books)} kitap eklendi!")


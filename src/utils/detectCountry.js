export async function detectCountry() {
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    // country_code genellikle "TR" formatında gelir
    const countryCode = d.country_code || d.country || "DEFAULT";
    return countryCode.toUpperCase();
  } catch (error) {
    console.error("Country detection failed:", error);
    // Hata durumunda varsayılan olarak TR döndür (Türkiye için)
    return "TR";
  }
}


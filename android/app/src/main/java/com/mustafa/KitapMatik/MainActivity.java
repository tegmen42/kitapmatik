package com.mustafa.KitapMatik;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.widget.TextView;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.nativead.MediaView;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdOptions;
import com.google.android.gms.ads.nativead.NativeAdView;
import java.util.concurrent.TimeUnit;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private AdView adView;
    private InterstitialAd mInterstitialAd;
    private int searchCount = 0;
    private NativeAd nativeAd;
    private NativeAdView nativeAdViewForTracking; // Hidden view for click tracking
    private ScrollView nativeAdContainer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        // Action Bar'ı gizle (üstteki "kitap" yazılı siyah bar)
        if (getSupportActionBar() != null) {
            getSupportActionBar().hide();
        }
        
        // Fix API-level warning for setDecorFitsSystemWindows
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(true);
        }

        // AdMob SDK'yı başlat
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(InitializationStatus initializationStatus) {
                // AdMob SDK başarıyla başlatıldı
            }
        });

        // WebView'i başlat ve yapılandır
        webView = findViewById(R.id.webView);
        setupWebView();
        loadInterstitial();
        loadNativeAd();

        // Native Ad Container'ı başlat (artık kullanılmıyor, HTML'de gösteriliyor)
        nativeAdContainer = findViewById(R.id.nativeAdContainer);
        if (nativeAdContainer != null) {
            nativeAdContainer.setVisibility(View.GONE);
        }

        // AdView'i başlat ve reklam yükle
        adView = findViewById(R.id.adView);
        AdRequest adRequest = new AdRequest.Builder().build();
        adView.loadAd(adRequest);

        // WorkManager'ı başlat - 12 saatte bir bildirim gönder
        startNotificationWorker();

        // Notification permission kontrolü (Android 13+)
        checkNotificationPermission();

        // Intent'ten gelen javascript çağrısını kontrol et
        handleIntentExtras();
    }

    private void startNotificationWorker() {
        Constraints constraints = new Constraints.Builder()
                .setRequiresBatteryNotLow(false)
                .setRequiresCharging(false)
                .build();

        PeriodicWorkRequest notificationWork = new PeriodicWorkRequest.Builder(
                NotificationWorker.class,
                12,
                TimeUnit.HOURS
        )
                .setConstraints(constraints)
                .build();

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
                "trend_raft_notification",
                ExistingPeriodicWorkPolicy.KEEP,
                notificationWork
        );
    }

    private void handleIntentExtras() {
        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("javascript_call")) {
            String jsCall = intent.getStringExtra("javascript_call");
            if (jsCall != null && webView != null) {
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        webView.evaluateJavascript(jsCall, null);
                    }
                });
            }
        }
    }

    // App URL'ini web URL'ine dönüştür (uygulama yoksa fallback)
    private String convertAppUrlToWebUrl(String appUrl) {
        if (appUrl == null) return "";
        
        // hbapp://search?searchTerm=... formatını https://www.hepsiburada.com/ara?q=... formatına çevir
        if (appUrl.startsWith("hbapp://search") && appUrl.contains("searchTerm=")) {
            try {
                int startIndex = appUrl.indexOf("searchTerm=") + 11;
                String searchTerm = appUrl.substring(startIndex);
                if (searchTerm.contains("&")) {
                    searchTerm = searchTerm.substring(0, searchTerm.indexOf("&"));
                }
                // URL decode yap
                searchTerm = java.net.URLDecoder.decode(searchTerm, "UTF-8");
                return "https://www.hepsiburada.com/ara?q=" + java.net.URLEncoder.encode(searchTerm, "UTF-8");
            } catch (Exception ex) {
                return "https://www.hepsiburada.com/";
            }
        }
        // trendyol://sr?q=... formatını https://www.trendyol.com/sr?q=... formatına çevir
        else if (appUrl.startsWith("trendyol://sr") && appUrl.contains("q=")) {
            try {
                int startIndex = appUrl.indexOf("q=") + 2;
                String searchTerm = appUrl.substring(startIndex);
                if (searchTerm.contains("&")) {
                    searchTerm = searchTerm.substring(0, searchTerm.indexOf("&"));
                }
                // URL decode yap
                searchTerm = java.net.URLDecoder.decode(searchTerm, "UTF-8");
                return "https://www.trendyol.com/sr?q=" + java.net.URLEncoder.encode(searchTerm, "UTF-8");
            } catch (Exception ex) {
                return "https://www.trendyol.com/";
            }
        }
        // amazon://s?k=... formatını https://www.amazon.com.tr/s?k=... formatına çevir
        else if (appUrl.startsWith("amazon://s") && appUrl.contains("k=")) {
            try {
                int startIndex = appUrl.indexOf("k=") + 2;
                String searchTerm = appUrl.substring(startIndex);
                if (searchTerm.contains("&")) {
                    searchTerm = searchTerm.substring(0, searchTerm.indexOf("&"));
                }
                // URL decode yap
                searchTerm = java.net.URLDecoder.decode(searchTerm, "UTF-8");
                return "https://www.amazon.com.tr/s?k=" + java.net.URLEncoder.encode(searchTerm, "UTF-8");
            } catch (Exception ex) {
                return "https://www.amazon.com.tr/";
            }
        }
        
        // Varsayılan: scheme'i https://'e çevir
        return appUrl.replaceFirst("^(hbapp|trendyol|amazon)://", "https://");
    }

    private void setupWebView() {
        WebSettings webSettings = webView.getSettings();

        // JavaScript'i etkinleştir
        webSettings.setJavaScriptEnabled(true);

        // DOM Storage'ı etkinleştir
        webSettings.setDomStorageEnabled(true);

        // Diğer önemli ayarlar
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setLoadWithOverviewMode(true);
        webSettings.setUseWideViewPort(true);
        webSettings.setBuiltInZoomControls(false);
        webSettings.setDisplayZoomControls(false);
        webSettings.setSupportZoom(false);
        webSettings.setDefaultTextEncodingName("utf-8");

        // Mixed content modunu aç (HTTP ve HTTPS içeriği için)
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            webSettings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // WebViewClient ekle - mobil uygulama deep linking için
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                // Intent URI kontrolü (intent://...)
                if (url != null && url.startsWith("intent://")) {
                    try {
                        Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                        // Uygulama yüklü mü kontrol et
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            startActivity(intent);
                            return true;
                        } else {
                            // Uygulama yoksa fallback URL'i kullan
                            // Intent URI formatında S.browser_fallback_url parametresini al
                            String fallbackUrl = null;
                            if (url.contains("S.browser_fallback_url=")) {
                                int startIndex = url.indexOf("S.browser_fallback_url=") + 24;
                                fallbackUrl = url.substring(startIndex);
                                // ;end veya ; ile biten kısmı al
                                if (fallbackUrl.contains(";end")) {
                                    fallbackUrl = fallbackUrl.substring(0, fallbackUrl.indexOf(";end"));
                                } else if (fallbackUrl.contains(";")) {
                                    fallbackUrl = fallbackUrl.substring(0, fallbackUrl.indexOf(";"));
                                }
                                try {
                                    fallbackUrl = java.net.URLDecoder.decode(fallbackUrl, "UTF-8");
                                    Log.d("MainActivity", "Fallback URL decoded: " + fallbackUrl);
                                } catch (Exception e) {
                                    Log.d("MainActivity", "Fallback URL decode error: " + e.getMessage());
                                }
                            }
                            
                            if (fallbackUrl != null && !fallbackUrl.isEmpty()) {
                                // Fallback URL'i WebView'da aç
                                view.loadUrl(fallbackUrl);
                                return true;
                            } else {
                                // Fallback URL yoksa intent'ten web URL'i oluştur
                                android.net.Uri uri = intent.getData();
                                if (uri != null) {
                                    String scheme = uri.getScheme();
                                    if (scheme == null || scheme.equals("intent")) scheme = "https";
                                    String host = uri.getHost();
                                    String path = uri.getPath();
                                    String query = uri.getQuery();
                                    if (host != null) {
                                        String webUrl = scheme + "://" + host;
                                        if (path != null) webUrl += path;
                                        if (query != null) webUrl += "?" + query;
                                        Log.d("MainActivity", "Constructed web URL: " + webUrl);
                                        view.loadUrl(webUrl);
                                        return true;
                                    }
                                }
                                // Son çare: URL'den direkt fallback çıkarmayı dene
                                Log.d("MainActivity", "No fallback URL found, trying direct extraction");
                            }
                            return true;
                        }
                    } catch (Exception e) {
                        Log.d("MainActivity", "Intent parse error: " + e.getMessage() + ", URL: " + url);
                        // Hata durumunda fallback URL'i URL'den direkt çıkar
                        if (url.contains("S.browser_fallback_url=")) {
                            try {
                                int startIndex = url.indexOf("S.browser_fallback_url=") + 24;
                                String fallbackUrl = url.substring(startIndex);
                                // ;end veya ; ile biten kısmı al
                                if (fallbackUrl.contains(";end")) {
                                    fallbackUrl = fallbackUrl.substring(0, fallbackUrl.indexOf(";end"));
                                } else if (fallbackUrl.contains(";")) {
                                    fallbackUrl = fallbackUrl.substring(0, fallbackUrl.indexOf(";"));
                                }
                                fallbackUrl = java.net.URLDecoder.decode(fallbackUrl, "UTF-8");
                                Log.d("MainActivity", "Extracted fallback URL from catch: " + fallbackUrl);
                                view.loadUrl(fallbackUrl);
                                return true;
                            } catch (Exception ex) {
                                Log.d("MainActivity", "Fallback extraction error: " + ex.getMessage());
                                // Hata varsa intent'ten URL oluşturmayı dene
                            }
                        }
                        // Son çare: intent:// kısmını https:// ile değiştir
                        if (url.startsWith("intent://")) {
                            try {
                                String webUrl = url.replaceFirst("^intent://", "https://");
                                if (webUrl.contains("#Intent")) {
                                    webUrl = webUrl.substring(0, webUrl.indexOf("#Intent"));
                                }
                                Log.d("MainActivity", "Converted intent to web URL: " + webUrl);
                                view.loadUrl(webUrl);
                                return true;
                            } catch (Exception ex) {
                                Log.d("MainActivity", "URL conversion error: " + ex.getMessage());
                            }
                        }
                        view.loadUrl(url);
                        return true;
                    }
                }
                
                // Custom scheme kontrolü (hbapp://, trendyol://, amazon://)
                if (url != null && (url.startsWith("hbapp://") ||
                                    url.startsWith("amazon://"))) {
                    // Direkt Intent ile uygulamayı aç - web'e gitmeden
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(intent);
                        return true; // URL'i WebView'da yükleme, direkt uygulamayı aç
                    } catch (Exception e) {
                        // Uygulama yoksa web URL'ine dönüştür ve WebView'da aç
                        Log.d("MainActivity", "App not found, opening web: " + url);
                        String webUrl = convertAppUrlToWebUrl(url);
                        view.loadUrl(webUrl);
                        return true;
                    }
                }
                
                // Trendyol için özel işlem - trendyol:// scheme'i veya trendyol.com URL'i
                if (url != null && (url.startsWith("trendyol://") || 
                                    (url.contains("trendyol.com") && (url.startsWith("https://") || url.startsWith("http://"))))) {
                    // Trendyol için önce custom scheme'i dene
                    if (url.startsWith("trendyol://")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            // Trendyol uygulamasının yüklü olup olmadığını kontrol et
                            if (intent.resolveActivity(getPackageManager()) != null) {
                                startActivity(intent);
                                return true;
                            }
                        } catch (Exception e) {
                            Log.d("MainActivity", "Trendyol app not found, trying web URL: " + e.getMessage());
                        }
                    }
                    
                    // Trendyol custom scheme çalışmadıysa veya web URL ise
                    // Trendyol'un kendi app link sistemini kullanması için web URL'ini direkt Intent ile aç
                    try {
                        String webUrl = url.startsWith("trendyol://") ? convertAppUrlToWebUrl(url) : url;
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(webUrl));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        // Sistemin app link'i handle etmesine izin ver
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        // Hata durumunda WebView'da aç
                        String webUrl = url.startsWith("trendyol://") ? convertAppUrlToWebUrl(url) : url;
                        view.loadUrl(webUrl);
                        return true;
                    }
                }
                
                // D&R için - önce bilinen paket isimlerini dene, yoksa Intent ile aç
                if (url != null && url.contains("dr.com.tr") &&
                                    (url.startsWith("https://") || url.startsWith("http://"))) {
                    String foundPackage = null;
                    
                    // Bilinen D&R paket isimleri
                    String[] drPackages = {
                        "com.denizkorea.dr",
                        "com.dr.android",
                        "com.dr.app",
                        "tr.com.dr.android",
                        "tr.com.dr"
                    };
                    
                    // Önce bilinen paket isimlerini kontrol et
                    for (String pkg : drPackages) {
                        try {
                            getPackageManager().getPackageInfo(pkg, 0);
                            foundPackage = pkg;
                            Log.d("MainActivity", "D&R app found with package: " + pkg);
                            break;
                        } catch (PackageManager.NameNotFoundException e) {
                            // Bu paket yok, diğerini dene
                        }
                    }
                    
                    // Uygulama bulunduysa package name ile Intent ile aç
                    if (foundPackage != null) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            intent.setPackage(foundPackage);
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                            
                            if (intent.resolveActivity(getPackageManager()) != null) {
                                startActivity(intent);
                                Log.d("MainActivity", "D&R app opened with package");
                                return true;
                            }
                        } catch (Exception e) {
                            Log.d("MainActivity", "Failed to open D&R with package: " + e.getMessage());
                        }
                    }
                    
                    // Uygulama bulunamadı veya açılamadı - Intent ile açmayı dene (sistem seçici gösterir veya tarayıcıda açar)
                    try {
                        Log.d("MainActivity", "D&R app not found, opening with Intent chooser");
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Log.d("MainActivity", "Intent failed, opening in WebView: " + e.getMessage());
                        view.loadUrl(url);
                        return true;
                    }
                }
                
                // Kitapyurdu için - önce uygulama kontrolü, varsa Intent ile aç
                if (url != null && url.contains("kitapyurdu.com") &&
                                    (url.startsWith("https://") || url.startsWith("http://"))) {
                    
                    // Bilinen Kitapyurdu paket isimleri
                    String[] kyPackages = {
                        "com.mobisoft.kitapyurdu",
                        "com.kitapyurdu.android",
                        "com.kitapyurdu.app",
                        "com.kitapyurdu.kitapyurdu",
                        "tr.com.kitapyurdu"
                    };
                    
                    String packageName = null;
                    for (String pkg : kyPackages) {
                        try {
                            getPackageManager().getPackageInfo(pkg, 0);
                            packageName = pkg;
                            Log.d("MainActivity", "Kitapyurdu app found with package: " + pkg);
                            break;
                        } catch (PackageManager.NameNotFoundException e) {
                            // Bu paket yok
                        }
                    }
                    
                    if (packageName == null) {
                        // Hiçbir paket bulunamadı - Intent ile aç
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                            return true;
                        } catch (Exception e) {
                            view.loadUrl(url);
                            return true;
                        }
                    }
                    
                    try {
                        // Paket bulundu, uygulama yüklü - Intent ile açmayı dene
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setPackage(packageName);
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        
                        // Intent'in bu URL'yi handle edip edemediğini kontrol et
                        if (intent.resolveActivity(getPackageManager()) != null) {
                            // Intent açılabilir, uygulamayı aç
                            startActivity(intent);
                            return true;
                        } else {
                            // Uygulama bu URL'yi handle etmiyor - genel Intent ile aç
                            Log.d("MainActivity", packageName + " cannot handle this URL, trying general Intent");
                            Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(fallbackIntent);
                            return true;
                        }
                    } catch (Exception e) {
                        // Hata - genel Intent ile aç
                        Log.d("MainActivity", "Failed to open Kitapyurdu app: " + e.getMessage());
                        try {
                            Intent fallbackIntent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                            fallbackIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(fallbackIntent);
                            return true;
                        } catch (Exception ex) {
                            view.loadUrl(url);
                            return true;
                        }
                    }
                }
                
                // BKM Kitap için - Intent ile web URL'ini aç (app link sistemi)
                if (url != null && url.contains("bkmkitap.com") &&
                                    (url.startsWith("https://") || url.startsWith("http://"))) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        // Sistemin app link'i handle etmesine izin ver (Android otomatik uygulamayı bulacak)
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        // Hata durumunda WebView'da aç
                        Log.d("MainActivity", "Error opening URL with Intent: " + e.getMessage());
                        view.loadUrl(url);
                        return true;
                    }
                }
                
                // Amazon için - Intent ile web URL'ini aç (app link sistemi)
                if (url != null && url.contains("amazon.com.tr") &&
                                    (url.startsWith("https://") || url.startsWith("http://"))) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url));
                        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        // Sistemin app link'i handle etmesine izin ver (Android otomatik uygulamayı bulacak)
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        // Hata durumunda WebView'da aç
                        Log.d("MainActivity", "Error opening URL with Intent: " + e.getMessage());
                        view.loadUrl(url);
                        return true;
                    }
                }
                
                // Normal URL'ler için WebView'da yükle
                view.loadUrl(url);
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                // Sayfa yüklendiğinde intent'ten gelen javascript çağrısını kontrol et
                handleIntentExtras();
            }
        });

        // WebChromeClient ekle
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
            }
        });

        webView.addJavascriptInterface(new WebAppInterface(), "AndroidBridge");

        // index.html dosyasını yükle
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void loadInterstitial() {
        AdRequest adRequest = new AdRequest.Builder().build();
        InterstitialAd.load(this, "ca-app-pub-3650439797347512/3020148682", adRequest, new InterstitialAdLoadCallback() {
            @Override
            public void onAdLoaded(@NonNull InterstitialAd interstitialAd) {
                mInterstitialAd = interstitialAd;
                mInterstitialAd.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override
                    public void onAdDismissedFullScreenContent() {
                        mInterstitialAd = null;
                        loadInterstitial();
                    }

                    @Override
                    public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                        mInterstitialAd = null;
                        loadInterstitial();
                    }
                });
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                mInterstitialAd = null;
            }
        });
    }

    private void handleSearchEvent() {
        searchCount++;
        if (searchCount >= 3) {
            searchCount = 0;
            if (mInterstitialAd != null) {
                mInterstitialAd.show(this);
            } else {
                loadInterstitial();
            }
        }
    }

    private void loadNativeAd() {
        // TEST NATIVE: ca-app-pub-3940256099942544/2247696110
        String nativeAdUnitId = "ca-app-pub-3650439797347512/5427129909"; // REAL NATIVE
        AdLoader adLoader = new AdLoader.Builder(this, nativeAdUnitId)
                .forNativeAd(ad -> {
                    if (isDestroyed() || isFinishing() || isChangingConfigurations()) {
                        ad.destroy();
                        return;
                    }
                    if (nativeAd != null) {
                        nativeAd.destroy();
                    }
                    // Clean up old tracking view
                    if (nativeAdViewForTracking != null) {
                        try {
                            nativeAdViewForTracking.setNativeAd(null);
                        } catch (Exception e) {
                            // Ignore cleanup errors
                        }
                        nativeAdViewForTracking = null;
                    }
                    nativeAd = ad;
                    sendNativeAdToWebView(ad);
                })
                .withAdListener(new com.google.android.gms.ads.AdListener() {
                    @Override
                    public void onAdFailedToLoad(@NonNull LoadAdError adError) {
                        nativeAd = null;
                        if (nativeAdContainer != null) {
                            nativeAdContainer.setVisibility(View.GONE);
                        }
                    }
                })
                .withNativeAdOptions(new NativeAdOptions.Builder().build())
                .build();

        adLoader.loadAd(new AdRequest.Builder().build());
    }

    private void populateNativeAdView(NativeAd ad) {
        // This method is no longer used - ads are rendered in WebView via sendNativeAdToWebView()
        // Kept for backward compatibility, but should not be called
        if (nativeAdContainer != null) {
            nativeAdContainer.setVisibility(View.GONE);
        }
    }

    private View createCustomNativeAdView(NativeAd ad, NativeAdView adView) {
        // LinearLayout oluştur
        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setPadding(16, 16, 16, 16);
        android.widget.LinearLayout.LayoutParams layoutParams = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT);
        layout.setLayoutParams(layoutParams);
        
        // Headline
        TextView headline = new TextView(this);
        headline.setId(View.generateViewId());
        headline.setTextSize(18);
        headline.setTextColor(0xFF000000);
        headline.setTypeface(null, android.graphics.Typeface.BOLD);
        layout.addView(headline);
        adView.setHeadlineView(headline);
        
        // Body
        TextView body = new TextView(this);
        body.setId(View.generateViewId());
        body.setTextSize(14);
        body.setTextColor(0xFF666666);
        layout.addView(body);
        adView.setBodyView(body);
        
        // Media View
        MediaView mediaView = new MediaView(this);
        mediaView.setId(View.generateViewId());
        android.widget.LinearLayout.LayoutParams mediaParams = new android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                200);
        mediaView.setLayoutParams(mediaParams);
        layout.addView(mediaView);
        adView.setMediaView(mediaView);
        
        // Icon
        ImageView icon = new ImageView(this);
        icon.setId(View.generateViewId());
        android.widget.LinearLayout.LayoutParams iconParams = new android.widget.LinearLayout.LayoutParams(64, 64);
        icon.setLayoutParams(iconParams);
        layout.addView(icon);
        adView.setIconView(icon);
        
        // Call to Action
        Button cta = new Button(this);
        cta.setId(View.generateViewId());
        layout.addView(cta);
        adView.setCallToActionView(cta);
        
        return layout;
    }

    private void sendNativeAdToWebView(NativeAd ad) {
        if (webView == null || ad == null) return;

        // IMPORTANT: Record impression when showing the native ad
        // This is required for AdMob to properly track ad views
        try {
            ad.recordImpression(new Bundle());
        } catch (Exception e) {
            // Silently handle impression recording errors
        }

        // Create a hidden NativeAdView for click tracking
        // This allows us to properly report clicks to AdMob
        setupHiddenNativeAdViewForTracking(ad);

        // Extract headline
        String headline = ad.getHeadline() != null ? ad.getHeadline() : "";
        headline = escapeJavaScriptString(headline);

        // Extract body
        String body = ad.getBody() != null ? ad.getBody() : "";
        body = escapeJavaScriptString(body);

        // Extract callToAction
        String cta = ad.getCallToAction() != null ? ad.getCallToAction() : "";
        cta = escapeJavaScriptString(cta);

        // Extract imageUrl from ad.getImages().get(0).getUri()
        String imageUrl = "";
        if (ad.getImages() != null && !ad.getImages().isEmpty()) {
            if (ad.getImages().get(0).getUri() != null) {
                imageUrl = ad.getImages().get(0).getUri().toString();
            }
        }
        imageUrl = escapeJavaScriptString(imageUrl);

        // Build JavaScript call
        String js = "showNativeAd('" + headline + "', '" + body + "', '" + cta + "', '" + imageUrl + "')";

        // Execute JavaScript on UI thread
        runOnUiThread(() -> webView.evaluateJavascript(js, null));
    }

    /**
     * Creates a hidden NativeAdView for proper click tracking.
     * This view is never shown but allows us to properly report clicks to AdMob.
     */
    private void setupHiddenNativeAdViewForTracking(NativeAd ad) {
        // Clean up old tracking view if exists
        if (nativeAdViewForTracking != null) {
            try {
                nativeAdViewForTracking.setNativeAd(null);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
            nativeAdViewForTracking = null;
        }

        // Create a new hidden NativeAdView
        nativeAdViewForTracking = new NativeAdView(this);
        
        // Create a Button for CTA tracking (AdMob needs a real view)
        Button ctaButton = new Button(this);
        ctaButton.setVisibility(View.GONE);
        ctaButton.setLayoutParams(new android.widget.LinearLayout.LayoutParams(1, 1));
        ctaButton.setText(""); // Empty text - view is hidden anyway
        nativeAdViewForTracking.addView(ctaButton);
        
        // Set as call to action view - this is critical for click tracking
        nativeAdViewForTracking.setCallToActionView(ctaButton);
        
        // Also set other required views (AdMob may check these)
        TextView headlineView = new TextView(this);
        headlineView.setVisibility(View.GONE);
        headlineView.setLayoutParams(new android.widget.LinearLayout.LayoutParams(1, 1));
        nativeAdViewForTracking.addView(headlineView);
        nativeAdViewForTracking.setHeadlineView(headlineView);
        
        // Attach the native ad to the view (REQUIRED for click tracking)
        nativeAdViewForTracking.setNativeAd(ad);
        
        // Keep view completely hidden and detached from layout
        nativeAdViewForTracking.setVisibility(View.GONE);
    }

    private String escapeJavaScriptString(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("'", "\\'");
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (adView != null) {
            adView.pause();
        }
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adView != null) {
            adView.resume();
        }
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onDestroy() {
        if (adView != null) {
            adView.destroy();
        }
        if (webView != null) {
            webView.destroy();
        }
        // Clean up native ad tracking view
        if (nativeAdViewForTracking != null) {
            try {
                nativeAdViewForTracking.setNativeAd(null);
            } catch (Exception e) {
                // Ignore cleanup errors
            }
            nativeAdViewForTracking = null;
        }
        if (nativeAd != null) {
            nativeAd.destroy();
            nativeAd = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void checkNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 101);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == 101) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Log.d("MainActivity", "Notification permission granted");
            } else {
                Log.d("MainActivity", "Notification permission denied");
            }
        }
    }

    private class WebAppInterface {
        @JavascriptInterface
        public void onSearchTriggered() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    handleSearchEvent();
                }
            });
        }

        @JavascriptInterface
        public void saveTrendData(String json) {
            getSharedPreferences("TrendPrefs", MODE_PRIVATE)
                    .edit()
                    .putString("trendData_v2", json)
                    .apply();
        }

        @JavascriptInterface
        public void onNativeAdClicked() {
            runOnUiThread(() -> {
                if (nativeAd != null && nativeAdViewForTracking != null) {
                    try {
                        // Get the CTA view from the hidden NativeAdView
                        View ctaView = nativeAdViewForTracking.getCallToActionView();
                        if (ctaView != null) {
                            // Perform click on the CTA button - this properly reports to AdMob
                            // This is the correct way to track clicks for custom-rendered native ads
                            ctaView.performClick();
                        } else {
                            // Fallback: try performing click on the NativeAdView itself
                            nativeAdViewForTracking.performClick();
                        }
                    } catch (Exception e) {
                        // Fallback 1: Try clicking the NativeAdView
                        try {
                            nativeAdViewForTracking.performClick();
                        } catch (Exception e2) {
                            // Fallback 2: Use direct performClick as last resort
                            try {
                                nativeAd.performClick(new Bundle());
                            } catch (Exception e3) {
                                // Silently handle all errors
                            }
                        }
                    }
                } else if (nativeAd != null) {
                    // If tracking view doesn't exist, try direct click
                    try {
                        nativeAd.performClick(new Bundle());
                    } catch (Exception e) {
                        // Silently handle errors
                    }
                }
            });
        }
    }
}


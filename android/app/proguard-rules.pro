# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# WebView JavaScript Interface - REQUIRED for JS bridge to work
-keepclassmembers class com.mustafa.KitapMatik.MainActivity$WebAppInterface {
   public *;
}

# Keep JavaScript interface methods
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Mobile Ads SDK
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**

# WorkManager
-keep class * extends androidx.work.Worker
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context,androidx.work.WorkerParameters);
}

# Keep native ad classes
-keep class com.google.android.gms.ads.nativead.** { *; }

# Preserve line number information for debugging
-keepattributes SourceFile,LineNumberTable

# Hide original source file name
-renamesourcefileattribute SourceFile

package com.mustafa.KitapMatik;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.json.JSONArray;
import org.json.JSONObject;

public class NotificationWorker extends Worker {
    private static final String CHANNEL_ID = "trend_raft_channel";
    private static final String CHANNEL_NAME = "Trend Rafı Bildirimleri";
    private static final int NOTIFICATION_ID = 1001;
    private static final String PREFS_NAME = "TrendPrefs";
    private static final String TREND_DATA_KEY = "trendData_v2";

    public NotificationWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        try {
            // SharedPreferences'dan trend verisini al
            SharedPreferences prefs = getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String trendDataJson = prefs.getString(TREND_DATA_KEY, null);

            String notificationMessage;

            if (trendDataJson != null && !trendDataJson.isEmpty()) {
                // JSON'u parse et
                JSONObject trendData = new JSONObject(trendDataJson);
                JSONArray books = trendData.optJSONArray("books");
                String quote = trendData.optString("quote", "");

                if (books != null && books.length() > 0) {
                    // Rastgele bir kitap seç
                    int randomIndex = (int) (Math.random() * books.length());
                    JSONObject selectedBook = books.getJSONObject(randomIndex);
                    String bookTitle = selectedBook.optString("title", "Popüler Kitap");
                    String bookAuthor = selectedBook.optString("author", "");

                    // Bildirim mesajını oluştur
                    if (!bookAuthor.isEmpty()) {
                        notificationMessage = "📚 " + bookTitle + " - " + bookAuthor;
                    } else {
                        notificationMessage = "📚 " + bookTitle;
                    }
                    
                    if (!quote.isEmpty()) {
                        notificationMessage += "\n\n💬 " + quote;
                    }
                } else {
                    // Kitap listesi boş, sabit mesaj kullan
                    notificationMessage = "📚 Bugünün popüler kitaplarını keşfet!";
                }
            } else {
                // JSON null, sabit mesaj kullan
                Log.d("NotificationWorker", "Trend verisi bulunamadı, sabit mesaj kullanılıyor");
                notificationMessage = "📚 Bugünün popüler kitaplarını keşfet!";
            }

            // Bildirim gönder
            sendNotification(notificationMessage);

            return Result.success();
        } catch (Exception e) {
            Log.e("NotificationWorker", "Bildirim gönderilirken hata: " + e.getMessage(), e);
            return Result.retry();
        }
    }

    private void sendNotification(String message) {
        Context context = getApplicationContext();
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);

        // Notification channel oluştur (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Trend Rafı bildirimleri için kanal");
            notificationManager.createNotificationChannel(channel);
        }

        // MainActivity'yi açacak Intent
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        
        // JavaScript çağrısı için extra data ekle
        intent.putExtra("javascript_call", "openTrendSection()");
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        // Bildirim oluştur
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Kitaplığında yer var mı?")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setContentIntent(pendingIntent)
                .setAutoCancel(true);

        // Bildirimi göster
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }
}


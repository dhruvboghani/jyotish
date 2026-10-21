package com.grahavani.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Home-screen widget: today's Panchang (tithi, nakshatra, sunrise/sunset, Rahu Kaal) and the member's
 * daily rating. The app writes 8 days of ready-to-show text (in the user's language) through
 * GvNativePlugin.saveWidget, so the widget keeps working for a week without opening the app.
 */
public class PanchangWidget extends AppWidgetProvider {
    static final String PREFS = "gv_widget";
    static final String KEY = "data";

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PanchangWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    private static String stars(int n) {
        StringBuilder s = new StringBuilder();
        for (int i = 1; i <= 5; i++) s.append(i <= n ? '★' : '☆');
        return s.toString();
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_panchang);
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        JSONObject day = null;
        String brand = "Grahavani", place = "", your = "", openText = "Open Grahavani to load today's Panchang.";
        try {
            String raw = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            if (raw != null) {
                JSONObject d = new JSONObject(raw);
                brand = d.optString("brand", brand);
                place = d.optString("place", "");
                your = d.optString("your", "");
                openText = d.optString("open", openText);
                String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                JSONArray days = d.optJSONArray("days");
                if (days != null) for (int i = 0; i < days.length(); i++) {
                    JSONObject x = days.getJSONObject(i);
                    if (today.equals(x.optString("date"))) { day = x; break; }
                }
            }
        } catch (Exception ignored) { }

        v.setTextViewText(R.id.w_brand, place.isEmpty() ? brand : brand + " · " + place);
        if (day == null) {
            v.setTextViewText(R.id.w_title, brand);
            v.setTextViewText(R.id.w_tithi, openText);
            for (int id : new int[] { R.id.w_nak, R.id.w_sun, R.id.w_rahu, R.id.w_stars }) v.setViewVisibility(id, View.GONE);
            return v;
        }
        v.setTextViewText(R.id.w_title, day.optString("title"));
        v.setTextViewText(R.id.w_tithi, day.optString("tithi"));
        v.setTextViewText(R.id.w_nak, day.optString("nak"));
        v.setTextViewText(R.id.w_sun, day.optString("sun"));
        String rahu = day.optString("rahu", "");
        v.setTextViewText(R.id.w_rahu, rahu);
        v.setViewVisibility(R.id.w_nak, View.VISIBLE);
        v.setViewVisibility(R.id.w_sun, View.VISIBLE);
        v.setViewVisibility(R.id.w_rahu, rahu.isEmpty() ? View.GONE : View.VISIBLE);
        int n = day.optInt("stars", 0);
        if (n > 0) {
            v.setTextViewText(R.id.w_stars, stars(n) + "  " + your);
            v.setViewVisibility(R.id.w_stars, View.VISIBLE);
        } else {
            v.setViewVisibility(R.id.w_stars, View.GONE);
        }
        return v;
    }
}

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
 * Small home-screen widget (2×1): today's tithi and the planetary hora running now. Uses the same 8 days of data
 * as PanchangWidget; each day carries its 24 hora start times, so the widget picks the current one by itself.
 */
public class PanchangWidgetSmall extends AppWidgetProvider {

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PanchangWidgetSmall.class));
        for (int id : ids) mgr.updateAppWidget(id, build(ctx));
    }

    static RemoteViews build(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_small);
        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        v.setOnClickPendingIntent(R.id.ws_root, PendingIntent.getActivity(ctx, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        String tithi = "Grahavani", hora = "", nowLabel = "";
        try {
            String raw = ctx.getSharedPreferences(PanchangWidget.PREFS, Context.MODE_PRIVATE).getString(PanchangWidget.KEY, null);
            if (raw != null) {
                JSONObject d = new JSONObject(raw);
                long now = System.currentTimeMillis();
                String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
                JSONArray days = d.optJSONArray("days");
                if (days != null) for (int i = 0; i < days.length(); i++) {
                    JSONObject x = days.getJSONObject(i);
                    if (today.equals(x.optString("date"))) tithi = x.optString("tithiShort", x.optString("tithi"));
                    JSONArray hs = x.optJSONArray("horas");
                    if (hs != null) for (int k = 0; k < hs.length(); k++) {
                        JSONArray h = hs.getJSONArray(k);
                        long start = h.getLong(0), end = k + 1 < hs.length() ? hs.getJSONArray(k + 1).getLong(0) : start + 3600000L * 2;
                        if (now >= start && now < end) hora = h.getString(1);
                    }
                }
            }
        } catch (Exception ignored) { }
        v.setTextViewText(R.id.ws_tithi, tithi);
        v.setTextViewText(R.id.ws_hora, hora);
        v.setViewVisibility(R.id.ws_hora, hora.isEmpty() ? View.GONE : View.VISIBLE);
        return v;
    }
}

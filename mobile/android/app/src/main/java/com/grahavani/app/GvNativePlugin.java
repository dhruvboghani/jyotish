package com.grahavani.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import java.util.Locale;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Small native helpers used by mobile/src/app-bridge.js (window.Capacitor.Plugins.GvNative). */
@CapacitorPlugin(name = "GvNative")
public class GvNativePlugin extends Plugin {

    /** Opens Android's print dialog for the current page; "Save as PDF" is one of the printers. */
    @PluginMethod
    public void print(PluginCall call) {
        final String name = call.getString("name", "Grahavani");
        getActivity().runOnUiThread(() -> {
            try {
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                WebView wv = getBridge().getWebView();
                PrintDocumentAdapter adapter = wv.createPrintDocumentAdapter(name);
                pm.print(name, adapter, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        });
    }

    /** Stores the widget's JSON (8 days of Panchang + ratings) and redraws all widgets. */
    @PluginMethod
    public void saveWidget(PluginCall call) {
        String data = call.getString("data");
        if (data == null) { call.reject("data required"); return; }
        getContext().getSharedPreferences(PanchangWidget.PREFS, Context.MODE_PRIVATE).edit().putString(PanchangWidget.KEY, data).apply();
        PanchangWidget.updateAll(getContext());
        PanchangWidgetSmall.updateAll(getContext());
        call.resolve();
    }

    /** True when the app was built with a google-services.json (Firebase), which push needs. */
    @PluginMethod
    public void pushAvailable(PluginCall call) {
        Context c = getContext();
        int id = c.getResources().getIdentifier("google_app_id", "string", c.getPackageName());
        JSObject r = new JSObject();
        r.put("value", id != 0);
        call.resolve(r);
    }

    /** Opens a link (WhatsApp, calendar feed, website) in the matching app or the browser. */
    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url required"); return; }
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (ActivityNotFoundException e) {
            call.reject("No app can open this link");
        }
    }

    // ---------- Read aloud (Android WebView has no speechSynthesis) ----------
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private PluginCall pendingSpeak;

    /** Speaks text in the given language (e.g. "hi-IN"); resolves {ok, voice} when finished or stopped. */
    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", ""), lang = call.getString("lang", "en-IN");
        if (pendingSpeak != null) { JSObject r = new JSObject(); r.put("ok", true); pendingSpeak.resolve(r); pendingSpeak = null; }
        if (tts == null) {
            tts = new TextToSpeech(getContext(), status -> { ttsReady = status == TextToSpeech.SUCCESS; if (ttsReady) say(call, text, lang); else { JSObject r = new JSObject(); r.put("ok", false); call.resolve(r); } });
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) { }
                @Override public void onDone(String id) { finish(true); }
                @Override public void onError(String id) { finish(false); }
                @Override public void onStop(String id, boolean interrupted) { finish(true); }
            });
        } else if (ttsReady) say(call, text, lang);
        else { JSObject r = new JSObject(); r.put("ok", false); call.resolve(r); }
    }
    private void say(PluginCall call, String text, String lang) {
        Locale loc = Locale.forLanguageTag(lang);
        int avail = tts.setLanguage(loc);
        boolean hasVoice = avail >= TextToSpeech.LANG_AVAILABLE;
        if (!hasVoice) tts.setLanguage(Locale.forLanguageTag("en-IN"));
        tts.setSpeechRate(0.95f);
        pendingSpeak = call;
        call.getData().put("voice", hasVoice);
        tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), "gv");
    }
    private void finish(boolean ok) {
        PluginCall c = pendingSpeak; pendingSpeak = null;
        if (c == null) return;
        JSObject r = new JSObject(); r.put("ok", ok && c.getData().optBoolean("voice", true));
        c.resolve(r);
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        if (tts != null) tts.stop();
        finish(true);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.shutdown(); tts = null; }
    }
}

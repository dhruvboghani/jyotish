package com.grahavani.app;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.print.PrintAttributes;
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
}

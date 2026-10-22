package com.grahavani.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GvNativePlugin.class); // print to PDF, widget data, external links, Firebase check
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onPause() {
        super.onPause();
        PanchangWidgetSmall.updateAll(this);
        PanchangWidget.updateAll(this); // keep the home-screen widget current when the user leaves the app
    }
}

package com.currentflow.necalcul8r;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before BridgeActivity creates the bridge so JS can resolve the plugin.
        registerPlugin(GooglePlayBillingPlugin.class);
        Logger.info("MainActivity registered GooglePlayBillingPlugin");
        super.onCreate(savedInstanceState);
    }
}

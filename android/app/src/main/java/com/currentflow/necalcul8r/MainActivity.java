package com.currentflow.necalcul8r;

import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;

import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Logger;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Android 12+ splash API; pairs with AppTheme.NoActionBarLaunch → NoActionBar.
        SplashScreen.installSplashScreen(this);

        // Register before BridgeActivity creates the bridge so JS can resolve the plugin.
        registerPlugin(GooglePlayBillingPlugin.class);
        Logger.info("MainActivity registered GooglePlayBillingPlugin");
        super.onCreate(savedInstanceState);

        // Force a solid window background after splash so native <select> dialogs
        // never show the branded splash/logo artwork behind option rows.
        getWindow().setBackgroundDrawable(
            new ColorDrawable(ContextCompat.getColor(this, R.color.window_background))
        );
    }
}

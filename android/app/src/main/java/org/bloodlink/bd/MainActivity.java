package org.bloodlink.bd;

import android.os.Bundle;
import androidx.appcompat.app.AppCompatDelegate;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Always use the light theme, whatever the phone's dark/light setting is
        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO);
        super.onCreate(savedInstanceState);
        // No long-press buzz inside the app (e.g. while holding the game buttons)
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setHapticFeedbackEnabled(false);
        }
    }
}

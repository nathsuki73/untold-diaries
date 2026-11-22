package com.untolddiaries.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register before the bridge is created by BridgeActivity.onCreate.
        registerPlugin(MetaStorySharePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

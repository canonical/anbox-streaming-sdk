// Anbox - The Android in a Box runtime environment
// Copyright 2021 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming_sdk.enhanced_webview_example;

import android.content.Context;
import android.webkit.JavascriptInterface;

import com.canonical.anbox.streaming_sdk.AnboxWebView;

/**
 *  AppInterface is a bridge that enables to execute the native code
 *  by invoking JS method from the Android WebView component.
 * */
public class AppInterface {
    public interface ActionListener {
        void onOpenVirtualKeyboard();
        void onHideVirtualKeyboard();
    }
    private AppInterface.ActionListener mActionListener;

    AppInterface(Context context) {
        mActionListener = (ActionListener)context;
    }

    /** Show virtual keyboard after receiving the message from Anbox */
    @JavascriptInterface
    public void openVirtualKeyboard() {
        if (mActionListener != null) {
            mActionListener.onOpenVirtualKeyboard();
        }
    }

    /** Hide virtual keyboard after receiving the message from Anbox */
    @JavascriptInterface
    public void hideVirtualKeyboard() {
        if (mActionListener != null) {
            mActionListener.onHideVirtualKeyboard();
        }
    }
}

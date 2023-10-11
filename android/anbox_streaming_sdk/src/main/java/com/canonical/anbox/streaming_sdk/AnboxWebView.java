/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2022 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.canonical.anbox.streaming_sdk;

import android.content.Context;
import android.provider.Settings;
import android.text.InputType;
import android.util.AttributeSet;
import android.util.Log;
import android.view.inputmethod.EditorInfo;
import android.webkit.WebSettings;
import android.webkit.WebView;

/**
 * AnboxWebView provides a seamless Android input method connection integration can
 *   . show and hide virtual keyboard on demand via the exposed methods
 *   . monitor text input or state changes of virtual keyboard via the exposed interface
 * It depends on the internal components
 *   . IMEService - monitor the virtual keyboard state change
 *   . InputConnection - monitor text input change of virtual keyboard
 */
public class AnboxWebView extends WebView implements
        InputConnection.TextChangedListener,
        IMEService.KeyboardStateListener,
        IMEJSInterface.ActionListener  {

    private static final String TAG = AnboxWebView.class.getSimpleName();
    private boolean mRequestHideIME = false;

    /**
     * Callback interface used to deliver signals when
     *
     * . input text is changed from the virtual keyboard
     * . the state of virtual keyboard is changed
     */
    public interface VirtualKeyboardListener {
        /**
         * Called as text is committed from virtual keyboard.
         *
         * @param text the committed text displayed in the text editor after its composing state
         *        is cleared.
         * @note  text is not the whole visual characters displaying in the text editor, instead it's
         *        just the new text appended to the current existing text after finishing composing.
         */
        void onVirtualKeyboardTextCommitted(String text);

        /**
         * Called as text is being composing from virtual keyboard.
         *
         * @param text the composing text displayed in the virtual keyboard.
         * @note  There might be no composing state for some CJK language based IMEs, hence
         *        this function may not be called at all for those languages in some IMEs.
         */
        void onVirtualKeyboardTextComposing(String text);

        /**
         * Called as input text is deleted from the current text editor.
         *
         * @param counts the number of characters that are deleted before the current cursor position.
         */
        void onVirtualKeyboardTextDeleted(int counts);

        /**
         * Called as the region of composing text is changed.
         *
         * @param start the position in the text at which the composing region begins.
         * @param end the position in the text at which the composing region ends.
         */
        void onVirtualKeyboardComposingTextRegionChanged(int start, int end);

        /**
         * Called as the state of virtual keyboard is changed.
         *
         * @param visible the visibility of the virtual keyboard, true or false.
         * @param heightRatio the ratio of virtual keyboard's height to screen when virtual keyboard is visible.
         *        This can be used to notify the IME running in the Android container
         *        to adjust the display height to honor the virtual keyboard display
         *        ratio on the client side.
         */
        void onVirtualKeyboardStateChanged(boolean isShow, double heightRatio);
    }
    private VirtualKeyboardListener mVirtualKeyboardListener;

    private IMEService mImeService = new IMEService(getContext(), this);

    public AnboxWebView(Context context) {
        super(context);
        setup();
    }

    public AnboxWebView(Context context, AttributeSet attrs) {
        super(context, attrs);
        setup();
    }

    public AnboxWebView(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        setup();
    }

    /**
     * Show the virtual keyboard
     */
    public void openVirtualKeyboard() {
        mImeService.show();
    }

    /**
     * Hide virtual keyboard.
     */
    public void hideVirtualKeyboard() {
        mImeService.hide();
    }

    public void setVirtualKeyboardListener(VirtualKeyboardListener listener) {
        mVirtualKeyboardListener = listener;
    }

    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        outAttrs.inputType = InputType.TYPE_CLASS_TEXT;
        // NOTE: use IME_FLAG_NO_EXTRACT_UI here to enable IME
        // to show half screen rather than full screen in landscape mode.
        outAttrs.imeOptions = EditorInfo.IME_FLAG_NO_EXTRACT_UI;

        String activity = Settings.Secure.getString(getContext().getContentResolver(),
                Settings.Secure.DEFAULT_INPUT_METHOD);
        String[] segs = activity.split("/", -1);
        if (segs.length < 2) {
            return new InputConnection(this, true, true);
        }

        boolean adjustComposingRegion = true;
        switch (segs[0]) {
        case "com.samsung.android.honeyboard":
            adjustComposingRegion = false;
            break;
        default:
            break;
        }
        return new InputConnection(this, true, adjustComposingRegion);
    }

    @Override
    public void onTextCommitted(String text) {
        if (mVirtualKeyboardListener != null) {
            mVirtualKeyboardListener.onVirtualKeyboardTextCommitted(text);
        } else {
            // NOTE: when texts were committed, they will be sent to Android container
            // via Anbox Streaming JS SDK so that the EditText or TextInput widget from
            // an application running in the Android container can receive and display
            // them in the UI. This makes text stay in synced on both ends.
            this.loadUrl(String.format("javascript:sendIMECommittedText(\"%s\")", text));
        }
    }

    @Override
    public void onTextComposing(String text) {
        if (mVirtualKeyboardListener != null) {
            mVirtualKeyboardListener.onVirtualKeyboardTextComposing(text);
        } else {
            // To support composing text with underlining effect and makes text stay in
            // synced on both ends, we need to send composing text as well.
            // NOTE: based on the actual IME implementation, for CJK languages,
            // this callback function may not be invoked.
            this.loadUrl(String.format("javascript:sendIMEComposingText(\"%s\")", text));
        }
    }

    @Override
    public void onTextDeleted(int counts) {
        if (mVirtualKeyboardListener != null) {
            mVirtualKeyboardListener.onVirtualKeyboardTextDeleted(counts);
        } else {
            // Delete number of characters on demand
            this.loadUrl(String.format("javascript:sendIMETextDeletion(%d)", counts));
        }
    }

    @Override
    public void onComposingRegionChanged(int start, int end) {
        if (mVirtualKeyboardListener != null) {
            mVirtualKeyboardListener.onVirtualKeyboardComposingTextRegionChanged(start, end);
        } else {
            // This typically happened when text deletion acts on a composing text. To make
            // the text stay in synced on client and server ends, we need to signal this to
            // the Android container to keep cursor position in sync with on both ends.
            this.loadUrl(String.format("javascript:sendIMEComposingRegion(%d, %d)", start, end));
        }
    }

    @Override
    public void onKeyboardStateChanged(boolean visible, double ratio) {
        if (mVirtualKeyboardListener != null) {
            mVirtualKeyboardListener.onVirtualKeyboardStateChanged(visible, ratio);
        } else {
            // One caveat: there are two application scenarios that this function that got
            // triggered when virtual keyboard is hidden(visible -> false).
            //  1. when receiving the request of hiding virtual keyboard sent from Android container via Anbox Streaming JS SDK.
            //  2. when clicking the pop-down button from client side virtual keyboard to hide itself
            // For the case(2), when this callback function will be triggered, people must
            // notify the Android container to hide the virtual keyboard via Anbox Streaming
            // SDK to keep the same behavior at both sides.
            Log.i(TAG, "virtual keyboard visibility state changed: " + visible);
            if (visible == false) {
                if (!mRequestHideIME) {
                    // Notify the server to hide the Anbox IME
                    String action = "hide";
                    this.loadUrl(String.format("javascript:sendIMEAction(\"%s\")", action));
                } else {
                    mRequestHideIME = false;
                }
            } else {
                String action = "show";
                String params = "height-ratio=" + ratio;
                this.loadUrl(String.format("javascript:sendIMEAction(\"%s\", \"%s\")", action, params));
            }
        }
    }

    private void setup() {
        this.setFocusableInTouchMode(true);
        this.setFocusable(true);

        WebSettings webSettings = this.getSettings();
        webSettings.setJavaScriptEnabled(true);

        this.addJavascriptInterface(new IMEJSInterface(this), "IMEJSInterface");
    }

    @Override
    public void onOpenVirtualKeyboard() {
        // Pop up the virtual keyboard when a request was sent from Android container
        // via Anbox Streaming JS SDK.
        this.openVirtualKeyboard();
    }

    @Override
    public void onHideVirtualKeyboard() {
        // Pop down the virtual keyboard when a request was sent from Android container
        // via Anbox Streaming JS SDK.
        mRequestHideIME = true;
        this.hideVirtualKeyboard();
    }
}

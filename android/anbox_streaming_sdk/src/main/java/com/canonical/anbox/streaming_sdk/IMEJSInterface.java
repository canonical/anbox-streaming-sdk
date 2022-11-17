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

import android.webkit.JavascriptInterface;

/**
 *  IMEInterface is a bridge that provides access from JavaScript to the Android Java
 *  layer specifically for ime related messages.
 * */
public class IMEJSInterface {
    public interface ActionListener {
        void onOpenVirtualKeyboard();
        void onHideVirtualKeyboard();
    }
    private IMEJSInterface.ActionListener mActionListener;

    IMEJSInterface(ActionListener listener) {
        mActionListener = listener;
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

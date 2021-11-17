/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2021 Canonical Ltd.
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

package com.canonical.anbox.streaming_sdk.native_example;

import android.util.Log;
import android.view.Surface;

import java.util.List;

public class NativeBindings {
    private final String LOG_TAG = NativeBindings.class.getSimpleName();

    Listener mListener;

    public interface Listener {
        void onStreamDisconnected();
    }

    static {
        System.loadLibrary("anbox-stream-bindings");
    }

    private long context;

    public void setListener(Listener l) {
        mListener = l;
    }

    public void onStreamDisconnected() {
        mListener.onStreamDisconnected();
    }

    public native boolean startStreaming(String signalingURL, Object[] stunServers, Surface surface, int width, int height, boolean useInsecureTLS);
    public native boolean stopStreaming();
    public native boolean sendTouchStart(int id, int x, int y);
    public native boolean sendTouchMove(int id, int x, int y);
    public native boolean sendTouchEnd(int id);
    public native boolean sendTouchCancel(int id);
    public native boolean sendMouseMove(int x, int y, int rx, int ry);
    public native boolean sendMouseButton(int button, boolean pressed);
}

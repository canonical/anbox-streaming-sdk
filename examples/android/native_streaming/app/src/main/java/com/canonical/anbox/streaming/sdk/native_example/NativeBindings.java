// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming.sdk.native_example;

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
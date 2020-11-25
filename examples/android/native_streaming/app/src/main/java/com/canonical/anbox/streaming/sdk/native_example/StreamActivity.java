// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming.sdk.native_example;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Build;
import android.os.Bundle;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import android.os.Parcel;
import android.util.Log;
import android.view.InputDevice;
import android.view.MotionEvent;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import java.lang.annotation.Native;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class StreamActivity extends AppCompatActivity implements NativeBindings.Listener {
    private NativeBindings bindings;
    private String sessionURL;
    private List<StunServer> stunServers = new ArrayList<>();
    private boolean useInsecureTLS;

    public StreamActivity() {
        bindings = new NativeBindings();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stream);

        Intent intent = getIntent();
        this.sessionURL = intent.getStringExtra(MainActivity.EXTRA_SIGNALING_URL);
        this.stunServers = intent.getParcelableArrayListExtra(MainActivity.EXTRA_STUN_SERVERS);
        this.useInsecureTLS = intent.getBooleanExtra(MainActivity.EXTRA_USE_INSECURE_TLS, true);

        this.bindings.setListener(this);
    }

    @Override
    public void onStreamDisconnected() {
        finish();
    }

    private class StreamView extends SurfaceView
            implements SurfaceHolder.Callback, View.OnTouchListener {
        private final String LOG_TAG = StreamView.class.getSimpleName();

        private NativeBindings bindings;
        private String sessionURL;
        private List<StunServer> stunServers;
        private boolean useInsecureTLS;

        public StreamView(Context context, NativeBindings bindings, String sessionURL, List<StunServer> stunServers, boolean useInsecureTLS) {
            super(context);
            this.bindings = bindings;
            this.sessionURL = sessionURL;
            this.stunServers = stunServers;
            this.getHolder().addCallback(this);
            this.useInsecureTLS = useInsecureTLS;

            setOnTouchListener(this);
        }

        @Override
        public void surfaceCreated(SurfaceHolder holder) { }


        @Override
        public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {
            if (!this.bindings.startStreaming(sessionURL, stunServers.toArray(), holder.getSurface(), width, height, useInsecureTLS)) {
                Toast.makeText(StreamActivity.this, "Failed to start streaming", Toast.LENGTH_SHORT).show();
                finish();
            }
        }

        @Override
        public void surfaceDestroyed(SurfaceHolder holder) {
            if (!this.bindings.stopStreaming())
                Toast.makeText(StreamActivity.this, "Failed to stop streaming", Toast.LENGTH_SHORT).show();
        }

        @RequiresApi(api = Build.VERSION_CODES.M)
        @Override
        public boolean onCapturedPointerEvent(MotionEvent event) {
            super.onCapturedPointerEvent(event);

            int x = (int) event.getX();
            int y = (int) event.getY();

            if (event.getAction() == MotionEvent.ACTION_MOVE) {
                this.bindings.sendMouseMove(x, y, 0, 0);
            } else if (event.getAction() == MotionEvent.ACTION_BUTTON_PRESS) {
                this.bindings.sendMouseButton(event.getActionButton(), true);
            } else if (event.getAction() == MotionEvent.ACTION_BUTTON_RELEASE) {
                this.bindings.sendMouseButton(event.getActionButton(), false);
            }

            return true;
        }

        @Override
        public boolean onTouch(View v, MotionEvent event) {
            int idx = -1;
            int action = event.getActionMasked();
            final int pointerCount = event.getPointerCount();

            switch (action) {
                case MotionEvent.ACTION_MOVE:
                    for (idx = 0; idx < pointerCount; idx++) {
                        final int id = event.getPointerId(idx);
                        final int x = (int) event.getX(idx);
                        final int y = (int) event.getY(idx);
                        this.bindings.sendTouchMove(id, x, y);
                    }
                    break;

                case MotionEvent.ACTION_UP:
                case MotionEvent.ACTION_DOWN:
                    idx = 0;
                case MotionEvent.ACTION_POINTER_UP:
                case MotionEvent.ACTION_POINTER_DOWN: {
                    if (idx == -1)
                        idx = event.getActionIndex();

                    final int id = event.getPointerId(idx);
                    final int x = (int) event.getX(idx);
                    final int y = (int) event.getY(idx);

                    if (action == MotionEvent.ACTION_UP || action == MotionEvent.ACTION_POINTER_UP)
                        this.bindings.sendTouchEnd(id);
                    else if (action == MotionEvent.ACTION_DOWN || action == MotionEvent.ACTION_POINTER_DOWN)
                        this.bindings.sendTouchStart(id, x, y);

                    break;
                }

                case MotionEvent.ACTION_CANCEL: {
                    for (idx = 0; idx < pointerCount; idx++) {
                        final int id = event.getPointerId(idx);
                        this.bindings.sendTouchCancel(id);
                    }
                    break;
                }

                default:
                    break;
            }

            return true;
        }
    }

    @Override
    protected void onStart() {
        super.onStart();

        StreamView streamView = new StreamView(this.getApplicationContext(), bindings, sessionURL, stunServers, useInsecureTLS);
        ViewGroup vg = findViewById(android.R.id.content);
        ViewGroup.LayoutParams params = vg.getLayoutParams();
        this.addContentView(streamView, params);
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
    }
}
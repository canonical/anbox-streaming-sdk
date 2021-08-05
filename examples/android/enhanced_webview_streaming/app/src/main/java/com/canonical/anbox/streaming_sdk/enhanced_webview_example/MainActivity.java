// Anbox - The Android in a Box runtime environment
// Copyright 2021 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming_sdk.enhanced_webview_example;

import android.Manifest;
import android.annotation.TargetApi;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import com.canonical.anbox.streaming_sdk.AnboxWebView;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

public class MainActivity extends AppCompatActivity implements AnboxWebView.VirtualKeyboardListener, AppInterface.ActionListener {
    private final String TAG = "AnboxEnhancedWebViewStreaming";

    public static final int PERMISSION_REQUEST_CODE = 1;
    private AnboxWebView mWebView;
    private boolean mRequestHideIME = false;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        String[] permissions = {Manifest.permission.RECORD_AUDIO, Manifest.permission.CAMERA};
        requestRuntimePermissions(permissions);

        mWebView = (AnboxWebView) findViewById(R.id.webview);
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        mWebView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.SINGLE_COLUMN);
        webSettings.setLoadWithOverviewMode(true);

        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        mWebView.setWebContentsDebuggingEnabled(true);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        mWebView.setVirtualKeyboardListener(this);
        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                              WebResourceRequest request) {
                if (!request.isForMainFrame() && Objects.requireNonNull(request.getUrl().getPath()).endsWith(".js")) {
                    Log.d(TAG, " js file request need to set mime/type " + request.getUrl().getPath());
                    try {
                        return new WebResourceResponse("application/javascript", null,
                                new BufferedInputStream(view.getContext().getAssets().open(request.getUrl().getPath().replace("/assets/",""))));
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                }
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @RequiresApi(api = Build.VERSION_CODES.M)
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                Log.d(TAG, "error: " + request.getUrl());
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler,
                                           SslError error) {
                Log.d(TAG, "Ssl error: " + error.getPrimaryError());
                handler.proceed();
            }
        });

        /* To Handle Javascript dialog, also grant permission to access camera or microphone if needed*/
        mWebView.setWebChromeClient(
            new WebChromeClient() {
                public void onPermissionRequest(final PermissionRequest request) {
                    String[] requestedResources = request.getResources();
                    ArrayList<String> permissions = new ArrayList<>();
                    ArrayList<String> grantedPermissions = new ArrayList<String>();
                    for (int i = 0; i < requestedResources.length; i++) {
                        if (requestedResources[i].equals(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                            permissions.add(Manifest.permission.RECORD_AUDIO);
                        } else if (requestedResources[i].equals(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                            permissions.add(Manifest.permission.CAMERA);
                        }
                    }

                    for (int i = 0; i < permissions.size(); i++) {
                        if (ContextCompat.checkSelfPermission(getApplicationContext(), permissions.get(i)) != PackageManager.PERMISSION_GRANTED) {
                            continue;
                        }
                        if (permissions.get(i).equals(Manifest.permission.RECORD_AUDIO)) {
                            grantedPermissions.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                        } else if (permissions.get(i).equals(Manifest.permission.CAMERA)) {
                            grantedPermissions.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                        }
                    }

                    if (grantedPermissions.isEmpty()) {
                        request.deny();
                    } else {
                        String[] grantedPermissionsArray = new String[grantedPermissions.size()];
                        grantedPermissionsArray = grantedPermissions.toArray(grantedPermissionsArray);
                        request.grant(grantedPermissionsArray);
                    }
                }
            }
        );

        mWebView.addJavascriptInterface(new AppInterface(this), "AppInterface");

        mWebView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    @Override
    public void onBackPressed() {
        if (mWebView.canGoBack()) {
            mWebView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    public void onVirtualKeyboardTextCommitted(String text) {
        // NOTE: when texts were committed, they will be sent to Android container via Anbox
        // Streaming JS SDK so that the EditText or TextInput widget from an application
        // running in the Android container can receive and display them in the UI via Anbox.
        // This could be done via executing javascript functions in WebView.
        // Please refer to the following link for details:
        //     https://developer.android.com/reference/android/webkit/WebView#evaluateJavascript
        // Also to achieve a living text effect, the composing text needs to be sent to Android
        // container as well. This makes text synced on both ends and text won't be shown up
        // until it's fully committed.
        mWebView.loadUrl(String.format("javascript:sendIMECommittedText(\"%s\")", text));
    }

    @Override
    public void onVirtualKeyboardTextComposing(String text) {
        // To support composing text with underlining effect and keep the same behavior between
        // client and server ends, we need to send composing text as well.
        // NOTE: for CJK languages, the callback function may not invoked as well based on
        // the actual IME implementation.
        mWebView.loadUrl(String.format("javascript:sendIMEComposingText(\"%s\")", text));
    }

    @Override
    public void onVirtualKeyboardTextDeleted(int counts) {
        // Delete number of characters on demand
        mWebView.loadUrl(String.format("javascript:sendIMETextDeletion(%d)", counts));
    }

    @Override
    public void onVirtualKeyboardComposingTextRegionChanged(int start, int end) {
        // The composing text region is changed. This typically happened when text deletion
        // acts on a composing text and to make the UI behavior identical between client side
        // and AnboxIME, we need to signal this to Android container
        mWebView.loadUrl(String.format("javascript:sendIMEComposingRegion(%d, %d)", start, end));
    }

    @Override
    public void onVirtualKeyboardStateChanged(boolean visible, double displayRatio) {
        // One caveat: there are two application scenarios that this function got triggered
        // when virtual keyboard is hidden(visible -> false).
        // 1. Call AnboxWebView.hideVirtualKeyboard() when receiving the request of hidding
        //    virtual keyboard sending from Android container via Anbox Streaming JS SDK.
        // 2. Hide the virtual keyboard on the client side by clicking the pop-down button.
        // For the case(2), when this callback function will be triggered, people must
        // notify the Android container to hide the virtual keyboard via Anbox Streaming SDK
        // through the protocol.
        Log.i(TAG, "virtual keyboard visibility state changed: " + visible);
        if (visible == false) {
            if (!mRequestHideIME) {
                // Notify the server to hide the Anbox IME
                String action = "hide";
                mWebView.loadUrl(String.format("javascript:sendIMEAction(\"%s\")", action));
            }
        } else {
            String action = "show";
            String params = "height-ratio=" + displayRatio;
            mWebView.loadUrl(String.format("javascript:sendIMEAction(\"%s\", \"%s\")", action, params));
        }
    }

    @Override
    public void onOpenVirtualKeyboard() {
        // Pop up virtual keyboard when a request was sent from Android container via
        // Anbox Streaming JS SDK.
        // To receive the message sending from Javascript through our protocol, it can
        // be done via adding javascript interface. Please refer the AppInterface class
        // and the following link for details:
        // https://developer.android.com/guide/webapps/webview#BindingJavaScript
        //
        // The same mechanism can be applied to receiving a request of hiding virtual
        // keyboard sending from Android container as well.
        mWebView.openVirtualKeyboard();
    }

    @Override
    public void onHideVirtualKeyboard() {
        // Pop down virtual keyboard when a request was sent from Android container via
        // Anbox Streaming JS SDK.
        mRequestHideIME = true;
        mWebView.hideVirtualKeyboard();
    }

    public void requestRuntimePermissions(String[] permissions) {
        List<String> permissionList = new ArrayList<>();
        for (String permission : permissions) {
            if (ContextCompat.checkSelfPermission(this, permission)
                    != PackageManager.PERMISSION_GRANTED) {
                permissionList.add(permission);
            }
        }
        if (!permissionList.isEmpty()) {
            ActivityCompat.requestPermissions(this,
                    permissionList.toArray(new String[permissionList.size()]),
                    PERMISSION_REQUEST_CODE);
        }
    }
}

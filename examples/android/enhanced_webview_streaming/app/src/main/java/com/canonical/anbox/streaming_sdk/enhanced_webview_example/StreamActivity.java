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

package com.canonical.anbox.streaming_sdk.enhanced_webview_example;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
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

public class StreamActivity extends AppCompatActivity {
    private final String TAG = "AnboxEnhancedWebViewStreaming";

    public static final int PERMISSION_REQUEST_CODE = 1;
    private AnboxWebView mWebView;
    private boolean mRequestHideIME = false;

     private class WebAppInterface {
        Context mContext;
        String mGatewayURL;
        String mAppName;
        String mApiToken;

        WebAppInterface(Context c, String gatewayURL, String apiToken, String appName) {
            mContext = c;
            mGatewayURL = gatewayURL;
            mApiToken = apiToken;
            mAppName = appName;
        }

        @JavascriptInterface
        public String getGetewayURL() {
            return mGatewayURL;
        }

        @JavascriptInterface
        public String getAPIToken() {
            return mApiToken;
        }

        @JavascriptInterface
        public String getAppName() {
            return mAppName;
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_stream);

        Intent intent = getIntent();
        String gatewayURL = intent.getStringExtra(MainActivity.EXTRA_SIGNALING_URL);
        String apiToken = intent.getStringExtra(MainActivity.EXTRA_API_TOKEN);
        String appName = intent.getStringExtra(MainActivity.EXTRA_APP_NAME);

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

        mWebView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view,
                                                              WebResourceRequest request) {
                if (!request.isForMainFrame() && Objects.requireNonNull(request.getUrl().getPath()).endsWith(".js")) {
                    Log.d(TAG, " js file request need to set mime/type " + request.getUrl().getPath());
                    try {
                        return new WebResourceResponse("application/javascript", null,
                                new BufferedInputStream(view.getContext().getAssets().open(request.getUrl().getPath().replace("/assets/", ""))));
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

        mWebView.addJavascriptInterface(new WebAppInterface(this, gatewayURL, apiToken, appName), "Android");
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

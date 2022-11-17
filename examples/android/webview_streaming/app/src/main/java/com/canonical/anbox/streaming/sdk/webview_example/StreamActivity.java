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

package com.canonical.anbox.streaming.sdk.webview_example;

import android.content.Context;
import android.content.Intent;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.webkit.WebViewAssetLoader;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.util.Objects;

public class StreamActivity extends AppCompatActivity {
    private final String TAG = "AnboxWebViewStreaming";
    private WebView webView;

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

        webView = (WebView) findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setLayoutAlgorithm(WebSettings.LayoutAlgorithm.SINGLE_COLUMN);
        webSettings.setLoadWithOverviewMode(true);

        webSettings.setAllowUniversalAccessFromFileURLs(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccessFromFileURLs(true);
        webSettings.setAllowUniversalAccessFromFileURLs(true);

        webView.setWebContentsDebuggingEnabled(true);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
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

        webView.addJavascriptInterface(new WebAppInterface(this, gatewayURL, apiToken, appName), "Android");

        webView.loadUrl("https://appassets.androidplatform.net/assets/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

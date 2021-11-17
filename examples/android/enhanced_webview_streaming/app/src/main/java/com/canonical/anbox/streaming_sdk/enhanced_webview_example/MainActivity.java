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

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;


public class MainActivity extends AppCompatActivity {
    private static final String LOG_TAG = MainActivity.class.getSimpleName();

    public static final String EXTRA_SIGNALING_URL
            = "com.canonical.anbox.streaming.sdk.webview_example.EXTRA_SIGNALING_URL";
    public static final String EXTRA_API_TOKEN
            = "com.canonical.anbox.streaming.sdk.webview_example.EXTRA_API_TOKEN";
    public static final String EXTRA_APP_NAME
            = "com.canonical.anbox.streaming.sdk.webview_example.EXTRA_APP_NAME";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        Intent launchIntent = getIntent();
        String apiToken = launchIntent.getStringExtra("api_token");
        String gatewayURL = launchIntent.getStringExtra("gateway_url");
        String appName = launchIntent.getStringExtra("app_name");
        boolean useInsecureTLS = launchIntent.getBooleanExtra("use_insecure_tls", false);

        if (apiToken != null && apiToken.length() > 0) {
            final EditText apiTokenBox = findViewById(R.id.api_token);
            apiTokenBox.setText(apiToken);
        }
        if (gatewayURL != null && gatewayURL.length() > 0) {
            final EditText gatewayURLBox = findViewById(R.id.gateway_url);
            gatewayURLBox.setText(gatewayURL);
        }
        if (appName != null && appName.length() > 0) {
            final EditText appNameBox = findViewById(R.id.app_name);
            appNameBox.setText(appName);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public void startStreaming(View view) {
        final EditText apiTokenBox = findViewById(R.id.api_token);
        final EditText gatewayURLBox = findViewById(R.id.gateway_url);
        final EditText appNameBox = findViewById(R.id.app_name);

        String apiToken = apiTokenBox.getText().toString();
        String gatewayURL = gatewayURLBox.getText().toString();
        String appName = appNameBox.getText().toString();

        if (apiToken.length() == 0 || gatewayURL.length() == 0 || appName.length() == 0) {
            Toast.makeText(this, "Missing gateway URL, API token or application name", Toast.LENGTH_SHORT).show();
            return;
        }

        // In case of the given URL contains a trailing slash, we get rid of it
        // since it potentially causes IOException when talking to stream gateway.
        if (gatewayURL.charAt(gatewayURL.length() - 1) == '/') {
            gatewayURL = gatewayURL.substring(0, gatewayURL.length() - 1);
        }

        Intent intent = new Intent(MainActivity.this, StreamActivity.class);
        intent.putExtra(EXTRA_SIGNALING_URL, gatewayURL);
        intent.putExtra(EXTRA_API_TOKEN, apiToken);
        intent.putExtra(EXTRA_APP_NAME, appName);
        startActivity(intent);
    }
}

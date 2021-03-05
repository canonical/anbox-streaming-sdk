// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming.sdk.native_example;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.Switch;
import android.widget.Toast;
import android.content.res.Configuration;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

public class MainActivity extends AppCompatActivity {
    private static final String LOG_TAG = MainActivity.class.getSimpleName();

    public static final String EXTRA_SIGNALING_URL
            = "com.canonical.anbox.streaming.sdk.native_example.EXTRA_SIGNALING_URL";
    public static final String EXTRA_STUN_SERVERS
            = "com.canonical.anbox.streaming.sdk.native_example.EXTRA_STUN_SERVERS";
    public static final String EXTRA_USE_INSECURE_TLS
            = "com.canonical.anbox.streaming.sdk.native_example.EXTRA_USE_INSECURE_TLS";

    public static final MediaType MEDIA_TYPE_JSON
            = MediaType.parse("application/json; charset=utf-8");

    private OkHttpClient mClient = createHTTPClient().build();

    public static OkHttpClient.Builder createHTTPClient() {
        try {
            final TrustManager[] trustAllCerts = new TrustManager[]{
                    new X509TrustManager() {
                        @Override
                        public void checkClientTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public void checkServerTrusted(X509Certificate[] chain, String authType) {
                        }

                        @Override
                        public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                            final X509Certificate[] acceptedIssuers = {};
                            return acceptedIssuers;
                        }
                    }
            };

            final SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            final SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();

            OkHttpClient.Builder builder = new OkHttpClient.Builder();
            builder.sslSocketFactory(sslSocketFactory, (X509TrustManager)trustAllCerts[0]);
            builder.hostnameVerifier((hostname, session) -> true);

            return builder;
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

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
        if (useInsecureTLS) {
            final Switch useInsecureTLSSwitch = findViewById(R.id.use_insecure_tls);
            useInsecureTLSSwitch.setChecked(useInsecureTLS);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public void startStreaming(View view) {
        final EditText apiTokenBox = findViewById(R.id.api_token);
        final EditText gatewayURLBox = findViewById(R.id.gateway_url);
        final EditText appNameBox = findViewById(R.id.app_name);
        final Switch useInsecureTLSSwitch = findViewById(R.id.use_insecure_tls);

        if (apiTokenBox.getText().length() == 0 ||
                gatewayURLBox.getText().length() == 0 ||
                appNameBox.getText().length() == 0) {
            Toast.makeText(this, "Missing gateway URL, API token or application name", Toast.LENGTH_SHORT).show();
            return;
        }

        // In case of the given URL contains a trailing slash, we get rid of it
        // since it potentially causes IOException when talking to stream gateway.
        String getwayURL = gatewayURLBox.getText().toString();
        if (getwayURL.charAt(getwayURL.length() - 1) == '/') {
            getwayURL = getwayURL.substring(0, getwayURL.length() - 1);
        }

        // The app is locked to portrait mode so we can teach the remote Android instance
        // to use a portrait screen size too
        int width = 720, height = 1280;

        JSONObject sessionInfo = new JSONObject();
        JSONObject screenInfo = new JSONObject();
        try {
            screenInfo.put("width", width);
            screenInfo.put("height", height);
            screenInfo.put("fps", 30);
            sessionInfo.put("app", appNameBox.getText());
            sessionInfo.put("screen", screenInfo);
        } catch (JSONException e) {
            Toast.makeText(this, "Failed to create session specification", Toast.LENGTH_SHORT).show();
            return;
        }

        Request createSessionReq = new Request.Builder()
                .url(getwayURL + "/1.0/sessions")
                .post(RequestBody.create(MEDIA_TYPE_JSON, sessionInfo.toString()))
                .addHeader("Authorization", "Macaroon root=" + apiTokenBox.getText().toString())
                .build();

        mClient.newCall(createSessionReq).enqueue(new Callback() {
            @Override
            public void onFailure(Call call, IOException e) {
                Log.e(LOG_TAG, "Failed to create session: " + e.getMessage());
            }

            @Override
            public void onResponse(Call call, Response response) throws IOException {
                try (ResponseBody responseBody = response.body()) {
                    if (!response.isSuccessful()) {
                        Log.w(LOG_TAG, responseBody.string());
                        throw new IOException("Unexpected code " + response);
                    }

                    JSONObject sessionResp = new JSONObject(responseBody.string());
                    JSONObject metaDataObj = sessionResp.getJSONObject("metadata");

                    String signalingURL = metaDataObj.getString("url");

                    ArrayList<StunServer> stunServers = new ArrayList<>();
                    JSONArray stunServersArray = metaDataObj.getJSONArray("stun_servers");
                    for (int n = 0; n < stunServersArray.length(); n++) {
                        JSONObject stunServerObj = stunServersArray.getJSONObject(n);
                        StunServer server = new StunServer();

                        JSONArray urlsArray = stunServerObj.getJSONArray("urls");
                        List<String> urls = new ArrayList<String>();
                        for (int m = 0; m < urlsArray.length(); m++) {
                            urls.add(urlsArray.getString(m));
                        }
                        server.urls = urls.toArray(new String[0]);

                        if (stunServerObj.has("username"))
                            server.username = stunServerObj.getString("username");
                        if (stunServerObj.has("password"))
                            server.password = stunServerObj.getString("password");

                        stunServers.add(server);
                    }

                    Intent intent = new Intent(MainActivity.this, StreamActivity.class);
                    intent.putExtra(EXTRA_SIGNALING_URL, signalingURL);
                    intent.putParcelableArrayListExtra(EXTRA_STUN_SERVERS, stunServers);
                    intent.putExtra(EXTRA_USE_INSECURE_TLS, useInsecureTLSSwitch.isChecked());
                    startActivity(intent);
                } catch (JSONException | IOException e) {
                    throw new IOException("Received invalid response");
                }
            }
        });
    }
}

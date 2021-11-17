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

package com.canonical.anboxcloud.outofbandapp;

import androidx.appcompat.app.AppCompatActivity;

import android.widget.EditText;
import android.widget.Toast;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;

// For sending message to Anbox
import com.canonical.anbox.PlatformAPISkeleton;

public class MainActivity extends AppCompatActivity {
    EditText mEditText;
    Button mButtonSend;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        final PlatformAPISkeleton api_skeleton = new PlatformAPISkeleton();
        mButtonSend = findViewById(R.id.buttonSend);
        mEditText = findViewById(R.id.textare);
        mButtonSend.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                try {
                    String data = mEditText.getText().toString();
                    if (!data.isEmpty()) {
                        String type = "action";
                        if (!api_skeleton.sendMessage(type, data)) {
                            Toast.makeText(getApplicationContext(), "Failed to send a message type " + type + " to Anbox",
                                    Toast.LENGTH_SHORT).show();
                        } else {
                            Toast.makeText(getApplicationContext(), "Message has been sent out sucessfully",
                                    Toast.LENGTH_SHORT).show();
                        }
                    }
                } catch (SecurityException ex) {
                    Toast.makeText(getApplicationContext(), "Failed to send message to Anbox due to permission denied",
                            Toast.LENGTH_SHORT).show();
                }
            }
        });
    }
}

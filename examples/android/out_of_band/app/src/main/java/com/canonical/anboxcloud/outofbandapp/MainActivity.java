// Anbox Cloud
// Copyright 2021 Canonical Ltd.  All rights reserved.

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
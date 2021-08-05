// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

package com.canonical.anbox.streaming_sdk.native_example;

import android.os.Parcel;
import android.os.Parcelable;

public class StunServer implements Parcelable {
    public String[] urls = {};
    public String username = "";
    public String password = "";

    StunServer() {
    }

    protected StunServer(Parcel in) {
        urls = in.createStringArray();
        username = in.readString();
        password = in.readString();
    }

    @Override
    public void writeToParcel(Parcel dest, int flags) {
        dest.writeStringArray(urls);
        dest.writeString(username);
        dest.writeString(password);
    }

    @Override
    public int describeContents() {
        return 0;
    }

    public static final Creator<StunServer> CREATOR = new Creator<StunServer>() {
        @Override
        public StunServer createFromParcel(Parcel in) {
            return new StunServer(in);
        }

        @Override
        public StunServer[] newArray(int size) {
            return new StunServer[size];
        }
    };
}

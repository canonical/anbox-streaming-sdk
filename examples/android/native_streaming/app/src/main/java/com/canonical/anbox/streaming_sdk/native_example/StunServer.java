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

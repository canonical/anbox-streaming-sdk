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

package com.canonical.anboxcloud.outofbandappv2;


import android.util.Log;

import android.os.AsyncTask;
import android.os.ParcelFileDescriptor;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;


/**
 *  DataReadTask is a background task which processes the data reading from the data channel.
 * */

public class DataReadTask extends AsyncTask<Void, Void, Void> {
    private static final String TAG = "DataReadTask";

    private final ParcelFileDescriptor mFd;
    private final DataReadListener mListener;

    public interface DataReadListener {
        void onDataRead(byte[] readBytes);
    }

    public DataReadTask(ParcelFileDescriptor fd, DataReadListener listener) {
        mFd = fd;
        mListener = listener;
    }

    @Override
    protected Void doInBackground(Void... parameters) {
        try (InputStream in = new ParcelFileDescriptor.AutoCloseInputStream(mFd)) {
            byte[] data = new byte[1024];
            while (!isCancelled()) {
                int read_size = in.read(data);
                if (read_size < 0) {
                    Log.e(TAG, "Failed to read data");
                    break;
                } else if (read_size == 0) {
                    // EOF reached
                    break;
                }

                byte [] readBytes = Arrays.copyOfRange(data, 0, read_size);
                mListener.onDataRead(readBytes);
            }
        } catch (IOException ex) {
          // Do not log errors out if the IO interruption occurred
          // just because we terminate the stream.
          if (!isCancelled())
              Log.e(TAG, "Failed to read data: " + ex);
        }

        return null;
    }

    @Override
    protected void onCancelled() {
      onPostExecute(null);
  }

    public void terminate() {
        cancel(true);
        // Interrupt the InputStream.read and causes thread
        // exit properly without hanging at the block operation.
        closeQuietly();
    }

    @Override
    protected void onPostExecute(Void v) {
        super.onPostExecute(v);
        closeQuietly();
    }

    private void closeQuietly() {
        if (mFd != null) {
            try {
              mFd.close();
            } catch (Exception ex) {
              Log.e(TAG, "Error closing " + mFd, ex);
            }
        }
    }
}

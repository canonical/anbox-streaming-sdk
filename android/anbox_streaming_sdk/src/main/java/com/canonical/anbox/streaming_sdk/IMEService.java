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

package com.canonical.anbox.streaming_sdk;

import android.app.Activity;
import android.content.Context;
import android.graphics.Point;
import android.graphics.Rect;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Display;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.Window;
import android.view.inputmethod.InputMethodManager;


public class IMEService implements Runnable, ViewTreeObserver.OnGlobalLayoutListener {

    private static final String TAG = IMEService.class.getSimpleName();

    private static final int INTERVAL_MS = 100;

    private Window mWindow;
    private View mContentView;

    private Context mContext;
    private View mTargetView;
    private Handler mHandler;

    private boolean mIsKeyboardVisible = false;
    public interface KeyboardStateListener {
        void onKeyboardStateChanged(boolean isShow, double displayRatio);
    }
    private KeyboardStateListener mKeyboardStateListener;

    public IMEService(Context context, View targetView) {
        mContext = context;
        mTargetView = targetView;
        mHandler = new Handler(Looper.getMainLooper());
        mKeyboardStateListener = (KeyboardStateListener) mTargetView;

        mContentView = ((Activity) context).findViewById(android.R.id.content);
        mWindow = ((Activity) context).getWindow();
        if (mContentView != null && mWindow != null) {
            mContentView.getViewTreeObserver().addOnGlobalLayoutListener(this);
        }
    }

    @Override
    public void run() {
        if (mContext == null || mTargetView == null) {
            return;
        }

        // NOTE: if for some reasons the virtual keyboard doesn't popup from the very first time,
        // we will request the focus again by retrying via post method.
        // This ensure virtual keyboard popup everything on request
        InputMethodManager imm = (InputMethodManager) mContext.getSystemService(Context.INPUT_METHOD_SERVICE);
        if (!mTargetView.isFocusable() || !mTargetView.isFocusableInTouchMode()) {
            Log.d(TAG,"focusable = " + mTargetView.isFocusable() + ", focusableInTouchMode = " + mTargetView.isFocusableInTouchMode());
            return;
        } else if (!mTargetView.requestFocus()) {
            Log.d(TAG,"Cannot focus on view");
            post();
        } else if (!imm.showSoftInput(mTargetView, InputMethodManager.SHOW_FORCED)) {
            // NOTE: use InputMethodManager.SHOW_FORCED here rather than InputMethodManager.SHOW_IMPLICIT
            // to force display IME when screen orientation is in landscape node.
            Log.d(TAG,"Unable to show virtual keyboard");
            post();
        }
    }

    public void show() {
        mHandler.post(this);
    }

    public void hide() {
        if (mContext == null || mTargetView == null) {
            return;
        }

        InputMethodManager imm = (InputMethodManager) mContext.getSystemService(Context.INPUT_METHOD_SERVICE);
        imm.hideSoftInputFromWindow(mTargetView.getWindowToken(), 0);
    }

    protected void post() {
        mHandler.postDelayed(this, INTERVAL_MS);
    }

    @Override
    public void onGlobalLayout() {
        if (mWindow == null || mContentView == null  || mContentView.getHeight() == 0) {
            return;
        }

        Point p = new Point();
        Display defaultDisplay = mWindow.getWindowManager().getDefaultDisplay();
        defaultDisplay.getRealSize(p);
        int screenHeight = p.y;

        Rect rect = new Rect();
        mWindow.getDecorView().getWindowVisibleDisplayFrame(rect);
        int windowBottom = rect.bottom;
        int keyboardHeight = screenHeight - windowBottom;

        // Do not use the fixed height here to avoid error when
        // changing screen orientation
        boolean isVisible = keyboardHeight > screenHeight / 4.0;
        if (mIsKeyboardVisible != isVisible) {
            mIsKeyboardVisible = isVisible;

            if (mKeyboardStateListener != null) {
                double displayRatio = keyboardHeight / (double)screenHeight;
                mKeyboardStateListener.onKeyboardStateChanged(mIsKeyboardVisible, displayRatio);
            }
        }
    }
}

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

import android.text.Editable;
import android.text.SpannableStringBuilder;

import android.util.Log;
import android.view.KeyEvent;
import android.view.View;
import android.view.inputmethod.BaseInputConnection;

public class InputConnection extends BaseInputConnection {

    private static final String TAG = InputConnection.class.getSimpleName();
    private static boolean DEBUG = false;

    public interface TextChangedListener {
        void onTextCommitted(String text);
        void onTextComposing(String text);
        void onTextDeleted(int counts);
        void onComposingRegionChanged(int start, int end);
    }
    private TextChangedListener mListener;

    private SpannableStringBuilder mEditText = new SpannableStringBuilder();
    private boolean mComposingRegionSelected = false;

    private boolean mAdjustComposingRegion = true;

    InputConnection(View targetView, boolean fullEditor, boolean adjustComposingRegion) {
        super(targetView, fullEditor);
        mListener = (TextChangedListener) targetView;
        mAdjustComposingRegion = adjustComposingRegion;
    }

    @Override
    public Editable getEditable() {
        return mEditText;
    }

    @Override
    public boolean sendKeyEvent(KeyEvent event) {
        // Handle the KEYCODE_DEL event to do the text deletion specifically for CJK based IME.
        // For CJK text deletion, BaseInputConnection::setComposingText won't be triggered in most,
        // cases as there is no composing state for those languages. but KEYCODE_DEL will be sent
        // from BaseInputMethod instead.
        int textLength = mEditText.length();
        if (event.getAction() == KeyEvent.ACTION_DOWN &&
                event.getKeyCode() == KeyEvent.KEYCODE_DEL) {
            if (textLength  > 0) {
                mEditText.delete(textLength - 1, textLength);
            }

            mListener.onTextDeleted(1);
            return true;
        }
        return super.sendKeyEvent(event);
    }

    @Override
    public boolean commitText(CharSequence text, int newCursorPosition) {
        boolean ret = super.commitText(text, newCursorPosition);
        mListener.onTextCommitted(text.toString());
        if (DEBUG) Log.v(TAG, "commitText: " + text + " editText: " + mEditText.toString());
        return ret;
    }

    @Override
    public boolean setComposingText(CharSequence text, int newCursorPosition) {
        if (mAdjustComposingRegion && !mComposingRegionSelected) {
            setComposingRegion(0, mEditText.length());
        }

        boolean ret = super.setComposingText(text, newCursorPosition);
        mListener.onTextComposing(text.toString());
        if (DEBUG) Log.v(TAG, "setComposingRegion: composingText " + text + " editText: "  + mEditText.toString());
        return ret;
    }

    @Override
    public boolean deleteSurroundingText(int beforeLength, int afterLength) {
        // This is typically happens when a space is deleted following by a composing
        // text deletion and cursor is moved to the last editable text for further editing,
        // which will explicitly triggers setComposingRegion. At this point, the committed
        // text is changed, hence we need to invoke the callback as well.
        mComposingRegionSelected = false;

        // In the following scenarios, when
        //   1. deleting the last text span,
        //   2. Random texts contains a space.
        // BaseInputConnection::setComposingRegion function won't be triggered for some reasons,
        // hence we have to manually call setComposingRegion to keep cursor and edit text aligned
        // on both ends.  See setComposingText above.
        boolean ret = super.deleteSurroundingText(beforeLength, afterLength);
        mListener.onTextDeleted(beforeLength);

        if (DEBUG) Log.v(TAG, "deleteSurroundingText editText: " + mEditText.toString());
        return ret;
    }

    @Override
    public boolean setComposingRegion(int start, int end) {
        mComposingRegionSelected = true;
        int startPos = start;
        int endPos = end;
        if (mAdjustComposingRegion) {
            // Do not use start and end index directly as it doesn't count for space
            // that was automatically added by some IMEs. Therefore, to keep the position
            // for the current composing text aligned with
            // BaseInputConnection::setComposingRegion, we will adjust it manually.
            String composingText = getTextBeforeCursor(end - start, GET_TEXT_WITH_STYLES).toString();
            startPos = mEditText.toString().lastIndexOf(composingText);
            endPos = end - start + startPos;
        }
        boolean ret = super.setComposingRegion(startPos, endPos);
        mListener.onComposingRegionChanged(startPos, endPos);

        if (DEBUG) {
            String composingText = getTextBeforeCursor(end - start, GET_TEXT_WITH_STYLES).toString();
            Log.v(TAG, "setComposingRegion: composingText " + composingText + " editText: " + mEditText.toString());
        }
        return ret;
    }

    @Override
    public boolean finishComposingText() {
        boolean ret = super.finishComposingText();
        mComposingRegionSelected = false;
        mListener.onComposingRegionChanged(0, 0);
        if (DEBUG) Log.v(TAG, "finishComposingText:" + " editText: " + mEditText.toString());
        return ret;
    }
}

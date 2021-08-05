# Anbox Streaming SDK

Anbox Streaming SDK is a Android library([AAR](https://developer.android.com/studio/projects/android-library)) which provides a set of convenient Android native components that can be integrated into a Android application project built with [WebView](https://developer.android.com/reference/android/webkit/WebView) + Anbox Streaming JS SDK for better client user experience, such as text input from the built-in virtual keyboard on client side to the remote application running in Android container.

## Import the AAR library

Check out the [Anbox Streaming SDK](https://github.com/anbox-cloud/anbox-streaming-sdk) from Github

```
$ git clone https://github.com/anbox-cloud/anbox-streaming-sdk.git
```

Under the `android/libs` folder, you can find the AAR file `anbox_streaming_sdk.aar`, please refer to the official [documentation](https://developer.android.com/studio/projects/android-library)  on how to import an Android library into an Android application project.

## Integrate components

The Android library(`anbox_streaming_sdk.aar`) provides an AnboxWebView component that extends the AOSP [WebView](https://developer.android.com/reference/android/webkit/WebView) and provides better handling of the text input for an application that loads the Anbox Stream JS SDK with an embedded webview for video streaming. The feature enables developers to capture the text input from the built-in virtual keyboard on the client side and send them to the application running in the Android container.

To use the AnboxWebView in your project after importing the AAR file.
1. Adjust the layout of the activity xml file that you want to use the enhanced webview component, E.g:

```
    <com.canonical.anbox.streaming_sdk.AnboxWebView
        android:id="@+id/webview"
        android:layout_width="match_parent"
        android:layout_height="match_parent" />
```


2. Set virtual keyboard listener to the activity that wants to capture the text input from the virtual keyboard and monitor its state(visibility) change during streaming.

```
import com.canonical.anbox.streaming_sdk.AnboxWebView;
...
...
...
    webview = (AnboxWebView) findViewById(R.id.webview);
    webview.setVirtualKeyboardListener(this);
```

When a request of opening virtual keyboard was sent from Android container  via Anbox Streaming JS SDK through Anbox Stream specific protocol, people must call the AnboxWebView.openVirtualKeyboard() function to pop up virtual keyboard on the client side.
To receive the message sending from Javascript through the protocol, it can be done via adding [javascript interface](https://developer.android.com/guide/webapps/webview#BindingJavaScript).


Override the interface method `onVirtualKeyboardTextChanged` so when captured texts are changed,
the following callback function will be invoked, a developer must send them to Android container via Anbox Streaming JS SDK through Anbox Stream specific protocol.  This could be done via [executing javascript](https://developer.android.com/reference/android/webkit/WebView#evaluateJavascript) functions in WebView.

```
    @Override
    public void onVirtualKeyboardTextChanged(String text) {
        Log.i(TAG, "virtual keyboard text changed: " + text);
    }
```

So that the EditText or TextInput widget placed in an application running in the Android container can receive and display them in the UI via Anbox correspondingly.

Override the interface method `onVirtualKeyboardStateChanged` to invoke the callback function
when the state of virtual keyboard is changed.

```
    @Override
    public void onVirtualKeyboardStateChanged(boolean visible) {
        Log.i(TAG, "virtual keyboard visibility state changed: " + visible);
    }
```

NOTE: there are two application scenarios that the above function got triggered
when virtual keyboard is hidden(visible -> false).
- Call AnboxWebView.hideVirtualKeyboard() when receiving the request of hiding virtual keyboard sendingfrom Android container via Anbox Streaming JS SDK.
- Hide the virtual keyboard on the client side by clicking the pop-down button.

For case(2), when this callback function will be triggered, people must notify the Android container to hide the virtual keyboard via Anbox Streaming SDK through the protocol, otherwise the virtual keyboard may misbehave on both ends.

# Anbox Cloud - Out of Band Data

This document will walk you through how to send a message from an Android application
running in the container to the client application developed with the Anbox Streaming
SDK.

## Android Application

### Add Required Permissions

For the Android application running in the container, you need to add the
following required permission to the `AndroidManifest.xml` to allow the
application to send messages to the Anbox runtime:

```
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="<your_application>">

    …
    <uses-permission android:name="android.permission.ANBOX_SEND_MESSAGE" />
    …
</manifest>
```

Any attempt of an application which lacks the `android.permission.ANBOX_SEND_MESSAGE`
permission to invoke APIs that are provided by the Anbox Platform Library will
be disallowed and a security exception will be raised.

### Import Java Libarry

Check out the [Anbox Streaming SDK](https://github.com/anbox-cloud/anbox-streaming-sdk) from Github

```
$ git clone https://github.com/anbox-cloud/anbox-streaming-sdk.git
```

To import the `com.canonical.anbox.platform_api_skeleton.jar` library into your
Android project, please refer to the official [documentation](https://developer.android.com/studio/build/dependencies)
on how to import an external library into an Android application project.

Alternatively you can follow the steps below:

Copy the `com.canonical.anbox.platform_api_skeleton.jar` to project_root/app/libs
directory (If the folder doesn’t exist, just create it).

Edit the `build.gradle` under the app folder by adding the following line
under the dependencies scope.

```
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    …
    …
    implementation files('libs/com.canonical.anbox.platform_api_skeleton.jar')
}
```

### Send Message from Android

The following example demonstrates how to send a message with the Anbox
Platform API to a remote client:

```
import com.canonical.anbox.PlatformAPISkeleton;

public class FakeCameraActivity extends AppCompatActivity {
     ….
     ….
     public void onResume() {
        super.onResume();

        String type = “message-type”;
        String data = ”message-data”;
        PlatformAPISkeleton api_skeleton = new PlatformAPISkeleton();
        if (!api_skeleton.sendMessage(type, data)) {
            Log.e(TAG, "Failed to send a message type " + type + " to Anbox session");
        }
    }
}
```

**NOTE**: The length for message type is limited to 256KB and the length of data is limited to 1MB.

### Receive Message on the Client

A client application that receives a message from the Android application can be written
in JavaScript, C or C++ by using the Anbox Streaming SDK.

### Web Application

For a web based application you can use the JavaScript SDK which you can find at
https://anbox-cloud.io/docs/sdks. To receive the data sent from the Android application
running in the Anbox container you need to implement the `messageReceived` callback
of the AnboxStream object:

```
    let stream = new AnboxStream({
      ...
      ...
      callbacks: {
        ….
        messageReceived: (type, data) => {
          console.log("type: ", type, "  data: ", data);
        }
      }
    });
```


### Native Application

For a native application you can use the native SDK from https://anbox-cloud.io/docs/sdks.
To receive the data sent from the Android application running in the Anbox
container you need to register a callback via the `anbox_stream_set_message_received_callback` method:

```
    ...
    anbox_stream_set_message_received_callback(ctx.stream, [](
        const char* type, size_t type_size,
        const char* data, size_t data_size, void *user_data){
      std::cout << "Received message from container type: '"<< std::string(type, type_size) << "'" << std::endl;
    }, nullptr));
    ...
```

With those, whenever a message is sent from an Android application, the
native application will receive the message and print it to its standard output.

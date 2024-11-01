# Anbox Cloud - Out of Band Data v2

An Android application that demonstrates how to use [out of band data v2](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/exchange-oob-data/#oob-v2)
to exchange data between an Android application and a WebRTC client.

**Note:** to install the app as a system app in the Android container,
1. one must declare the `allow_custom_system_signatures` feature in the AMS app manifest file on the application creation.
2. the app must be installed with the aam command:
   ```
   aam install-system-app --apk=com.canonical.anboxcloud.outofbandappv2.apk -package-name=com.canonical.anboxcloud.outofbandappv2 --access-hidden-api
   ```

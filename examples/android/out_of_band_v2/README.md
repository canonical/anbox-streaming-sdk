# Anbox Cloud - Out of Band Data v2

An Android application that demonstrates how to use [out of band data v2](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/exchange-oob-data/#version-2) feature to exchange data between an Android application running within an Android container and a WebRTC client.

**NOTE**: After building the application, the resulting APK must be installed and running as a system app in the Android container to communicate with [org.anbox.webrtc.IDataProxyService](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/exchange-oob-data/#anbox-webrtc-data-proxy) system service for data exchange. See the guide on [how to install an APK as a system app](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/port/install-apk-system-app) for more information.

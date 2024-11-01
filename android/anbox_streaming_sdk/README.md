# Anbox Streaming SDK

The Anbox Streaming SDK enables developers to build a hybrid mobile application 
that can integrate the features that Anbox Cloud provides. It comes with an 
Android library that offers easy-to-use native components like AnboxWebView, 
which extends the AOSP WebView. It provides better handling of text input for
the hybrid application that loads the Anbox Streaming JavaScript SDK with an
embedded WebView for video streaming.

## Build the AAR library

1. Import the project into Android studio
2. Go to menu bar and click  `Build` -> `Make Module 'anbox_streaming_sdk'`

After the compilation is done, you'll get a piece of an aar file for all build
flavors in the build/outputs/aar/ directory of the project.

## Integrate the AAR library into your project

See the [development documentation](https://documentation.ubuntu.com/anbox-cloud/en/latest/howto/stream/integrate-virtual-keyboard/)
for how to integrate the AAR library into your project.

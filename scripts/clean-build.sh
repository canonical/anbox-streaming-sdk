#!/bin/sh -ex
#
# Copyright 2020 Canonical Ltd.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

VERSION=unknown

for p in "$@"
do
  case $p in
    --version=*)
        VERSION=${p#*=}
        ;;
  esac
done

sudo apt-get update -qq
sudo apt-get clean
cd /work/src/examples

# For Anbox Streaming SDK library(AAR)
(
    cd android/anbox_streaming_sdk
    cat  << EOF >> local.properties
sdk.dir="$ANDROID_HOME"
EOF
    ./gradlew assembleDebug
    find ./ -name *.aar -exec mv {} /work/com.canonical.anbox.streaming_sdk.aar \;
)

# For enhanced webview streaming example
(
    # Use the aar file just built out from the above step
    mkdir -p android/enhanced_webview_streaming/app/libs
    cp /work/com.canonical.anbox.streaming_sdk.aar  android/enhanced_webview_streaming/app/libs/

    cd android/enhanced_webview_streaming
    cat  << EOF >> local.properties
sdk.dir="$ANDROID_HOME"
EOF
    ./gradlew assembleDebug
    find ./ -name *.apk -exec mv {} /work/com.canonical.anbox.streaming_sdk.enhanced_webview_example_"$VERSION".apk \;
)

# For android out of band v2 example
(
    cd android/out_of_band_v2
    cat  << EOF >> local.properties
sdk.dir="$ANDROID_HOME"
anbox-stream-sdk.dir=/work/src/sdk
EOF
    ./gradlew assembleDebug
    find ./ -name *.apk -exec mv {} /work/com.canonical.anboxcloud.outofbandappv2_"$VERSION".apk \;
)

#!/bin/sh -xe
#
# Copyright 2019 Canonical Ltd.
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

PROXY=
VERSION=$(scripts/gen-version.sh)

for p in "$@"
do
  case $p in
    --proxy=*)
        PROXY=${p#*=}
        ;;
    --version=*)
        VERSION=${p#*=}
        ;;
    *)
      echo "unrecognized option $p"
  esac
done

builddir=$(mktemp -d -p $PWD .buildXXXXXX)
topdir="$PWD"
trap "rm -rf ${builddir}" INT EXIT

sdkname=anbox-streaming-sdk_${VERSION}
sdkdir="$builddir"/"$sdkname"

for f in examples js android; do
  mkdir -p "$sdkdir"/"$f"
done

sed -i "s/@VERSION@/${VERSION}/" js/anbox-stream-sdk.js

# Only copy the JS SDK and markdown file to the js folder
cp js/anbox-stream-docs.md  js/anbox-stream-sdk.js "$sdkdir"/js/
for f in android js ; do
  cp -r examples/"$f" "$sdkdir"/examples
done

# Copy the streaming sdk to the android folder
cp -av android/anbox_streaming_sdk "$sdkdir"/android/

# Copy JS file to the each example folder of the sdk folder to avoid
# a bunch of copy of js sdk in the source tree.
for d in `find $sdkdir/examples -name js -type d`; do
  cp js/anbox-stream-sdk.js $d
done

for d in `find $sdkdir/examples -name assets -type d`; do
    mkdir -p $d/js && cp js/anbox-stream-sdk.js $d/js
done

(cd "$builddir" ; zip -r "$topdir"/"$sdkname".zip *)

# Do a test build of our examples with the generated SDK package
(
   # Copy the anbox-stream-sdk.js file to examples folders
   for d in `find $topdir/examples -name assets -type d`; do
     mkdir -p $d/js && cp js/anbox-stream-sdk.js $d/js
   done

   # Create a symbol link for anbox_streaming_sdk to example/android folder so that we
   # can create the sdk library alongside with Android example when building the APKs.
   cp -av "$topdir"/android/anbox_streaming_sdk "$topdir"/examples/android/anbox_streaming_sdk; \
    cd examples; \
    scripts/build-with-docker.sh --proxy="${PROXY}" \
    --version="${VERSION}" \
    --anbox-stream-sdk="$topdir"/"$sdkname".zip; \
    # To repack zip taball which includes APKs file later
    mkdir -p "$sdkname"/examples/android/apks; \
    cp results/*.apk "$sdkname"/examples/android/apks; mv results/*.apk "$topdir"; \
    # To repack zip taball which includes JAR/AAR files built during the docker runtime
    mkdir -p "$sdkname"/android/libs && cp results/*.aar "$sdkname"/android/libs; \
    mkdir -p "$sdkname"/examples/android/enhanced_webview_streaming/app/libs && cp results/*.aar \
      "$sdkname"/examples/android/enhanced_webview_streaming/app/libs/; \
    zip -r "$topdir"/"$sdkname".zip "$sdkname"/examples/android/apks/*.apk "$sdkname"/android/libs/*.aar \
      "$sdkname"/examples/android/enhanced_webview_streaming/app/libs/*.aar

    # Validate the streaming sdk to ensure we don't accidentally leak unwanted files.
    "$topdir"/scripts/validate.sh  --sdk-zip-tarball="$topdir"/"$sdkname".zip \
      --allowlist="$topdir"/scripts/streaming-sdk-files.allowlist
)

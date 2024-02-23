#!/bin/bash -xe
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
CREATE_TARBALL=false
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
    --create-tarball)
        CREATE_TARBALL=true
        ;;
    *)
      echo "unrecognized option $p"
  esac
done

mkdir_cp() {
  local dest="${!#}"
  mkdir -p "$dest" && cp -av "${@:1:${#}-1}" "$dest"
}

builddir=$(mktemp -d -p $PWD .buildXXXXXX)
topdir="$PWD"
trap "rm -rf ${builddir}" INT EXIT

sdkname=anbox-streaming-sdk_${VERSION}
sdkdir="$builddir"/"$sdkname"

mkdir_cp LICENSE "$sdkdir"

for f in examples js android; do
  mkdir -p "$sdkdir"/"$f"
done

# Modify the JS SDK version
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
  mkdir_cp js/anbox-stream-sdk.js "$d"/js
done

if [ "$CREATE_TARBALL" = true ]; then
  (cd "$builddir" ; zip -r "$topdir"/"$sdkname".zip *)
fi

# Do a test build of our examples with the generated SDK package
(
   # Copy the anbox-stream-sdk.js file to examples folders
   for d in `find $topdir/examples -name assets -type d`; do
     mkdir_cp js/anbox-stream-sdk.js "$d"/js
   done

   # Create a symbol link for anbox_streaming_sdk to example/android folder so that we
   # can create the sdk library alongside with Android example when building the APKs.
   cp -av "$topdir"/android/anbox_streaming_sdk "$topdir"/examples/android/anbox_streaming_sdk;
   "$topdir"/scripts/build-with-docker.sh --proxy="${PROXY}" \
     --version="${VERSION}" \
     --anbox-stream-sdk="$builddir"

    # To repack zip taball which includes APKs file later
    mkdir_cp assets/*.apk "$sdkname"/examples/android/apks;
    # To repack zip taball which includes JAR/AAR files built during the docker runtime
    mkdir_cp assets/*.aar "$sdkname"/android/libs
    mkdir_cp assets/*.aar "$sdkname"/examples/android/enhanced_webview_streaming/app/libs

    if [ "$CREATE_TARBALL" = true ]; then
      zip -r "$topdir"/"$sdkname".zip "$sdkname"/examples/android/apks/*.apk "$sdkname"/android/libs/*.aar \
        "$sdkname"/examples/android/enhanced_webview_streaming/app/libs/*.aar

      # Validate the streaming sdk to ensure we don't accidentally leak unwanted files.
      "$topdir"/scripts/validate.sh --sdk-zip-tarball="$topdir"/"$sdkname".zip \
        --allowlist="$topdir"/scripts/streaming-sdk-files.allowlist
    else
      mkdir_cp "$sdkname"/examples/android/apks/*.apk "$sdkdir"/examples/android/apks/
      mkdir_cp "$sdkname"/android/libs/*.aar "$sdkdir"/android/libs/
      mkdir_cp "$sdkname"/examples/android/enhanced_webview_streaming/app/libs/*.aar \
         "$sdkdir"/examples/android/enhanced_webview_streaming/app/libs/

      "$topdir"/scripts/validate.sh --sdk-path="$sdkdir" \
        --allowlist="$topdir"/scripts/streaming-sdk-files.allowlist

      mv "$sdkdir" "$topdir"/results
    fi
)

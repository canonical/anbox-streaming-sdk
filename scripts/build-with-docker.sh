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

DOCKER_IMAGE_NAME=anbox-stream-sdk
DOCKER_IMAGE_TAG=latest
UBUNTU_VERSION=24.04
BASE_DOCKER_IMAGE="ubuntu:$UBUNTU_VERSION"
ANDROID_NDK_VERSION=21.0.6113669
ANDROID_HOME=/usr/local/android-sdk
ANDROID_PLATFORM_VERSION=30
ANDROID_BUILD_TOOLS_VERSION=30.0.0
SDK_URL="https://dl.google.com/android/repository/commandlinetools-linux-6858069_latest.zip"
CMAKE_VERSION=3.10.2.4988404

sdk=
proxy=
version=

while [ -n "$1" ]; do
    case "$1" in
        --anbox-stream-sdk=*)
            sdk=${1#*=}
            shift
            ;;
        --proxy=*)
            proxy=${1#*=}
            shift
            ;;
        --version=*)
            version=${1#*=}
            shift
            ;;
        *)
            echo "ERROR: Unknown argument $1"
            exit 1
            ;;
    esac
done

if [ ! -e "$sdk" ]; then
    echo "ERROR: Missing Anbox Streaming SDK"
    exit 1
fi

# Build the docker container. If the container is already up to date this
# will be a no-op
workdir=$(pwd)
cd $(mktemp -d)
cat << EOF > Dockerfile
FROM $BASE_DOCKER_IMAGE

ENV DEBIAN_FRONTEND=noninteractive \
    ANDROID_HOME=/usr/local/android-sdk

RUN apt update -qq && apt install -qq -y \
		sudo \
		wget \
		unzip \
		zip \
		curl

# The jenkins user must be setup so that the work directory which is owned
# by jenkins is accessible
RUN useradd -u $(id -u) -U jenkins
RUN echo "jenkins ALL = NOPASSWD: ALL" >> /etc/sudoers
RUN mkdir /work && chown jenkins:jenkins /work
RUN mkdir /home/jenkins && chown -R jenkins:jenkins /home/jenkins

RUN apt install -qq -y \
		openjdk-17-jdk-headless \
		gradle

# Download Android SDK
RUN mkdir ${ANDROID_HOME} \
    && chmod a+w ${ANDROID_HOME} \
    && cd ${ANDROID_HOME} \
    && curl -o sdk.zip $SDK_URL \
    && unzip sdk.zip \
    && rm sdk.zip \
    && mkdir -p "${ANDROID_HOME}/licenses" \
    && echo "24333f8a63b6825ea9c5514f83c2829b004d1fee" > "${ANDROID_HOME}/licenses/android-sdk-license"

# Install Android Build Tool, NDK and cmake
RUN ${ANDROID_HOME}/cmdline-tools/bin/sdkmanager --sdk_root="${ANDROID_HOME}" --update
RUN ${ANDROID_HOME}/cmdline-tools/bin/sdkmanager --sdk_root="${ANDROID_HOME}" \
    "build-tools;${ANDROID_BUILD_TOOLS_VERSION}" \
    "platforms;android-${ANDROID_PLATFORM_VERSION}" \
    "ndk;${ANDROID_NDK_VERSION}" \
    "cmake;${CMAKE_VERSION}" \
    "platform-tools"
EOF

if [ -n "$proxy" ]; then
  proxy_host=$(echo "$proxy" | awk -F '[/:]' '{print $4}')
  proxy_port=$(echo "$proxy" | awk -F '[/:]' '{print $5}')

  cat << EOF > gradle.properties
systemProp.http.proxyHost=$proxy_host
systemProp.http.proxyPort=$proxy_port
systemProp.https.proxyHost=$proxy_host
systemProp.https.proxyPort=$proxy_port
EOF

  cat << EOF >> Dockerfile
RUN mkdir /home/jenkins/.gradle && chown -R jenkins:jenkins /home/jenkins/.gradle
COPY gradle.properties /home/jenkins/.gradle
EOF
fi

docker build -t "$DOCKER_IMAGE_NAME":"$DOCKER_IMAGE_TAG" .
cd "$workdir" && mkdir -p assets
builddir=$(mktemp -p "$PWD" -d .build.XXXXXX)
cleanup() {
	rm -rf "$builddir"
}
trap cleanup INT EXIT TERM

cp -ra "$sdk" examples scripts "$builddir"
docker run --rm \
  --network host \
  -v "$PWD"/assets:/work \
  -v $builddir:/work/src \
  -u $(id -u $USER) \
  "$DOCKER_IMAGE_NAME":"$DOCKER_IMAGE_TAG" \
  /work/src/scripts/clean-build.sh --version="${version}" $@

#!/bin/sh -ex
#
# Copyright 2021 Canonical Ltd.
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

ANBOX_STREAMING_SDK_DIR=$PWD/../../
ESLINT_ARGS=
while [ -n "$1" ]; do
    case "$1" in
        --anbox-streaming-sdk-dir=*)
            ANBOX_STREAMING_SDK_DIR=${1#*=}
            shift
            ;;
        --fix)
            ESLINT_ARGS="$ESLINT_ARGS --fix"
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [ -z "$ANBOX_STREAMING_SDK_DIR" ]; then
    echo "--anbox-streaming-sdk-dir is missing"
    exit 1
fi

# Copy the JS SDK to the root dir of jtest so that
# unit tests can be executed properly.
cp $ANBOX_STREAMING_SDK_DIR/*.js ./
trap 'rm -f anbox-stream-sdk.js' EXIT INT TERM

extra_args=
if ! docker -v | grep -q podman ; then
    # If we're running with podman passing in user mappings is not
    # going to work
    extra_args="-u $(id -u ${USER}):$(id -g ${USER})"
fi

# 1. Run ESLint for the sanity checks and static analysis'
# 2. Run unit test
docker run --rm \
  -v $PWD:/anbox-streaming-sdk-unit-test \
  -e HOME=/anbox-streaming-sdk-unit-test \
  $extra_args \
  node:17 \
  bash -c "cd /anbox-streaming-sdk-unit-test && \
              npm install --include=dev && \
              ./node_modules/.bin/eslint $ESLINT_ARGS anbox-stream-sdk.js && \
              npm test"

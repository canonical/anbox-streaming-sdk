#!/bin/bash -ex
#
# This file is part of Anbox Cloud Streaming SDK
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

if [ -e .last_docker_id ]; then
    id=$(cat .last_docker_id)
    docker stop $id || true
    rm .last_docker_id
fi

echo "INFO: Building container image ..."
docker build . -t anbox-stream-sdk-example:latest
id=$(docker run -d --rm -p 8000:8000 anbox-stream-sdk-example:latest)
echo "$id" > .last_docker_id

echo "INFO: Container up and running, open http://localhost:8000/demos in your browser ..."

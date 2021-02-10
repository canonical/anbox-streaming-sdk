#!/bin/bash -ex
#
# Anbox Stream SDK
# Copyright 2020 Canonical Ltd.  All rights reserved.
#

if [ -e .last_docker_id ]; then
    id=$(cat .last_docker_id)
    docker stop $id || true
    rm .last_docker_id
fi

echo "INFO: Building container image ..."
docker build . -t anbox-stream-sdk-example:latest
id=$(docker run -d --rm -p 8000:8000 anbox-stream-sdk-example:latest)
echo "$id" > .last_docker_id

echo "INFO: Container up and running, open http://localhost:8000/example.html in your browser ..."

# Anbox Stream SDK Example

This directory contains the bare minimum to start a stream on the Anbox Streaming Stack.

## Prerequisites
For this example you'll need the following:

- An Anbox Streaming Stack deployment
- A Stream Gateway API token
- At least one registered application on AMS

## Running the example
You'll need a webserver serving the content for the example. A simple server can be created
with the following command in the example directory:

    python3 -m http.server 8080

And open your web browser to `127.0.0.1:8080`.



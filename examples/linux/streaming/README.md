# Anbox Stream SDK - Native Example (linux)

This example demonstrates the implementation of a native Linux application
using the Anbox Stream SDK with OpenGL ES and SDL2.

## Install necessary dependencies

The example requires a few dependencies to be installed:

    $ sudo apt install -y \
        build-essential \
        cmake \
        cmake-extras \
        libsoup2.4-dev \
        libsdl2-dev \
        libgles2-mesa-dev \

## Build the example

In order to build the example we have to configure the build via cmake
first. The example requires you to specfy the path to the unpacked Anbox
Stream SDK in order to consume the header and library files:

    $ mkdir build
    $ (cd build ; cmake -DANBOX_STREAM_DIR=/path/to/anbox/stream/sdk ..)

When the configuration succeeded you can build the example:

    $ (cd build ; make)

## Running the example

After the example is build you can run it with the following command

    # If your Anbox Stream Gateway does not use a self signed certificate,
    # you can drop the --insecure-tls flag
    $ build/src/sdl2_client \
        --url=https://<address of your Anbox Stream Gateway>:4000 \
        --api-token=<API token for the Anbox Stream Gateway> \
        --application=<name of the application you want to stream> \
        --insecure-tls

Also see the help output of the `sdl2_client` executable for more available
program options.

    $ build/src/sdl2_client --help

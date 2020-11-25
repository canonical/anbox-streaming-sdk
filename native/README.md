# Anbox Stream SDK

The Anbox Stream SDK offers a C API to provide low latency video streaming for
your application based on Anbox Cloud.

## Integrate the Anbox Stream SDK

In order to make use of the Anbox Stream SDK, all you have to do is to link
your application against libanbox-stream.so and include the header file
anbox-stream.h from your C/C++ program.

The only other dependencies necessary for the Anbox Stream SDK depend on the
actual platform the SDK is used on.

For Linux:

 * OpenGL ES 3.x
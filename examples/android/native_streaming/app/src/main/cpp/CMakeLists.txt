cmake_minimum_required(VERSION 3.4.1)

set(ANBOX_STREAM_SDK_DIR CACHE STRING "Path to the Anbox Stream SDK")
if (NOT ANBOX_STREAM_SDK_DIR)
    message(FATAL_ERROR "Missing path to Anbox Stream SDK")
endif()

add_library(anbox-stream STATIC IMPORTED)
set_target_properties(anbox-stream PROPERTIES IMPORTED_LOCATION ${ANBOX_STREAM_SDK_DIR}/native/libs/android/${ANDROID_ABI}/libanbox-stream.so)

find_library(log-lib log)

set(SOURCES
        bindings.cpp
        jni_helpers.cpp
        jni_helpers.h)

add_library(anbox-stream-bindings SHARED ${SOURCES})
target_include_directories(anbox-stream-bindings PRIVATE "${ANBOX_STREAM_SDK_DIR}/native/include")
target_link_libraries(anbox-stream-bindings
        ${log-lib}
        GLESv3
        EGL
        OpenSLES
        android
        anbox-stream)
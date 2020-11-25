# Anbox Stream SDK
# Copyright 2020 Canonical Ltd.  All rights reserved.

project(anbox-stream-sdk-native-example)
cmake_minimum_required(VERSION 3.1.3)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (NOT CMAKE_BUILD_TYPE)
    message(STATUS "No build type selected, default to release")
    set(CMAKE_BUILD_TYPE "release")
endif()

find_package(SDL2 REQUIRED)
find_package(PkgConfig REQUIRED)
pkg_check_modules(GLESv2 REQUIRED glesv2)
pkg_check_modules(LIBSOUP REQUIRED libsoup-2.4)

set(ANBOX_STREAM_SDK_DIR CACHE STRING "Path to the Anbox Stream SDK")
if (NOT ANBOX_STREAM_SDK_DIR)
    message(FATAL_ERROR "Missing path to Anbox Stream SDK")
endif()

add_subdirectory(src)
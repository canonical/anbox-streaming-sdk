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

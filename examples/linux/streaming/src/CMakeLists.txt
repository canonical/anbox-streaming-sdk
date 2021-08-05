

add_library(AnboxStream STATIC IMPORTED)

if(CMAKE_HOST_SYSTEM_PROCESSOR STREQUAL x86_64)
    set(PKG_ARCH amd64)
elseif(CMAKE_HOST_SYSTEM_PROCESSOR STREQUAL aarch64)
    set(PKG_ARCH arm64)
endif()

set_target_properties(AnboxStream PROPERTIES IMPORTED_LOCATION ${ANBOX_STREAM_SDK_DIR}/libs/linux/${PKG_ARCH}/libanbox-stream.so)

include_directories(
    ${CMAKE_SOURCE_DIR}
    ${SDL2_INCLUDE_DIRS}
    ${LIBSOUP_INCLUDE_DIRS}
    ${ANBOX_STREAM_SDK_DIR}/include
    ${CMAKE_SOURCE_DIR}/include/public
    ${CMAKE_SOURCE_DIR}/external/flags)

set(SOURCES
    main.cpp
    http_client.cpp
    http_client.h
    gamepad_manager.cpp
    gamepad_manager.h
    gateway_messages.cpp
    gateway_messages.h
    session.cpp
    session.h)

add_executable(sdl2_client ${SOURCES})
target_link_libraries(sdl2_client
    ${LIBSOUP_LDFLAGS}
    ${LIBSOUP_LIBRARIES}
    ${SDL2_LIBRARIES}
    ${SDL2_LDFLAGS}
    ${GLESv2_LIBRARIES}
    ${GLESv2_LDFLAGS}
    pthread
    AnboxStream)

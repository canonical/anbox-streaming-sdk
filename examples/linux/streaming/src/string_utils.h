// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_STRING_UTILS_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_STRING_UTILS_H_

#include <string>

// Taken from https://stackoverflow.com/questions/2342162/stdstring-formatting-like-sprintf
template<typename ... Args>
inline std::string string_format(const std::string& format, Args ... args) {
  size_t size = snprintf(nullptr, 0, format.c_str(), args ...) + 1; // Extra space for '\0'
  if (size <= 0)
    throw std::runtime_error("Error during formatting.");
  std::unique_ptr<char[]> buf( new char[ size ] );
  snprintf(buf.get(), size, format.c_str(), args ...);
  return std::string(buf.get(), buf.get() + size - 1); // We don't want the '\0' inside
}

#endif
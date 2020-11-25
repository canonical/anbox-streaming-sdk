// Anbox Streaming SDK
// Copyright 2020 Canonical Ltd.  All rights reserved.

#ifndef ANBOX_STREAM_SDK_EXAMPLES_LINUX_JSON_HELPERS_H_
#define ANBOX_STREAM_SDK_EXAMPLES_LINUX_JSON_HELPERS_H_

#include <sstream>
#include <string>

#include "external/json/json.hpp"

template<typename T>
bool parse_message_from_string(const std::string& data, T& t) {
  if (data.empty())
    return false;

  try {
    using namespace nlohmann;
    std::istringstream ss(data);
    json raw;
    ss >> raw;
    raw.get_to(t);
    return true;
  } catch (std::exception& ex) {
    return false;
  }
}

template<typename T>
std::string message_to_string(const T& msg) {
  using namespace nlohmann;
  return json(msg).dump();
}

#endif

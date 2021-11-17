/*
 * This file is part of Anbox Cloud Streaming SDK
 *
 * Copyright 2021 Canonical Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
